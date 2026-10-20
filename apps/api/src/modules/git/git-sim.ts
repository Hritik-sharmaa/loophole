import { createHash } from 'node:crypto';

// A small, deterministic simulation of a terminal with Git and a pretend
// GitHub (ADR-026). Nothing real runs: commands change an in-memory world
// and print messages modelled on real git. Pure, so it is unit-tested and
// replays identically on every request.
//
// Scope, on purpose: one level of folders under the home folder, flat files
// in each, one repository per folder, branches, fast-forward and three-way
// merges without conflicts, and remotes on a pretend GitHub.

type Tree = Map<string, string>;

type Commit = {
  id: string;
  message: string;
  parents: string[];
  tree: Tree;
  author: string;
};

type Repo = {
  index: Tree;
  branches: Map<string, string | null>;
  head: string;
  remotes: Map<string, string>;
  // Last known tips of remote branches, e.g. "origin/main".
  remoteRefs: Map<string, string>;
  // Local branch → "origin/main" it tracks.
  upstream: Map<string, string>;
};

type Folder = { files: Tree; repo: Repo | null };

// A repository on the pretend GitHub, by URL.
type RemoteRepo = { branches: Map<string, string> };

export type GitWorld = {
  cwd: string;
  folders: Map<string, Folder>;
  github: Map<string, RemoteRepo>;
  config: { name: string | null; email: string | null };
  commits: Map<string, Commit>;
  seq: number;
};

export const HOME = '/home/you';
const MAX_COMMANDS = 200;
const MAX_LINE = 500;
const MAX_FILE = 10_000;

export function newWorld(): GitWorld {
  return {
    cwd: '',
    folders: new Map([['', { files: new Map(), repo: null }]]),
    github: new Map(),
    config: { name: 'Learner', email: 'learner@loophole.dev' },
    commits: new Map(),
    seq: 0,
  };
}

export type Step = { command: string; output: string };

// Runs commands one per line. Blank lines and # comments are skipped.
// `allowSetup` enables the hidden @-commands lessons use to build their
// starting state; a learner's commands never get them.
export function runCommands(
  world: GitWorld,
  text: string,
  allowSetup = false,
): Step[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
  const steps: Step[] = [];
  for (const [i, line] of lines.entries()) {
    if (i >= MAX_COMMANDS) {
      steps.push({
        command: line,
        output: `Stopped: at most ${MAX_COMMANDS} commands.`,
      });
      break;
    }
    steps.push({ command: line, output: runLine(world, line, allowSetup) });
  }
  return steps;
}

function runLine(world: GitWorld, line: string, allowSetup: boolean): string {
  if (line.length > MAX_LINE) return 'That line is too long.';
  let words: string[];
  try {
    words = tokenize(line);
  } catch (err) {
    return (err as Error).message;
  }
  const [cmd, ...args] = words;
  if (cmd.startsWith('@')) {
    return allowSetup
      ? setupCommand(world, cmd, args)
      : `${cmd}: command not found`;
  }
  switch (cmd) {
    case 'git':
      return git(world, args);
    case 'ls':
      return ls(world);
    case 'pwd':
      return world.cwd ? `${HOME}/${world.cwd}` : HOME;
    case 'cd':
      return cd(world, args[0]);
    case 'mkdir':
      return mkdir(world, args[0]);
    case 'touch':
      return touch(world, args);
    case 'cat':
      return cat(world, args[0]);
    case 'echo':
      return echo(world, args);
    case 'rm':
      return rm(world, args);
    default:
      return `${cmd}: command not found`;
  }
}

// Splits a line into words, honouring "double" and 'single' quotes, and
// keeps > and >> as their own words.
export function tokenize(line: string): string[] {
  const words: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (ch === ' ' || ch === '\t') {
      if (started) words.push(current);
      current = '';
      started = false;
    } else if (ch === '>') {
      if (started) words.push(current);
      const double = line[i + 1] === '>';
      words.push(double ? '>>' : '>');
      if (double) i++;
      current = '';
      started = false;
    } else {
      current += ch;
      started = true;
    }
  }
  if (quote)
    throw new Error('Unclosed quote: close it with a matching ' + quote);
  if (started) words.push(current);
  return words;
}

// --- hidden setup commands ------------------------------------------------

function setupCommand(world: GitWorld, cmd: string, args: string[]): string {
  if (cmd === '@github') {
    // An empty repository on the pretend GitHub, ready to push to.
    world.github.set(args[0], { branches: new Map() });
    return '';
  }
  if (cmd === '@config-reset') {
    world.config = { name: null, email: null };
    return '';
  }
  return `${cmd}: unknown setup command`;
}

