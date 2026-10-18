import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/env.validation.js';

// Limits for every run (PRD NFR-04). Piston refuses values above its own
// configured maximums; 3 s is also Piston's default maximum.
const RUN_TIMEOUT_MS = 3_000;
const COMPILE_TIMEOUT_MS = 3_000;
const MEMORY_LIMIT_BYTES = 256 * 1024 * 1024;

// How long we wait for Piston to answer at all. Longer than the run timeout,
// so a slow program shows up as timedOut, not as Piston being down.
const REQUEST_TIMEOUT_MS = 10_000;

// The file name Piston saves the code under, per language.
const FILE_NAMES: Record<string, string> = { python: 'main.py' };

// One program run against one stdin.
export type RunResult = {
  stdout: string;
  stderr: string;
  // null when the process was killed by a signal (e.g. the time limit).
  exitCode: number | null;
  timedOut: boolean;
};

// The parts of Piston's POST /api/v2/execute response we read. `status` is
// only sent by newer Piston versions ("TO" = time limit, "OL"/"EL" = too
// much stdout/stderr).
type PistonStage = {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: string | null;
  status?: string | null;
};
type PistonResponse = { run: PistonStage; compile?: PistonStage };

// The only file in the API that talks to Piston (AGENTS.md rule 5).
//
// Runs go to Piston one at a time, across all users. Our Piston image
// crashes its sandbox when two jobs overlap ("Sandbox keeper received fatal
// signal 6"): about half of parallel runs failed in testing, none of the
// sequential ones. Re-test concurrency on the VPS (S6) before raising this.
// The queue lives in this instance, so the API must have only one
// PistonClient (move it to a shared module when duels need it in S7).
@Injectable()
export class PistonClient {
  private readonly logger = new Logger(PistonClient.name);
  private readonly executeUrl: string;
  // Settles when the previous run finishes; each run waits for it.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.executeUrl = `${config.get('PISTON_URL', { infer: true })}/api/v2/execute`;
  }

  // Runs `code` once with `stdin`, after any runs already waiting. Throws
  // 502 EXECUTOR_UNAVAILABLE when Piston can't be reached or refuses the
  // job; a crashing or slow program is a normal result, not an error.
  run(language: string, code: string, stdin: string): Promise<RunResult> {
    const job = this.queue.then(() => this.execute(language, code, stdin));
    // A failed run must not block the ones behind it.
    this.queue = job.catch(() => undefined);
    return job;
  }

  private async execute(
    language: string,
    code: string,
    stdin: string,
  ): Promise<RunResult> {
    let res: Response;
    try {
      res = await fetch(this.executeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          // Any installed version; we install one runtime per language.
          version: '*',
          files: [{ name: FILE_NAMES[language] ?? 'main', content: code }],
          stdin,
          run_timeout: RUN_TIMEOUT_MS,
          compile_timeout: COMPILE_TIMEOUT_MS,
          run_memory_limit: MEMORY_LIMIT_BYTES,
          compile_memory_limit: MEMORY_LIMIT_BYTES,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.error(`Piston unreachable: ${String(err)}`);
      throw unavailable();
    }

    if (!res.ok) {
      // e.g. 400 "python-* runtime is unknown" when the runtime isn't installed.
      this.logger.error(`Piston returned ${res.status}: ${await res.text()}`);
      throw unavailable();
    }

    const body = (await res.json()) as PistonResponse;
    // A failed compile step means the program never ran.
    if (body.compile && body.compile.code !== 0) return toResult(body.compile);
    return toResult(body.run);
  }
}

function toResult(stage: PistonStage): RunResult {
  return {
    stdout: stage.stdout,
    stderr: stage.stderr,
    exitCode: stage.code,
    // Newer Piston also reports SIGKILL for too much output ("OL"/"EL"), so
    // trust status when present; older Piston has none and only kills a
    // program with SIGKILL when it runs out of time.
    timedOut:
      stage.status === 'TO' || (!stage.status && stage.signal === 'SIGKILL'),
  };
}

function unavailable(): BadGatewayException {
  return new BadGatewayException({
    code: 'EXECUTOR_UNAVAILABLE',
    message: 'The code runner is not available right now. Try again soon.',
  });
}
