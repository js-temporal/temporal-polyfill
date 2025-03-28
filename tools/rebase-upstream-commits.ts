// rebase-upstream-commits provides a series of tools to setup a well-formed
// git rebase of commits from upstream (tc39/proposal-temporal) to our repo,
// handling common rebase conflict cases and adding rebase-specific metadata
// to commit descriptions to retain useful upstream commit information.

// TODO: we should make sure we have fetched / pulled both test262 and spec
// upstream

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as fsP from 'fs/promises';
import path from 'path';
import * as process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const UTF8 = {
  encoding: 'utf-8'
} as const;

const currentExecOpts: { repository: string; rebaseToolConfigDir: string } = {
  repository: '',
  rebaseToolConfigDir: ''
};

function storeInConfigDir(filename: string, content: string | undefined) {
  if (content === undefined) {
    fs.rmSync(`${currentExecOpts.rebaseToolConfigDir}/${filename}`);
    return;
  }
  fs.writeFileSync(`${currentExecOpts.rebaseToolConfigDir}/${filename}`, content, UTF8);
}

function readFromConfigDir(filename: string): string {
  return fs.readFileSync(`${currentExecOpts.rebaseToolConfigDir}/${filename}`, UTF8);
}

function cleanupConfigDir(): void {
  log('cleaning up tool local storage');
  return fs.rmSync(currentExecOpts.rebaseToolConfigDir, {
    recursive: true
  });
}

function runInRepository(
  cmd: string,
  options?: child_process.ExecSyncOptions & {
    cwd?: never;
  }
): string {
  if (!currentExecOpts.repository) {
    throw new Error('Repository not property set! call setRepository in yargs command construction please.');
  }
  return child_process.execSync(cmd, { ...options, cwd: currentExecOpts.repository, ...UTF8 });
}

declare const parsedRevision: unique symbol;

type ValidatedCommit = string & {
  [parsedRevision]: never;
};

function revParse(rev: string): ValidatedCommit {
  return runInRepository(`git rev-parse ${rev}`).trim() as unknown as ValidatedCommit;
}

interface StartRebaseOptions {
  ontoCommit: ValidatedCommit;
  startCommit: ValidatedCommit;
  endCommit: ValidatedCommit;
  exec: string;
}

function maybeInitializeTest262() {
  // Check and see if Test262 is already checked out in the right place
  try {
    fs.statSync(`${currentExecOpts.repository}/test262/harness`);
  } catch (e) {
    console.error('Got an error detecting test262 - initializing Git submodules');
    runInRepository('git submodule init');
    runInRepository('git submodule update');
  }
}

function storeExecCmd(execCmd: string) {
  storeInConfigDir('exec-cmd', execCmd);
}
function storeLatestTestOKCommit(commitHash: ValidatedCommit | undefined) {
  console.error(`Latest test-ok commit updated to ${commitHash}`);
  storeInConfigDir('latest-test-ok-commit', commitHash);
}

function shouldRetest(): boolean {
  try {
    const latestTestOKCommit = readFromConfigDir('latest-test-ok-commit');
    if (!latestTestOKCommit) {
      // TODO we probably want to consider this an error in the context of
      // rebasing?
      return true;
    }
    // git diff latestTestOKCommit..HEAD --stat ?
    const result = runInRepository(`git diff --name-only ${latestTestOKCommit}..HEAD`, {
      env: {
        PATH: process.env['PATH']
      }
    });
    console.error(result);
    return !!result;
  } catch (e) {
    // This didn't work - just re-test anyway
    return true;
  }
}

let execCmdCached: string | undefined = undefined;
function runExec() {
  // TODO this could probably be improved to check for uncommitted changes as
  // well?
  if (!shouldRetest()) {
    console.error('No need to re-test - moving on.');
    return;
  }
  execCmdCached = execCmdCached ?? readFromConfigDir('exec-cmd');
  if (!execCmdCached) return;
  try {
    runInRepository(execCmdCached, {
      env: {
        PATH: process.env['PATH']
      }
    });
  } catch (e: unknown) {
    console.error((e as any).stdout.toString());
    console.error((e as any).stderr.toString());
    throw new Error('Tests failed - see above.');
  }
  // If tests were run and pass, mark this commit as good so we can
  // avoid re-testing unless we need to.
  storeLatestTestOKCommit(revParse('HEAD'));
}

