import type {
  GitCheck,
  GitRunResponse,
  GitScenario,
  TestResult,
} from '@loophole/shared';
import type { Grade } from '../submissions/grading.js';
import { newWorld, runCommands, view, type WorldView } from './git-sim.js';

// Grading for git exercises (ADR-026): build the lesson's starting state
// from its hidden setup, replay the learner's commands, then check the
// state of the folder they end in.

// The learner's terminal: setup (hidden) then their commands, with the
// output of each. `fresh` skips the setup (a Learn example).
export function replay(
  scenario: GitScenario | null,
  commands: string,
): GitRunResponse & { world: WorldView } {
  const world = newWorld();
  if (scenario) runCommands(world, scenario.setup.join('\n'), true);
  const transcript = runCommands(world, commands);
  return { transcript, cwd: world.cwd, world: view(world) };
}

export function gradeGit(scenario: GitScenario, commands: string): Grade {
  const { world } = replay(scenario, commands);
  const results: TestResult[] = scenario.checks.map((check) => ({
    kind: 'check',
    passed: passes(check, world),
    label: check.label,
  }));
  const testsPassed = results.filter((r) => r.passed).length;
  return {
    status: testsPassed === results.length ? 'passed' : 'failed',
    testsPassed,
    totalTests: results.length,
    results,
    stderr: '',
  };
}

function sameText(a: string | undefined, b: string): boolean {
  return a !== undefined && a.trim() === b.trim();
}

export function passes(check: GitCheck, w: WorldView): boolean {
  const repo = w.repo;
  switch (check.type) {
    case 'repo':
      return repo !== null;
    case 'config':
      return !!w.config[check.key === 'user.name' ? 'name' : 'email']?.trim();
    case 'file':
      return check.content === undefined
        ? w.files.has(check.path)
        : sameText(w.files.get(check.path), check.content);
    case 'folder':
      return w.cwd === check.path;
  }
  if (!repo) return false;
  switch (check.type) {
    case 'staged': {
      const isStaged =
        repo.index.get(check.path) !== w.headTree().get(check.path);
      return isStaged === (check.staged ?? true);
    }
    case 'clean':
      return w.isClean();
    case 'commits':
      return w.history(check.branch).length >= check.min;
    case 'commit-message':
      return w
        .history(check.branch)
        .some((c) => sameText(c.message, check.text));
    case 'committed-file': {
      const content = w.treeAt(check.branch).get(check.path);
      const present =
        check.content === undefined
          ? content !== undefined
          : sameText(content, check.content);
      return present === (check.present ?? true);
    }
    case 'branch':
      return repo.branches.has(check.name) === (check.exists ?? true);
    case 'current-branch':
      return repo.head === check.name;
    case 'merged': {
      const branchTip = w.tip(check.branch);
      return !!branchTip && w.isAncestor(branchTip, w.tip(check.into));
    }
    case 'remote':
      return check.url === undefined
        ? repo.remotes.has(check.name)
        : repo.remotes.get(check.name) === check.url;
    case 'pushed':
      return w.pushed(check.remote, check.branch);
  }
}