// --- shell ------------------------------------------------------------------

function folder(world: GitWorld): Folder {
  return world.folders.get(world.cwd)!;
}

function ls(world: GitWorld): string {
  const names: string[] = [];
  if (world.cwd === '') {
    for (const name of world.folders.keys()) if (name) names.push(`${name}/`);
  }
  names.push(...folder(world).files.keys());
  return names.sort().join('  ');
}

function cd(world: GitWorld, target: string | undefined): string {
  if (!target || target === '~' || target === '..' || target === '/home/you') {
    world.cwd = '';
    return '';
  }
  if (target === '.') return '';
  const name = target.replace(/\/$/, '');
  if (world.cwd === '' && world.folders.has(name)) {
    world.cwd = name;
    return '';
  }
  return `cd: ${target}: No such file or directory`;
}

function mkdir(world: GitWorld, name: string | undefined): string {
  if (!name) return 'mkdir: missing operand';
  if (world.cwd !== '' || name.includes('/')) {
    return "mkdir: this practice terminal has one level of folders. Run 'cd' first to go home.";
  }
  if (world.folders.has(name) || folder(world).files.has(name)) {
    return `mkdir: cannot create directory '${name}': File exists`;
  }
  world.folders.set(name, { files: new Map(), repo: null });
  return '';
}

function validName(name: string): boolean {
  return /^[\w.-]+$/.test(name) && name !== '.' && name !== '..';
}

function touch(world: GitWorld, names: string[]): string {
  if (names.length === 0) return 'touch: missing file operand';
  const files = folder(world).files;
  for (const name of names) {
    if (!validName(name))
      return `touch: '${name}': use a simple file name, like notes.txt`;
    if (!files.has(name)) files.set(name, '');
  }
  return '';
}

function cat(world: GitWorld, name: string | undefined): string {
  if (!name) return 'cat: missing file operand';
  const content = folder(world).files.get(name);
  if (content === undefined) return `cat: ${name}: No such file or directory`;
  return content.replace(/\n$/, '');
}

function echo(world: GitWorld, args: string[]): string {
  const at = args.findIndex((a) => a === '>' || a === '>>');
  if (at === -1) return args.join(' ');
  const text = args.slice(0, at).join(' ') + '\n';
  const name = args[at + 1];
  if (!name || !validName(name))
    return 'echo: write to a simple file name, like: echo hi > notes.txt';
  const files = folder(world).files;
  const next = args[at] === '>>' ? (files.get(name) ?? '') + text : text;
  if (next.length > MAX_FILE)
    return `echo: ${name} is too big for this practice terminal`;
  files.set(name, next);
  return '';
}

function rm(world: GitWorld, args: string[]): string {
  const recursive = args.includes('-r') || args.includes('-rf');
  const names = args.filter((a) => !a.startsWith('-'));
  if (names.length === 0) return 'rm: missing operand';
  for (const raw of names) {
    const name = raw.replace(/\/$/, '');
    if (world.cwd === '' && world.folders.has(name) && name !== '') {
      if (!recursive) return `rm: cannot remove '${name}': Is a directory`;
      world.folders.delete(name);
      continue;
    }
    if (!folder(world).files.delete(name)) {
      return `rm: cannot remove '${name}': No such file or directory`;
    }
  }
  return '';
}

// --- git --------------------------------------------------------------------

const NOT_A_REPO =
  'fatal: not a git repository (or any of the parent directories): .git';

function git(world: GitWorld, args: string[]): string {
  const [sub, ...rest] = args;
  switch (sub) {
    case undefined:
    case 'help':
    case '--help':
      return [
        'These are common Git commands:',
        '   init, clone, status, add, restore, commit, log',
        '   branch, switch, checkout, merge',
        '   remote, push, pull, fetch, config',
      ].join('\n');
    case '--version':
      return 'git version 2.44.0';
    case 'init':
      return gitInit(world);
    case 'config':
      return gitConfig(world, rest);
    case 'clone':
      return gitClone(world, rest);
  }
  const repo = folder(world).repo;
  if (!repo) return NOT_A_REPO;
  switch (sub) {
    case 'status':
      return gitStatus(world, repo);
    case 'add':
      return gitAdd(world, repo, rest);
    case 'restore':
      return gitRestore(world, repo, rest);
    case 'commit':
      return gitCommit(world, repo, rest);
    case 'log':
      return gitLog(world, repo, rest);
    case 'branch':
      return gitBranch(world, repo, rest);
    case 'switch':
    case 'checkout':
      return gitSwitch(world, repo, rest, sub);
    case 'merge':
      return gitMerge(world, repo, rest[0]);
    case 'remote':
      return gitRemote(world, repo, rest);
    case 'push':
      return gitPush(world, repo, rest);
    case 'pull':
      return gitPull(world, repo, rest);
    case 'fetch':
      return gitFetch(world, repo, rest);
    default:
      return `git: '${sub}' is not a git command. See 'git --help'.`;
  }
}