function getSelfRunCommand(cmdArgs: string) {
  return `${process.argv[0]} ${process.argv[1]} ${cmdArgs} --repository=${currentExecOpts.repository}`;
}

function startRebase(options: StartRebaseOptions) {
  maybeInitializeTest262();
  let execSuffix = '';
  if (options.exec) {
    storeExecCmd(options.exec);
    storeLatestTestOKCommit(options.ontoCommit);
    execSuffix = `--exec '${getSelfRunCommand('exec')}'`;
  }
  // eslint-disable-next-line max-len
  const rebaseStartCmd = `git rebase --interactive --onto ${options.ontoCommit} ${options.startCommit} ${options.endCommit} ${execSuffix}`;

  const gitSequenceEditorCmd = `${process.argv[0]} ${process.argv[1]} git-sequence-editor`;
  log(`Starting a git rebase using the following invocation:

GIT_SEQUENCE_EDITOR='${gitSequenceEditorCmd}' ${rebaseStartCmd}

For more information about what commands are useful during a rebase,
try running this tool's "rebasehelp" command.
`);
  console.log('\n(git)');
  try {
    runInRepository(rebaseStartCmd, {
      // We want this to show up in the same TTY that this tool was launched in.
      stdio: 'inherit',
      env: {
        ...process.env,
        GIT_SEQUENCE_EDITOR: gitSequenceEditorCmd,
        PATH: process.env['PATH']
      }
    });
  } catch (e) {
    // Deliberately catch this error - if the rebase failed to start, the
    // relevant info will be printed to stdout/stderr and the rebasing loop
    // won't start. This error is likely redundant.
  }
  console.log('(git done)\n');
}

function getNewestCommit(commit1: string, commit2: string, repoLocation?: string): string | undefined {
  if (isAncestor(commit1, commit2, repoLocation)) {
    return commit2;
  } else if (isAncestor(commit2, commit1, repoLocation)) {
    return commit1;
  } else {
    return undefined;
  }
}

function isAncestor(potentialAncestorCommit: string, childCommit: string, repoLocation?: string): boolean {
  try {
    child_process.execSync(`git merge-base --is-ancestor ${potentialAncestorCommit} ${childCommit}`, {
      cwd: repoLocation ?? currentExecOpts.repository
    });
    // This will return 0 if true, 1 if false
    // any other status is likely a problem with the command itself
    return true;
  } catch (e: unknown) {
    if ((e as { status: number }).status == 1) {
      return false;
    }
    throw e;
  }
}

function editSequenceFile(file: string) {
  // Read in file
  let existingSequenceFile = String(fs.readFileSync(file));
  // Change all pick to edit
  existingSequenceFile = existingSequenceFile
    .split('\n')
    .map((l) => l.replace(/^pick /g, 'edit '))
    .join('\n');
  fs.writeFileSync(file, existingSequenceFile);
}

function getConflictHash() {
  // This is easily available from .git/rebase-merge/stopped-sha if there is a
  // merge conflict, but we may also be stopped in the middle of an exec step,
  // where that file doesn't exist. Instead, get it from the 'done' list.
  const REBASE_DONE_FILE = `${currentExecOpts.repository}/.git/rebase-merge/done`;
  if (!fs.existsSync(REBASE_DONE_FILE)) {
    return undefined;
  }
  const doneEntries = String(fs.readFileSync(REBASE_DONE_FILE)).trim().split('\n');
  const lastEntry = doneEntries[doneEntries.length - 1];
  const [action, sha] = lastEntry.split(' ', 3);
  if (action === 'edit') return sha;
  if (action === 'exec') return 'exec';
  return undefined;
}

