import type { GitCheck } from '@loophole/shared';
import { gradeGit, passes, replay } from '../git-checks.js';
import { newWorld, runCommands, tokenize, view } from '../git-sim.js';

// Runs commands in a fresh world; returns each output and the world view.
function run(text: string, allowSetup = false) {
  const world = newWorld();
  const steps = runCommands(world, text, allowSetup);
  return { out: steps.map((s) => s.output), world, w: view(world) };
}
const last = (text: string) => run(text).out.at(-1)!;

const REPO = [
  'git init',
  'echo "<h1>Hi</h1>" > index.html',
  'git add index.html',
  'git commit -m "Add home page"',
].join('\n');

describe('tokenize', () => {
  it('honours quotes and splits out > and >>', () => {
    expect(tokenize(`git commit -m "Fix the 'title' tag"`)).toEqual([
      'git',
      'commit',
      '-m',
      "Fix the 'title' tag",
    ]);
    expect(tokenize('echo hi>a.txt')).toEqual(['echo', 'hi', '>', 'a.txt']);
    expect(tokenize('echo "x" >> b.txt')).toEqual(['echo', 'x', '>>', 'b.txt']);
    expect(tokenize('echo ""')).toEqual(['echo', '']);
  });

  it('reports an unclosed quote instead of guessing', () => {
    expect(last('git commit -m "oops')).toMatch(/^Unclosed quote/);
  });
});

describe('the shell', () => {
  it('creates, appends to, reads, lists and removes files', () => {
    const { out } = run(
      [
        'touch b.txt',
        'echo one > a.txt',
        'echo two >> a.txt',
        'cat a.txt',
        'ls',
        'rm b.txt',
        'ls',
      ].join('\n'),
    );
    expect(out.slice(3)).toEqual(['one\ntwo', 'a.txt  b.txt', '', 'a.txt']);
  });

  it('has one level of folders', () => {
    const { out, world } = run(
      'mkdir site\ncd site\npwd\nmkdir deeper\ncd ..\nls',
    );
    expect(out[2]).toBe('/home/you/site');
    expect(out[3]).toMatch(/one level of folders/);
    expect(out[5]).toBe('site/');
    expect(world.cwd).toBe('');
  });

  it('skips blank lines and comments, and knows no other commands', () => {
    const { out } = run('\n# a comment\n\nsudo rm -rf /');
    expect(out).toEqual(['sudo: command not found']);
  });

  it('never runs setup commands for the learner', () => {
    expect(last('@github https://github.com/x/y.git')).toBe(
      '@github: command not found',
    );
  });
});