function where(world: GitWorld): string {
  return world.cwd ? `${HOME}/${world.cwd}` : HOME;
}

function emptyRepo(): Repo {
  return {
    index: new Map(),
    branches: new Map([['main', null]]),
    head: 'main',
    remotes: new Map(),
    remoteRefs: new Map(),
    upstream: new Map(),
  };
}

function gitInit(world: GitWorld): string {
  const f = folder(world);
  if (f.repo)
    return `Reinitialized existing Git repository in ${where(world)}/.git/`;
  f.repo = emptyRepo();
  return `Initialized empty Git repository in ${where(world)}/.git/`;
}

function gitConfig(world: GitWorld, args: string[]): string {
  const words = args.filter((a) => a !== '--global');
  const [key, ...value] = words;
  if (key !== 'user.name' && key !== 'user.email') {
    return 'This practice terminal knows two settings: user.name and user.email';
  }
  const field = key === 'user.name' ? 'name' : 'email';
  if (value.length === 0) return world.config[field] ?? '';
  world.config[field] = value.join(' ');
  return '';
}

function tip(repo: Repo, branch = repo.head): string | null {
  return repo.branches.get(branch) ?? null;
}

function treeOf(world: GitWorld, id: string | null): Tree {
  return id ? world.commits.get(id)!.tree : new Map<string, string>();
}

function headTree(world: GitWorld, repo: Repo): Tree {
  return treeOf(world, tip(repo));
}

function short(id: string): string {
  return id.slice(0, 7);
}

type Changes = { added: string[]; modified: string[]; deleted: string[] };

function diff(from: Tree, to: Tree): Changes {
  const changes: Changes = { added: [], modified: [], deleted: [] };
  for (const [path, content] of to) {
    if (!from.has(path)) changes.added.push(path);
    else if (from.get(path) !== content) changes.modified.push(path);
  }
  for (const path of from.keys()) if (!to.has(path)) changes.deleted.push(path);
  for (const list of Object.values(changes)) list.sort();
  return changes;
}

function isEmpty(c: Changes): boolean {
  return c.added.length + c.modified.length + c.deleted.length === 0;
}