function continueRebasing() {
  // Here we go!
  let currentConflict: string | undefined = undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    currentConflict = getConflictHash();
    if (currentConflict === 'exec') {
      if (shouldRetest()) {
        console.error('To continue, first run tests with "trt exec".');
        return;
      }
      gitContinue();
      return;
    }
    if (!currentConflict) {
      log('No conflict - done!');
      if (!inRebase()) cleanupConfigDir();
      return;
    }

    // If in conflict, see if the given commit has an upstream commit ID and
    // if not assign it one based on where we stopped
    const REBASE_COMMIT_MSG_FILE = `${currentExecOpts.repository}/.git/rebase-merge/message`;
    const commitMsg = String(fs.readFileSync(REBASE_COMMIT_MSG_FILE));
    if (!commitMsg.match(/UPSTREAM_COMMIT=/)) {
      fs.writeFileSync(REBASE_COMMIT_MSG_FILE, commitMsg + `\nUPSTREAM_COMMIT=${currentConflict}`);
    }
    // If the commit we edited applies cleanly, then changing the rebase-merge
    // message doesn't work.
    // We can tell if this happened by looking for the amend marker
    let amending = false;
    try {
      fs.statSync(`${currentExecOpts.repository}/.git/rebase-merge/amend`);
      amending = true;
    } catch (e) {
      amending = false;
    }
    if (amending) {
      // In the amending workflow, the msg might not be used in the event the
      // pick part of the edit operation applied cleanly.
      // We manually commit --amend -F .git/rebase-merge/message to force
      // changing the description.
      runInRepository('git commit --amend -F .git/rebase-merge/message');
      // We also know that if we are amending we can short-circuit here and
      // move to the next problem.
      log('Previous commit rebased cleanly.\n');
      gitContinue();
      continue;
    }

    const unresolvedFiles = runInRepository('git diff --name-only --diff-filter=U');
    if (unresolvedFiles.match(/^docs\//gm)) {
      runInRepository('git rm -rf docs/');
    }
    if (unresolvedFiles.match(/^spec\//gm)) {
      runInRepository('git rm -rf spec/');
    }
    if (unresolvedFiles.match(/^meetings\//gm)) {
      runInRepository('git rm -rf meetings/');
    }
    if (unresolvedFiles.match(/^spec\.html/gm)) {
      runInRepository('git rm -f spec.html');
    }
    const filesInUpstreamCommit = runInRepository(
      `git diff-tree --name-only --no-commit-id -r ${currentConflict}`
    ).split('\n');
    if (filesInUpstreamCommit.includes('polyfill/test262')) {
      const currentTest262CommitHash = getTest262Commit('HEAD', 'test262');
      const upstreamTest262CommitHash = getTest262Commit(currentConflict, 'polyfill/test262');
      if (currentTest262CommitHash && upstreamTest262CommitHash) {
        const updated262Commit = getNewestCommit(
          currentTest262CommitHash,
          upstreamTest262CommitHash,
          currentExecOpts.repository + '/test262'
        );
        if (updated262Commit !== currentTest262CommitHash) {
          runInRepository(`(cd test262 && git checkout ${updated262Commit})`);
        }
      }
      try {
        runInRepository('git rm -rf polyfill/test262');
      } catch (e) {
        // Do nothing - this path might not need resolving according to git
        // in this commit.
      }
    }

    // Try and move to the next conflict
    gitContinue();
    const maybeNewConflict = getConflictHash();
    if (maybeNewConflict === currentConflict) {
      log(`Commit needs manual resolution.
To resume automatic rebase, run this tool's "continue" command.
`);
      return;
    }
    currentConflict = maybeNewConflict;
  }
}

function inRebase(): boolean {
  try {
    fs.statSync(`${currentExecOpts.repository}/.git/rebase-merge/`);
    return true;
  } catch (e) {
    return false;
  }
}

// This function de-dupes the logic behind running `git rebase --continue` so all the
// handling is the same and it will be clear to the user how the repository rebase state is changing over time.
function gitContinue() {
  try {
    log('All automated resolution complete. continuing...\n');
    console.log('\n(git)');
    runInRepository('git rebase --continue', { stdio: 'inherit' });
    console.log('(git done)\n');
  } catch (e) {
    // We should ignore this as we know it will basically always fail (as
    // there's likely something else to rebase.)
  }
}

function log(...args: unknown[]) {
  console.log('[Temporal Rebase Tool] ', ...args);
}

function getTest262Commit(parentRepoCommit: string, test262Location = 'test262'): string | undefined {
  const upstreamTest262CommitRaw = runInRepository(`git ls-tree ${parentRepoCommit} ${test262Location}`);
  if (!upstreamTest262CommitRaw) {
    throw new Error(`Unable to find Test262 commit for upstream ${parentRepoCommit}`);
  }
  const unvalidatedTest262 = upstreamTest262CommitRaw.split(/\s+/)[2];
  try {
    child_process.execSync(`git show ${unvalidatedTest262}`, {
      cwd: currentExecOpts.repository + '/test262'
    });
    return unvalidatedTest262;
  } catch (e) {
    return undefined;
  }
}

// TODO type this properly.
function usesRepositoryFlag(builder: any) {
  builder.option('repository', {
    type: 'string',
    describe: 'Where the Temporal polyfill repository is.',
    requiresArg: false
  });
}

let haveSetRepo = false;
function setRepository(repo: string | undefined) {
  if (haveSetRepo) throw new Error("Don't change the repo between executions of the tool!");
  let canonicalizedRepo = path.resolve(path.normalize(repo || './'));
  if (!canonicalizedRepo || canonicalizedRepo === '') {
    throw new Error('Unable to canonicalize repository. Try setting the repository path explicitly using --repository');
  }
  if (canonicalizedRepo[canonicalizedRepo.length - 1] !== '/') {
    canonicalizedRepo += '/';
  }
  try {
    // Check if there is a .git subdir
    // Note that even though canonicalizedRepo already ends in a / it is valid for
    // there to be // as a separator to most fs commands - it will be normalized
    // first down to /. We include the "extra" / in these commands for
    // readability.
    // Eventually we should probably just fix this up to use path.join instead across the
    // whole tool.
    fs.statSync(`${canonicalizedRepo}/.git/`);
  } catch (e) {
    throw new Error(`Repository ${canonicalizedRepo} does not appear to be a Git repository?`);
  }
  currentExecOpts.repository = canonicalizedRepo;
  currentExecOpts.rebaseToolConfigDir = `${currentExecOpts.repository}/.temporal_rebase_tool`;
  fs.mkdirSync(currentExecOpts.rebaseToolConfigDir, { recursive: true });
  log(`Repository directory set to ${currentExecOpts.repository}`);
}

yargs(hideBin(process.argv))
  // TODO this was supposed to allow arbitrary flags / args to be used in some
  // of these commands but that doesn't seem to actually work?
  .parserConfiguration({ 'unknown-options-as-args': true })
  .command(
    '* <start> <end>',
    'Begin rebasing upstream commits',
    (builder) => {
      builder.positional('start', {
        demandOption: true
      });
      builder.positional('end', {
        demandOption: true
      });
      builder.option('onto', {
        type: 'string',
        describe: 'The git commitish to rebase commits on top of.',
        requiresArg: false,
        default: 'HEAD'
      });
      builder.option('exec', {
        type: 'string',
        requiresArg: false,
        default: ''
      });
      // This used to use coerce to do arg checking, but we can't resolve
      // the repo location flag before trying coercion.
      // .coerce(['onto', 'start', 'end'], (arg) => {
      //   return revParse(arg);
      // });
      usesRepositoryFlag(builder);
      //  builder.option('repository', {
      //    type: 'string',
      //    describe: 'Where the Temporal polyfill repository is.',
      //    requiresArg: false,
      //  });
    },
    (argv) => {
      setRepository(argv.repository as string);
      // currentExecOpts.repository = argv.repository as string;
      log('Starting rebase');
      startRebase({
        ontoCommit: revParse(argv.onto as string),
        startCommit: revParse(argv.start as string),
        endCommit: revParse(argv.end as string),
        exec: argv.exec as string
      });
      log('rebasing');
      // At this point, the rebase has started and we are editing the first
      // commit Drop into the continueRebasing looping.
      continueRebasing();
    }
  )
  .command(
    'git-sequence-editor <file>',
    false /** don't show this in the help output */,
    () => {
      // This command doesn't need the repo flag, but eslint doesn't like empty functions so instead
      // we just comment that there's no need to configure the yargs builder for this command.
    },
    (argv) => {
      editSequenceFile(argv.file as string);
    }
  )
  .command(
    'continue',
    'Continue resolving rebase conflicts',
    (builder) => {
      usesRepositoryFlag(builder);
    },
    (argv) => {
      setRepository(argv.repository as string);
      // currentExecOpts.repository = argv.repository as string;
      continueRebasing();
    }
  )
  .command(
    'exec',
    'Runs the exec command saved when starting a rebase using `--exec`, ' +
      "skipping if there aren't changes since the last time tests passed.",
    (builder) => {
      usesRepositoryFlag(builder);
      builder.option('tool', {
        type: 'string',
        describe: 'The difftool to use. See git-difftool for more info.'
      });
      builder.parserConfiguration({ 'unknown-options-as-args': true });
    },
    (argv) => {
      setRepository(argv.repository as string);
      runExec();
    }
  )
  .command(
    'basediff',
    'Show upstream diffs from file.',
    (builder) => {
      usesRepositoryFlag(builder);
      builder.option('tool', {
        type: 'string',
        describe: 'The difftool to use. See git-difftool for more info.'
      });
      builder.parserConfiguration({ 'unknown-options-as-args': true });
    },
    (argv) => {
      setRepository(argv.repository as string);
      const upstreamCommit = getConflictHash();
      if (!upstreamCommit) {
        throw new Error('No upstream commit.');
      }
      const baseCmd = argv.tool ? `git difftool -t '${argv.tool}'` : 'git diff';
      runInRepository(`${baseCmd} ${upstreamCommit}~1 ${upstreamCommit} ${argv._.slice(1).join(' ')}`, {
        stdio: 'inherit'
      });
    }
  )
  .command(
    'showupstream',
    'Shows the entire upstream commit',
    (builder) => {
      usesRepositoryFlag(builder);
    },
    (argv) => {
      setRepository(argv.repository as string);
      // currentExecOpts.repository = argv.repository as string;
      const upstreamCommit = getConflictHash();
      if (!upstreamCommit) {
        throw new Error('No upstream commit.');
      }
      runInRepository(`git show ${upstreamCommit}`, {
        stdio: 'inherit'
      });
    }
  )
  .command(
    'realcmd',
    'Prints out the command needed to re-run this script',
    () => {
      // This command doesn't need the repo flag, but eslint doesn't like empty functions so instead
      // we just comment that there's no need to configure the yargs builder for this command.
    },
    () => {
      console.log(process.argv[0], process.argv[1]);
    }
  )
  .command(
    'abort',
    'Aborts the current rebase, cleaning up any interim state leftover by the tool',
    (builder) => {
      usesRepositoryFlag(builder);
    },
    (argv) => {
      setRepository(argv.repository as string);
      cleanupConfigDir();
      runInRepository('git rebase --abort');
    }
  )
  .command(
    'finish',
    'Finishes out the current rebase by removing all existing to-do rebase operations',
    (builder) => {
      usesRepositoryFlag(builder);
    },
    async (argv) => {
      setRepository(argv.repository as string);
      const rebaseTodoFile = await fsP.open(`${currentExecOpts.repository}/.git/rebase-merge/git-rebase-todo`, 'r+');
      await rebaseTodoFile.truncate();
      // runs git rebase --continue and cleans up the local storage space for the tool
      continueRebasing();
    }
  )
  .command(
    'rebasehelp',
    'Prints a large amount of help about what commands are useful during a rebase and how to use them',
    () => {
      // This command doesn't need the repo flag, but eslint doesn't like empty functions so instead
      // we just comment that there's no need to configure the yargs builder for this command.
    },
    () => {
      log(`
In this help document, we refer to this tool by the alias 'trt'.

At any time during a rebase, you can:
- continue rebasing a single commit and attempt automatic resolution of
  remaining commits using the "continue" command
- view the entire upstream commit object using the "showupstream" command
- view upstream diffs for a particular file using the "basediff" command
  Example:
    \`trt basediff -U40 polyfill/lib/ecmascript.mjs\`
- perform normal git rebase operations (git status, git add, git rm, git
  reset, etc), look at files, etc. The tool exists when you need to take
  action, so you can run any terminal commands you wish.

If you need to stop rebasing for any reason, you have a couple choices:
- abort this rebase (lose your work) using this tool's "abort" command
- finish up the current commit you are rebasing and finish rebasing using this
  tool's "finish" command

Prefer using this tool's commands to finish the rebase (either via "continue",
"abort" or "finish") so the local file storage this tool uses will be cleaned
up.

This tool runs any git commands that might have interactivity directly, and so
lots of the output printed when running tool commands will actually be from
git, not from this tool. To make it easy to distinguish the two, any output
this tool prints is prefixed with [Temporal Rebase Tool].
`);
    }
  )
  .help().argv;