describe('init, add, commit, status, log', () => {
  it('needs a repository first', () => {
    expect(last('git status')).toMatch(/^fatal: not a git repository/);
  });

  it('walks a file from untracked to staged to committed', () => {
    const { out } = run(
      [
        'git init',
        'touch index.html',
        'git status',
        'git add index.html',
        'git status',
        'git commit -m "Add home page"',
        'git status',
      ].join('\n'),
    );
    expect(out[0]).toBe('Initialized empty Git repository in /home/you/.git/');
    expect(out[2]).toContain('Untracked files:\n\tindex.html');
    expect(out[4]).toContain(
      'Changes to be committed:\n\tnew file:   index.html',
    );
    expect(out[5]).toMatch(
      /^\[main \(root-commit\) [0-9a-f]{7}\] Add home page\n 1 file changed$/,
    );
    expect(out[6]).toBe(
      'On branch main\nnothing to commit, working tree clean',
    );
  });

  it('shows modified files as staged or not staged', () => {
    const out = last(`${REPO}\necho more >> index.html\ngit status`);
    expect(out).toContain(
      'Changes not staged for commit:\n\tmodified:   index.html',
    );
  });

  it('refuses a commit with nothing staged or no message', () => {
    expect(last(`${REPO}\ngit commit -m "again"`)).toContain(
      'nothing to commit',
    );
    expect(last(`${REPO}\necho x >> index.html\ngit commit -m "x"`)).toContain(
      'no changes added',
    );
    expect(last('git init\ntouch a\ngit add a\ngit commit')).toMatch(
      /empty commit message/,
    );
  });

  it('asks who you are until user.name and user.email are set', () => {
    const { out } = run(
      [
        '@config-reset',
        'git init',
        'touch a',
        'git add .',
        'git commit -m "first"',
        'git config --global user.name "Ada Lovelace"',
        'git config --global user.email ada@example.com',
        'git commit -m "first"',
        'git config user.name',
      ].join('\n'),
      true,
    );
    expect(out[4]).toMatch(/^Author identity unknown/);
    expect(out[7]).toMatch(/^\[main \(root-commit\)/);
    expect(out[8]).toBe('Ada Lovelace');
  });

  it('commits tracked changes with -am', () => {
    const { w } = run(
      `${REPO}\necho more >> index.html\ngit commit -am "More"`,
    );
    expect(w.history().map((c) => c.message)).toEqual([
      'More',
      'Add home page',
    ]);
  });

  it('unstages with restore --staged and undoes edits with restore', () => {
    const { w, out } = run(
      `${REPO}\necho secret > key.txt\ngit add .\ngit restore --staged key.txt\necho bad > index.html\ngit restore index.html\ncat index.html\ngit status`,
    );
    expect(out[9]).toBe('<h1>Hi</h1>');
    expect(out[10]).toContain('Untracked files:\n\tkey.txt');
    expect(w.repo!.index.has('key.txt')).toBe(false);
  });

  it('logs newest first, with --oneline and branch labels', () => {
    const out = last(
      `${REPO}\ntouch b\ngit add b\ngit commit -m "Second"\ngit log --oneline`,
    );
    expect(out).toMatch(
      /^[0-9a-f]{7} \(HEAD -> main\) Second\n[0-9a-f]{7} Add home page$/,
    );
  });

  it('is deterministic: the same commands give the same commit ids', () => {
    expect(run(REPO).w.tip()).toBe(run(REPO).w.tip());
  });
});

describe('branches and merges', () => {
  it('creates, lists, switches and keeps work on its own branch', () => {
    const { out, w } = run(
      `${REPO}\ngit switch -c header\necho header > header.html\ngit add .\ngit commit -m "Add header"\ngit branch\ngit switch main\nls`,
    );
    expect(out[4]).toBe("Switched to a new branch 'header'");
    expect(out[8]).toBe('* header\n  main');
    expect(out[10]).toBe('index.html');
    expect(w.treeAt('header').has('header.html')).toBe(true);
    expect(w.treeAt('main').has('header.html')).toBe(false);
  });

  it('fast-forwards a merge', () => {
    const out = last(
      `${REPO}\ngit checkout -b footer\ntouch footer.html\ngit add .\ngit commit -m "Add footer"\ngit checkout main\ngit merge footer`,
    );
    expect(out).toMatch(
      /^Updating [0-9a-f]{7}\.\.[0-9a-f]{7}\nFast-forward\n create mode 100644 footer.html$/,
    );
  });

  it('makes a merge commit when both branches moved', () => {
    const { out, w } = run(
      `${REPO}\ngit switch -c a\ntouch a.txt\ngit add .\ngit commit -m "A"\ngit switch main\ntouch b.txt\ngit add .\ngit commit -m "B"\ngit merge a`,
    );
    expect(out.at(-1)).toMatch(/^Merge made by the 'ort' strategy\./);
    expect([...w.treeAt().keys()].sort()).toEqual([
      'a.txt',
      'b.txt',
      'index.html',
    ]);
    expect(w.history()[0].message).toBe("Merge branch 'a'");
  });

  it('refuses a conflicting merge without changing anything', () => {
    const { out, w } = run(
      `${REPO}\ngit switch -c a\necho A > index.html\ngit commit -am "A"\ngit switch main\necho B > index.html\ngit commit -am "B"\ngit merge a`,
    );
    expect(out.at(-1)).toMatch(
      /^CONFLICT \(content\): Merge conflict in index\.html/,
    );
    expect(w.history()[0].message).toBe('B');
    expect(w.isClean()).toBe(true);
  });

  it('will not switch over uncommitted changes that would be lost', () => {
    const out = last(
      `${REPO}\ngit switch -c a\necho A > index.html\ngit commit -am "A"\ngit switch main\necho mine > index.html\ngit switch a`,
    );
    expect(out).toMatch(/would be overwritten:\n\tindex\.html/);
  });

  it('deletes a merged branch, but not an unmerged or current one', () => {
    const { out } = run(
      `${REPO}\ngit branch done\ngit switch -c wip\ntouch w\ngit add .\ngit commit -m "W"\ngit branch -d wip\ngit switch main\ngit branch -d wip\ngit branch -d done`,
    );
    expect(out[9]).toMatch(/^error: Cannot delete branch 'wip' checked out/);
    expect(out[11]).toMatch(/not fully merged/);
    expect(out[12]).toMatch(/^Deleted branch done \(was [0-9a-f]{7}\)\.$/);
  });
});

describe('the pretend GitHub', () => {
  const URL = 'https://github.com/you/site.git';

  it('pushes, sets the upstream, then pushes with no arguments', () => {
    const { out, w } = run(
      `@github ${URL}\n${REPO}\ngit remote add origin ${URL}\ngit push\ngit push -u origin main\ngit status\ntouch b\ngit add .\ngit commit -m "B"\ngit status\ngit push`,
      true,
    );
    expect(out[6]).toMatch(/has no upstream branch/);
    expect(out[7]).toBe(
      `To ${URL}\n * [new branch]      main -> main\nbranch 'main' set up to track 'origin/main'.`,
    );
    expect(out[8]).toContain("Your branch is up to date with 'origin/main'.");
    expect(out[12]).toContain(
      "Your branch is ahead of 'origin/main' by 1 commit.",
    );
    expect(out[13]).toMatch(
      /^To .*\n {3}[0-9a-f]{7}\.\.[0-9a-f]{7} {2}main -> main$/,
    );
    expect(w.pushed('origin', 'main')).toBe(true);
  });

  it('cannot push to a repository that does not exist', () => {
    expect(
      last(
        `${REPO}\ngit remote add origin https://github.com/x/none.git\ngit push -u origin main`,
      ),
    ).toMatch(/Repository not found/);
  });

  // Builds a GitHub repo with one commit, as lesson setups do.
  const SEEDED = [
    `@github ${URL}`,
    'mkdir seed',
    'cd seed',
    REPO,
    `git remote add origin ${URL}`,
    'git push -u origin main',
    'cd ..',
    'rm -r seed',
  ].join('\n');

  it('clones a repository into a folder named after it', () => {
    const { out, w, world } = run(
      `${SEEDED}\ngit clone ${URL}\ncd site\nls\ngit status`,
      true,
    );
    expect(out.at(-4)).toBe("Cloning into 'site'...\ndone.");
    expect(out.at(-2)).toBe('index.html');
    expect(out.at(-1)).toContain(
      "Your branch is up to date with 'origin/main'.",
    );
    expect(world.cwd).toBe('site');
    expect(w.repo!.remotes.get('origin')).toBe(URL);
  });

  it('rejects a push when GitHub has new work, then pull fast-forwards', () => {
    const { out, w } = run(
      [
        SEEDED,
        `git clone ${URL} a`,
        `git clone ${URL} b`,
        'cd a',
        'echo more >> index.html',
        'git commit -am "From a"',
        'git push',
        'cd ..',
        'cd b',
        'touch b.txt',
        'git add .',
        'git commit -m "From b"',
        'git push',
        'git pull',
        'git push',
      ].join('\n'),
      true,
    );
    expect(out.at(-3)).toMatch(/\[rejected\].*\(fetch first\)/);
    expect(out.at(-2)).toMatch(/Merge made by the 'ort' strategy/);
    expect(out.at(-1)).toMatch(/main -> main$/);
    expect(w.pushed('origin', 'main')).toBe(true);
  });
});

describe('checks', () => {
  const at = (setupAndCommands: string, check: GitCheck) =>
    passes(check, run(setupAndCommands, true).w);

  it.each<[string, GitCheck, string, string]>([
    ['repo', { type: 'repo', label: '' }, 'git init', 'ls'],
    [
      'config',
      { type: 'config', label: '', key: 'user.name' },
      '@config-reset\ngit config --global user.name Ada',
      '@config-reset',
    ],
    [
      'file',
      { type: 'file', label: '', path: 'a.txt', content: 'hi' },
      'echo hi > a.txt',
      'echo ho > a.txt',
    ],
    [
      'staged',
      { type: 'staged', label: '', path: 'a' },
      'git init\ntouch a\ngit add a',
      'git init\ntouch a',
    ],
    ['clean', { type: 'clean', label: '' }, REPO, `${REPO}\ntouch stray.txt`],
    ['commits', { type: 'commits', label: '', min: 1 }, REPO, 'git init'],
    [
      'commit-message',
      { type: 'commit-message', label: '', text: 'Add home page' },
      REPO,
      `${REPO.replace('Add home page', 'add home page')}`,
    ],
    [
      'committed-file',
      { type: 'committed-file', label: '', path: 'index.html' },
      REPO,
      'git init\ntouch index.html',
    ],
    [
      'branch',
      { type: 'branch', label: '', name: 'dev' },
      `${REPO}\ngit branch dev`,
      REPO,
    ],
    [
      'current-branch',
      { type: 'current-branch', label: '', name: 'dev' },
      `${REPO}\ngit switch -c dev`,
      `${REPO}\ngit branch dev`,
    ],
    [
      'folder',
      { type: 'folder', label: '', path: 'site' },
      'mkdir site\ncd site',
      'mkdir site',
    ],
  ])('%s passes and fails as expected', (_name, check, good, bad) => {
    expect(at(good, check)).toBe(true);
    expect(at(bad, check)).toBe(false);
  });

  it('negated checks: not staged, file not committed, branch gone', () => {
    const w = run(`${REPO}\ntouch secret.txt\ngit branch -d nope`, true).w;
    expect(
      passes(
        { type: 'staged', label: '', path: 'secret.txt', staged: false },
        w,
      ),
    ).toBe(true);
    expect(
      passes(
        {
          type: 'committed-file',
          label: '',
          path: 'secret.txt',
          present: false,
        },
        w,
      ),
    ).toBe(true);
    expect(
      passes({ type: 'branch', label: '', name: 'nope', exists: false }, w),
    ).toBe(true);
  });
});

describe('gradeGit and replay', () => {
  const scenario = {
    setup: ['echo "<h1>Hi</h1>" > index.html'],
    checks: [
      { type: 'repo' as const, label: 'There is a repository' },
      {
        type: 'commit-message' as const,
        label: 'A commit says Add home page',
        text: 'Add home page',
      },
    ],
  };

  it('runs the hidden setup, then grades the learner commands check by check', () => {
    expect(gradeGit(scenario, 'git init').results).toEqual([
      { kind: 'check', passed: true, label: 'There is a repository' },
      { kind: 'check', passed: false, label: 'A commit says Add home page' },
    ]);
    expect(
      gradeGit(scenario, 'git init\ngit add .\ngit commit -m "Add home page"')
        .status,
    ).toBe('passed');
  });

  it('shows only the learner commands in the transcript', () => {
    const { transcript, cwd } = replay(scenario, 'ls\ncat index.html');
    expect(transcript).toEqual([
      { command: 'ls', output: 'index.html' },
      { command: 'cat index.html', output: '<h1>Hi</h1>' },
    ]);
    expect(cwd).toBe('');
  });

  it('stops after 200 commands', () => {
    const { transcript } = replay(null, 'ls\n'.repeat(250));
    expect(transcript).toHaveLength(201);
    expect(transcript.at(-1)!.output).toMatch(/at most 200 commands/);
  });
});