function gitStatus(world: GitWorld, repo: Repo): string {
  const head = headTree(world, repo);
  const files = folder(world).files;
  const staged = diff(head, repo.index);
  // Working changes to files git already tracks (in the index).
  const unstaged = diff(repo.index, files);
  const untracked = unstaged.added;
  const header = [`On branch ${repo.head}`];

  const upstream = repo.upstream.get(repo.head);
  const mine = tip(repo);
  if (upstream && mine) {
    const theirs = repo.remoteRefs.get(upstream) ?? null;
    const ahead = countOnlyIn(world, mine, theirs);
    const behind = theirs ? countOnlyIn(world, theirs, mine) : 0;
    if (ahead === 0 && behind === 0) {
      header.push(`Your branch is up to date with '${upstream}'.`);
    } else if (behind === 0) {
      header.push(
        `Your branch is ahead of '${upstream}' by ${plural(ahead, 'commit')}.`,
      );
    } else if (ahead === 0) {
      header.push(
        `Your branch is behind '${upstream}' by ${plural(behind, 'commit')}.`,
      );
    }
  }

  // Blocks separated by blank lines, as real git prints them.
  const sections: string[][] = [];
  if (!mine) sections.push(['No commits yet']);
  if (!isEmpty(staged)) {
    sections.push([
      'Changes to be committed:',
      ...staged.added.map((p) => `\tnew file:   ${p}`),
      ...staged.modified.map((p) => `\tmodified:   ${p}`),
      ...staged.deleted.map((p) => `\tdeleted:    ${p}`),
    ]);
  }
  if (unstaged.modified.length + unstaged.deleted.length > 0) {
    sections.push([
      'Changes not staged for commit:',
      ...unstaged.modified.map((p) => `\tmodified:   ${p}`),
      ...unstaged.deleted.map((p) => `\tdeleted:    ${p}`),
    ]);
  }
  if (untracked.length > 0) {
    sections.push(['Untracked files:', ...untracked.map((p) => `\t${p}`)]);
  }
  if (isEmpty(staged) && isEmpty(unstaged)) {
    sections.push([
      mine
        ? 'nothing to commit, working tree clean'
        : 'nothing to commit (create/copy files and use "git add" to track)',
    ]);
  } else if (isEmpty(staged)) {
    sections.push([
      untracked.length > 0 &&
      unstaged.modified.length + unstaged.deleted.length === 0
        ? 'nothing added to commit but untracked files present (use "git add" to track)'
        : 'no changes added to commit (use "git add")',
    ]);
  }
  // Real git puts a blank line after the header only when it says more
  // than "On branch …" or the next block is "No commits yet".
  const gap = header.length > 1 || !mine ? '\n\n' : '\n';
  return (
    header.join('\n') + gap + sections.map((s) => s.join('\n')).join('\n\n')
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function gitAdd(world: GitWorld, repo: Repo, args: string[]): string {
  if (args.length === 0)
    return "Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?";
  const files = folder(world).files;
  if (args.some((a) => a === '.' || a === '-A' || a === '--all')) {
    repo.index = new Map(files);
    return '';
  }
  for (const path of args) {
    if (files.has(path)) repo.index.set(path, files.get(path)!);
    else if (repo.index.has(path)) repo.index.delete(path);
    else return `fatal: pathspec '${path}' did not match any files`;
  }
  return '';
}

function gitRestore(world: GitWorld, repo: Repo, args: string[]): string {
  const staged = args.includes('--staged');
  const paths = args.filter((a) => !a.startsWith('-'));
  if (paths.length === 0) return 'fatal: you must specify path(s) to restore';
  const head = headTree(world, repo);
  const files = folder(world).files;
  for (const path of paths) {
    if (staged) {
      if (!repo.index.has(path) && !head.has(path)) {
        return `error: pathspec '${path}' did not match any file(s) known to git`;
      }
      if (head.has(path)) repo.index.set(path, head.get(path)!);
      else repo.index.delete(path);
    } else {
      if (!repo.index.has(path)) {
        return `error: pathspec '${path}' did not match any file(s) known to git`;
      }
      files.set(path, repo.index.get(path)!);
    }
  }
  return '';
}

function makeCommit(
  world: GitWorld,
  message: string,
  parents: string[],
  tree: Tree,
): Commit {
  world.seq++;
  const id = createHash('sha1')
    .update(
      JSON.stringify([world.seq, message, parents, [...tree.entries()].sort()]),
    )
    .digest('hex');
  const commit: Commit = {
    id,
    message,
    parents,
    tree: new Map(tree),
    author: `${world.config.name} <${world.config.email}>`,
  };
  world.commits.set(id, commit);
  return commit;
}

function gitCommit(world: GitWorld, repo: Repo, args: string[]): string {
  let message: string | null = null;
  let all = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-m' || a === '--message') message = args[++i] ?? null;
    else if (a === '-a' || a === '--all') all = true;
    else if (a === '-am') {
      all = true;
      message = args[++i] ?? null;
    }
  }
  if (!world.config.name || !world.config.email) {
    return [
      'Author identity unknown',
      '',
      '*** Please tell me who you are.',
      '',
      'Run',
      '',
      '  git config --global user.email "you@example.com"',
      '  git config --global user.name "Your Name"',
      '',
      "to set your account's default identity.",
    ].join('\n');
  }
  if (message === null || message.trim() === '') {
    return 'Aborting commit due to empty commit message. Use: git commit -m "your message"';
  }
  const files = folder(world).files;
  if (all) {
    for (const path of [...repo.index.keys()]) {
      if (files.has(path)) repo.index.set(path, files.get(path)!);
      else repo.index.delete(path);
    }
  }
  const parent = tip(repo);
  const head = headTree(world, repo);
  const changes = diff(head, repo.index);
  if (isEmpty(changes)) {
    const unstaged = diff(repo.index, files);
    return isEmpty(unstaged)
      ? `On branch ${repo.head}\nnothing to commit, working tree clean`
      : `On branch ${repo.head}\nno changes added to commit (use "git add" first)`;
  }
  const commit = makeCommit(
    world,
    message.trim(),
    parent ? [parent] : [],
    repo.index,
  );
  repo.branches.set(repo.head, commit.id);
  const count =
    changes.added.length + changes.modified.length + changes.deleted.length;
  return [
    `[${repo.head}${parent ? '' : ' (root-commit)'} ${short(commit.id)}] ${commit.message}`,
    ` ${plural(count, 'file')} changed`,
  ].join('\n');
}

// Every commit reachable from `id`, newest first along first parents first.
function history(world: GitWorld, id: string | null): Commit[] {
  const seen = new Set<string>();
  const order: Commit[] = [];
  const queue = id ? [id] : [];
  while (queue.length) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    const c = world.commits.get(next)!;
    order.push(c);
    queue.push(...c.parents);
  }
  return order;
}

function isAncestor(
  world: GitWorld,
  maybe: string,
  of: string | null,
): boolean {
  return history(world, of).some((c) => c.id === maybe);
}

// Commits reachable from `a` but not from `b`.
function countOnlyIn(world: GitWorld, a: string, b: string | null): number {
  const inB = new Set(history(world, b).map((c) => c.id));
  return history(world, a).filter((c) => !inB.has(c.id)).length;
}

function gitLog(world: GitWorld, repo: Repo, args: string[]): string {
  const id = tip(repo);
  if (!id) {
    return `fatal: your current branch '${repo.head}' does not have any commits yet`;
  }
  const oneline = args.includes('--oneline');
  // Branch and remote names to show next to each commit.
  const labels = new Map<string, string[]>();
  const label = (commit: string, name: string) =>
    labels.set(commit, [...(labels.get(commit) ?? []), name]);
  label(id, `HEAD -> ${repo.head}`);
  for (const [name, at] of repo.branches)
    if (at && name !== repo.head) label(at, name);
  for (const [name, at] of repo.remoteRefs) label(at, name);

  return history(world, id)
    .map((c) => {
      const deco = labels.has(c.id) ? ` (${labels.get(c.id)!.join(', ')})` : '';
      return oneline
        ? `${short(c.id)}${deco} ${c.message}`
        : `commit ${c.id}${deco}\nAuthor: ${c.author}\n\n    ${c.message}\n`;
    })
    .join('\n')
    .trimEnd();
}

function gitBranch(world: GitWorld, repo: Repo, args: string[]): string {
  if (args.length === 0) {
    // A branch with no commits yet isn't listed, as in real git.
    return [...repo.branches.keys()]
      .filter((b) => repo.branches.get(b) !== null)
      .sort()
      .map((b) => (b === repo.head ? `* ${b}` : `  ${b}`))
      .join('\n');
  }
  if (args[0] === '-d' || args[0] === '-D') {
    const name = args[1];
    if (!name || !repo.branches.has(name))
      return `error: branch '${name}' not found.`;
    if (name === repo.head) {
      return `error: Cannot delete branch '${name}' checked out at '${where(world)}'`;
    }
    const at = repo.branches.get(name)!;
    if (args[0] === '-d' && at && !isAncestor(world, at, tip(repo))) {
      return `error: The branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.`;
    }
    repo.branches.delete(name);
    return `Deleted branch ${name} (was ${at ? short(at) : 'empty'}).`;
  }
  return createBranch(repo, args[0]);
}

function createBranch(repo: Repo, name: string): string {
  if (!/^[\w./-]+$/.test(name))
    return `fatal: '${name}' is not a valid branch name`;
  if (repo.branches.has(name) && repo.branches.get(name) !== null) {
    return `fatal: a branch named '${name}' already exists`;
  }
  const at = tip(repo);
  if (!at) return `fatal: not a valid object name: '${repo.head}'`;
  repo.branches.set(name, at);
  return '';
}

// Moves HEAD to another branch, carrying uncommitted changes along when
// they don't clash with what changes between the two branches.
function gitSwitch(
  world: GitWorld,
  repo: Repo,
  args: string[],
  sub: string,
): string {
  const create = args[0] === '-c' || args[0] === '-b';
  const name = create ? args[1] : args[0];
  if (!name) return `fatal: missing branch name; try 'git ${sub} <branch>'`;
  if (create) {
    const error = createBranch(repo, name);
    if (error) return error;
  } else if (!repo.branches.has(name)) {
    return `fatal: invalid reference: ${name}`;
  }
  if (name === repo.head) return `Already on '${name}'`;

  const error = moveTo(world, repo, tip(repo, name));
  if (error) return error;
  repo.head = name;
  return create
    ? `Switched to a new branch '${name}'`
    : `Switched to branch '${name}'`;
}

// Updates the folder and index from the current commit to `target`,
// keeping local changes. Returns an error message when they would clash.
function moveTo(world: GitWorld, repo: Repo, target: string | null): string {
  const files = folder(world).files;
  const from = headTree(world, repo);
  const to = treeOf(world, target);
  const local = new Set([
    ...Object.values(diff(from, repo.index)).flat(),
    ...Object.values(diff(repo.index, files))
      .flat()
      .filter((p) => repo.index.has(p) || from.has(p)),
  ]);
  // Untracked files the target would replace with different content.
  const untracked = [...files.keys()].filter(
    (p) =>
      !repo.index.has(p) &&
      !from.has(p) &&
      to.has(p) &&
      files.get(p) !== to.get(p),
  );
  const clashes = [
    ...[...local].filter((p) => from.get(p) !== to.get(p)),
    ...untracked,
  ].sort();
  if (clashes.length > 0) {
    return [
      'error: Your local changes to the following files would be overwritten:',
      ...clashes.map((p) => `\t${p}`),
      'Please commit your changes before you switch branches.',
      'Aborting',
    ].join('\n');
  }
  for (const path of from.keys()) {
    if (!local.has(path) && !to.has(path)) {
      files.delete(path);
      repo.index.delete(path);
    }
  }
  for (const [path, content] of to) {
    if (!local.has(path)) {
      files.set(path, content);
      repo.index.set(path, content);
    }
  }
  return '';
}

// No staged or unstaged changes to tracked files. `strict` also requires
// no untracked files: "nothing to commit, working tree clean".
function isClean(world: GitWorld, repo: Repo, strict = false): boolean {
  const head = headTree(world, repo);
  const files = folder(world).files;
  const workingChanges = Object.values(diff(repo.index, files))
    .flat()
    .filter((p) => strict || repo.index.has(p) || head.has(p));
  return isEmpty(diff(head, repo.index)) && workingChanges.length === 0;
}

// Merges commit `theirs` into the current branch: fast-forward when
// possible, otherwise a merge commit. Conflicts are refused (ADR-026).
function mergeCommit(
  world: GitWorld,
  repo: Repo,
  theirs: string,
  name: string,
): string {
  const ours = tip(repo);
  if (ours && isAncestor(world, theirs, ours)) return 'Already up to date.';
  if (!isClean(world, repo)) {
    return 'error: Your local changes would be overwritten by merge.\nPlease commit your changes before you merge.\nAborting';
  }
  if (!ours || isAncestor(world, ours, theirs)) {
    const changes = diff(headTree(world, repo), treeOf(world, theirs));
    moveTo(world, repo, theirs);
    repo.branches.set(repo.head, theirs);
    return [
      `Updating ${ours ? short(ours) : '0000000'}..${short(theirs)}`,
      'Fast-forward',
      ...summary(changes),
    ].join('\n');
  }

  const base = history(world, ours).find((c) =>
    isAncestor(world, c.id, theirs),
  );
  const baseTree = treeOf(world, base?.id ?? null);
  const mine = treeOf(world, ours);
  const other = treeOf(world, theirs);
  const merged: Tree = new Map();
  const conflicts: string[] = [];
  for (const path of new Set([
    ...baseTree.keys(),
    ...mine.keys(),
    ...other.keys(),
  ])) {
    const b = baseTree.get(path);
    const m = mine.get(path);
    const o = other.get(path);
    const result = m === o ? m : m === b ? o : o === b ? m : null;
    if (result === null) conflicts.push(path);
    else if (result !== undefined) merged.set(path, result);
  }
  if (conflicts.length > 0) {
    return [
      ...conflicts
        .sort()
        .map((p) => `CONFLICT (content): Merge conflict in ${p}`),
      'Both branches changed the same file. This practice terminal stops here',
      'instead of starting a conflict; start over and try another way.',
    ].join('\n');
  }
  const commit = makeCommit(
    world,
    `Merge branch '${name}'`,
    [ours, theirs],
    merged,
  );
  const changes = diff(mine, merged);
  moveTo(world, repo, commit.id);
  repo.branches.set(repo.head, commit.id);
  return ["Merge made by the 'ort' strategy.", ...summary(changes)].join('\n');
}

function summary(c: Changes): string[] {
  return [
    ...c.added.map((p) => ` create mode 100644 ${p}`),
    ...c.modified.map((p) => ` ${p} | changed`),
    ...c.deleted.map((p) => ` delete mode 100644 ${p}`),
  ];
}

function gitMerge(
  world: GitWorld,
  repo: Repo,
  name: string | undefined,
): string {
  if (!name) return 'fatal: No remote for the current branch.';
  const theirs = repo.branches.get(name) ?? repo.remoteRefs.get(name) ?? null;
  if (!theirs) return `merge: ${name} - not something we can merge`;
  return mergeCommit(world, repo, theirs, name);
}

function gitRemote(world: GitWorld, repo: Repo, args: string[]): string {
  if (args.length === 0) return [...repo.remotes.keys()].join('\n');
  if (args[0] === '-v') {
    return [...repo.remotes]
      .flatMap(([n, url]) => [`${n}\t${url} (fetch)`, `${n}\t${url} (push)`])
      .join('\n');
  }
  if (args[0] === 'add') {
    const [, name, url] = args;
    if (!name || !url) return 'usage: git remote add <name> <url>';
    if (repo.remotes.has(name)) return `error: remote ${name} already exists.`;
    repo.remotes.set(name, url);
    return '';
  }
  if (args[0] === 'remove' || args[0] === 'rm') {
    if (!repo.remotes.delete(args[1]))
      return `error: No such remote: '${args[1]}'`;
    return '';
  }
  return 'This practice terminal knows: git remote, git remote -v, git remote add, git remote remove';
}

// The pretend GitHub repository behind a remote name, or an error.
function remoteRepo(
  world: GitWorld,
  repo: Repo,
  name: string,
): { url: string; remote: RemoteRepo } | string {
  const url = repo.remotes.get(name);
  if (!url) {
    return `fatal: '${name}' does not appear to be a git repository\nfatal: Could not read from remote repository.`;
  }
  const remote = world.github.get(url);
  if (!remote)
    return `remote: Repository not found.\nfatal: repository '${url}' not found`;
  return { url, remote };
}

function gitPush(world: GitWorld, repo: Repo, args: string[]): string {
  const setUpstream = args.includes('-u') || args.includes('--set-upstream');
  const words = args.filter((a) => !a.startsWith('-'));
  let [remoteName, branch] = words;
  if (!remoteName) {
    const upstream = repo.upstream.get(repo.head);
    if (!upstream) {
      return [
        `fatal: The current branch ${repo.head} has no upstream branch.`,
        'To push the current branch and set the remote as upstream, use',
        '',
        `    git push --set-upstream origin ${repo.head}`,
      ].join('\n');
    }
    [remoteName, branch] = upstream.split('/');
  }
  branch ??= repo.head;
  const found = remoteRepo(world, repo, remoteName);
  if (typeof found === 'string') return found;
  const mine = repo.branches.get(branch) ?? null;
  if (!mine) return `error: src refspec ${branch} does not match any`;
  const theirs = found.remote.branches.get(branch) ?? null;
  const lines = [`To ${found.url}`];
  if (theirs && !isAncestor(world, theirs, mine)) {
    return [
      ...lines,
      ` ! [rejected]        ${branch} -> ${branch} (fetch first)`,
      `error: failed to push some refs to '${found.url}'`,
      'hint: Updates were rejected because the remote contains work that you do',
      "hint: not have locally. Run 'git pull' first, then push again.",
    ].join('\n');
  }
  if (theirs === mine) return 'Everything up-to-date';
  found.remote.branches.set(branch, mine);
  repo.remoteRefs.set(`${remoteName}/${branch}`, mine);
  lines.push(
    theirs
      ? `   ${short(theirs)}..${short(mine)}  ${branch} -> ${branch}`
      : ` * [new branch]      ${branch} -> ${branch}`,
  );
  if (setUpstream) {
    repo.upstream.set(branch, `${remoteName}/${branch}`);
    lines.push(`branch '${branch}' set up to track '${remoteName}/${branch}'.`);
  }
  return lines.join('\n');
}

// Copies the remote's branch tips into remoteRefs. Returns the lines to
// print, or an error message.
function fetchRemote(
  world: GitWorld,
  repo: Repo,
  remoteName: string,
): { lines: string[] } | string {
  const found = remoteRepo(world, repo, remoteName);
  if (typeof found === 'string') return found;
  const lines: string[] = [];
  for (const [branch, at] of found.remote.branches) {
    const ref = `${remoteName}/${branch}`;
    const before = repo.remoteRefs.get(ref);
    if (before === at) continue;
    if (lines.length === 0) lines.push(`From ${found.url}`);
    lines.push(
      before
        ? `   ${short(before)}..${short(at)}  ${branch}     -> ${ref}`
        : ` * [new branch]      ${branch}     -> ${ref}`,
    );
    repo.remoteRefs.set(ref, at);
  }
  return { lines };
}

function gitFetch(world: GitWorld, repo: Repo, args: string[]): string {
  const result = fetchRemote(world, repo, args[0] ?? 'origin');
  return typeof result === 'string' ? result : result.lines.join('\n');
}

function gitPull(world: GitWorld, repo: Repo, args: string[]): string {
  const upstream = repo.upstream.get(repo.head);
  const [remoteName, branch] = args.length
    ? [args[0], args[1] ?? repo.head]
    : (upstream?.split('/') ?? [null, null]);
  if (!remoteName || !branch) {
    return [
      'There is no tracking information for the current branch.',
      'Please specify which branch you want to merge with:',
      '',
      `    git pull origin ${repo.head}`,
    ].join('\n');
  }
  const fetched = fetchRemote(world, repo, remoteName);
  if (typeof fetched === 'string') return fetched;
  const theirs = repo.remoteRefs.get(`${remoteName}/${branch}`);
  if (!theirs) return `fatal: couldn't find remote ref ${branch}`;
  const merged = mergeCommit(world, repo, theirs, `${remoteName}/${branch}`);
  return [...fetched.lines, merged].join('\n');
}

function gitClone(world: GitWorld, args: string[]): string {
  const [url, dirArg] = args.filter((a) => !a.startsWith('-'));
  if (!url) return 'fatal: You must specify a repository to clone.';
  if (world.cwd !== '') {
    return "fatal: this practice terminal clones into your home folder. Run 'cd' first.";
  }
  const remote = world.github.get(url);
  const name =
    dirArg ??
    url
      .replace(/\/$/, '')
      .split('/')
      .pop()!
      .replace(/\.git$/, '');
  if (!remote)
    return `Cloning into '${name}'...\nremote: Repository not found.\nfatal: repository '${url}' not found`;
  if (world.folders.has(name) || folder(world).files.has(name)) {
    return `fatal: destination path '${name}' already exists and is not an empty directory.`;
  }
  const repo = emptyRepo();
  repo.remotes.set('origin', url);
  for (const [branch, at] of remote.branches)
    repo.remoteRefs.set(`origin/${branch}`, at);
  const main = remote.branches.has('main')
    ? 'main'
    : [...remote.branches.keys()][0];
  const files: Tree = new Map();
  if (main) {
    const at = remote.branches.get(main)!;
    repo.branches = new Map([[main, at]]);
    repo.head = main;
    repo.upstream.set(main, `origin/${main}`);
    for (const [p, c] of treeOf(world, at)) {
      files.set(p, c);
      repo.index.set(p, c);
    }
  }
  world.folders.set(name, { files, repo });
  return main
    ? `Cloning into '${name}'...\ndone.`
    : `Cloning into '${name}'...\nwarning: You appear to have cloned an empty repository.`;
}

// --- reading the world, for checks ----------------------------------------

export type WorldView = {
  cwd: string;
  files: Tree;
  repo: Repo | null;
  config: GitWorld['config'];
  tip: (branch?: string) => string | null;
  treeAt: (branch?: string) => Tree;
  history: (branch?: string) => { id: string; message: string }[];
  isAncestor: (maybe: string, of: string | null) => boolean;
  headTree: () => Tree;
  isClean: () => boolean;
  pushed: (remote: string, branch: string) => boolean;
};

// The folder the learner ended in, with the helpers checks need.
export function view(world: GitWorld): WorldView {
  const f = folder(world);
  const repo = f.repo;
  const tipOf = (branch?: string) =>
    repo ? tip(repo, branch ?? repo.head) : null;
  return {
    cwd: world.cwd,
    files: f.files,
    repo,
    config: world.config,
    tip: tipOf,
    treeAt: (branch) => treeOf(world, tipOf(branch)),
    history: (branch) => history(world, tipOf(branch)),
    isAncestor: (maybe, of) => isAncestor(world, maybe, of),
    headTree: () => (repo ? headTree(world, repo) : new Map()),
    isClean: () => (repo ? isClean(world, repo, true) : false),
    pushed: (remoteName, branch) => {
      if (!repo) return false;
      const url = repo.remotes.get(remoteName);
      const mine = tip(repo, branch);
      const remote = url ? world.github.get(url) : undefined;
      return !!mine && remote?.branches.get(branch) === mine;
    },
  };
}
