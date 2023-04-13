# Rebasing commits from upstream

In order to stay up to date with changes to the specification, we rebase changes from the upstream repository [`https://github.com/tc39/proposal-temporal`](https://github.com/tc39/proposal-temporal) into our main branch.
This isn't a simple `git merge`, as our repos do not share history (and even if they did would almost never merge cleanly).
To make this rebasing procedue less painful, there's some tooling that can be run to setup and walk through the rebase commit by commit, taking automated actions to resolve more trivial rebase conflicts.

## Background

Some definitions / naming conventions used throughout this doc:

 - `pub`: a git remote naming convention for this repository (js-temporal/temporal-polyfill).
 Note this is probably not your git repository's default upstream, as anyone using the Pull Request model must first push their changes to their own fork repository and open a pull request.
   - `git remote add pub git@github.com:js-temporal/temporal-polyfill.git` to add this remote to your local repository
 - `main`: the local branch name for your repo fork's main branch.
 This should probably track your remote's main branch **not js-temporal/temporal-polyfill's main branch** so you don't accidentally try and push straight to main.
 - `spec-pub`: the upstream Temporal proposal repository.
 This remote is unlikely to be in your local repository, but to perform rebases you will need this remote's content locally.
   - `git remote add spec-pub https://github.com/tc39/proposal-temporal.git` to add this remote to your local repository.

## Getting the latest changes

Make sure that your local copy of both the `pub` and `spec-pub` repositories are up to date:

 - `git fetch pub && git fetch spec-pub`

Make sure your `main` branch is lined up with the `pub` main branch:

- `git checkout main && git merge --ff-only pub/main`

Running `git log` should now show your local `main` branch is pointed to the same commit as `pub/main`:

 - ```shell
   $ git log
   commit <commit hash here> (HEAD, pub/main, main)
   ```

Initialize the test262 submodule if you haven't before:

 - `git submodule update`

Using the git log, determine the most recent upstream commit that was successfully migrated over using this tooling.
Each commit migrating using this tooling will add `UPSTREAM_COMMIT=<hash>` to a rebased commit description:

 - `git log --grep 'UPSTREAM_COMMIT=' pub/main`, take note of the commit hash from the description (not the hash of the commit itself).
 Example:
 ```
 commit c0f7349a327b68543797d38e045b1fd8c1e0949b
Author: Philip Chimento <pchimento@igalia.com>
Date:   Tue Sep 27 16:04:44 2022 -0700

    Avoid precision loss in AddDuration
    
    According to the spec, the addition in AddDuration must not be performed
    in the floating-point domain. Anba wrote some tests that verify this.
    
    For days, d1 + d2 practically speaking is still OK because the result is
    directly stuffed into a float64-representable integer anyway, so keep that
    the same for simplicity. Perform the other additions in the BigInt domain
    and pass BigInts to BalanceDuration.
    
    UPSTREAM_COMMIT=9a0565a8cba336a6dabbf10cc58ccbf665bfe023
 ```
 The upstream commit hash is `9a0565a8cba336a6dabbf10cc58ccbf665bfe023`.
 We refer to this hash throughout the rest of this document as LATEST_UPSTREAMED_COMMIT.
 Consider exporting this value in your terminal so you can reference it later in commands: `export LATEST_UPSTREAMED_COMMIT=<value>`

Install the rebase-tools dependencies:

 - `cd tools && npm ci`

Check that you can run the tool:

 - `npx ts-node rebase-upstream-commits.ts` should print out the tool's command-line help.

Throughout this document, we refer back to this command as `trt`, and we recommend you add an alias to your current terminal window that can run the tool:

 - `alias trt="$(npx ts-node rebase-upstream-commits.ts realcmd)"`
 - TODO(12wrigja): Determine how likely it is that the live-paths here are a problem in practice.

## Rebasing Guidelines

Rebasing changes from the spec repository into this one follows some general rules:

 - where possible, we don't change the runtime behaviour of the code, and make this work by adapting TS types to fit.
 Sometimes this doesn't quite work or there are other restrictions that superceed this.
   - Where it is impossible to write correctly-typechecking TS, we will sometimes make use of `assertExists` and `uncheckedAssertNarrowedType` to influence the type-checker ([example](https://github.com/js-temporal/temporal-polyfill/blob/9d68d0cd304f730d598c6bad3712d263359ffb0e/lib/plaindate.ts#L251-L254)).
   - TS does not recognize that types have changed as a result of re-assigning over a local variable (or function parameter), and this is typically a common source of type-checking problems.
     - For function parameters, we instead rename the parameter to include a `Param` suffix, and then create a local variable of the same name that can be set to the right type
     Example:

     ```js
     // Code upstream
     static compare(one, two) {
     one = ES.ToTemporalDate(one);
     ```
     
     becomes

     ```ts
     static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
       // We rename the function parameter and re-use the old name so the variable's type is correctly narrowed as a result of calling `ToTemporalDate`
       const one = ES.ToTemporalDate(oneParam);
     ```
 - Avoid adding dependencies to the polyfill.
 - upstream changes to `polyfill/lib/ecmascript.mjs` will always fail to rebase onto `lib/ecmascript.ts` because the files are now substantially different: the former defines exported functions as properties in an object, while the latter treats them as regular module exports. 
 - We use `JSBI` for bigint compatibility, not upstream's `big-integer`, as `JSBI` accurately represents the runtime semantic differences between native `number` and `bigint` operations, resulting in type-checking errors where mixing `number` and `JSBI` occurs.
 It also has support for build-time transpilation of JSBI calls down to native BigInt.
   - The two libraries are mostly functionally equivalent, with some functions on `big-integer` objects being replaced with functions exported in `ecmascript.ts` (divmod, abs, etc).
 - We keep the code organized in the same files as upstream, to make rebasing easier.
 Please don't create arbitrary new files for the sake of code organization.

## Rebasing

 - Decide how much of the upstream commits you want to rebase:
   - From the repository root, run `git log $LATEST_UPSTREAMED_COMMIT..spec-pub/main --oneline -- ./polyfill/` to see a list of all likely-outstanding commits to rebase.
   Consider using `| wc -l` to count the list, and try to create rebase PRs that are no more than 20 or 30 commits long or particularly complex, to make it easier on both your reviewers and yourself.
   Pick a commit hash from this list, now denoted as `TARGET_UPSTREAM_COMMIT`.
   Consider exporting this value in your terminal so you can reference it later in commands: `export TARGET_UPSTREAM_COMMIT=<value>`
 - Decide what sort of automated testing should be done in between commits, and create a temporary script to run to test those things.
   - For example, if you want to validate that the code builds, is lint free, and passes most of the CI tests, an example `test.sh` script might be
     ```sh
     #!/bin/bash
     set -e
     npm run build
     npm run lint
     npm run test
     npm run test262
     ```
 - Using the rebase tool command from earlier, start the rebase:
   - `trt $LATEST_UPSTREAMED_COMMIT $TARGET_UPSTREAM_COMMIT --onto pub/main`
   - Add `--exec=<command or script>` if you want to run a command after each substantial change to the repo during the rebase.
   To continue the example from above: `--exec=./test.sh` would cause the tool to run that test script after every substantial change to the repo.
 - This will automatically queue up a git interactive rebase with all the relevant commits and start to work through them one by one, using the interactive rebase's 'edit' option on each commit to allow the tool a chance to inspect and edit each commit.
  - The tool will:
    - Automatically resolve rebase conflicts where possible, including
      - removing docs/ and spec/ from upstream which we don't use in this repo
      - Automatically updating the test262 subrepo commit if a newer commit is seen in upstream
      - automatically appending the relevant UPSTREAM_COMMIT "tag" in the commit description
 - While the tool does use a normal Git interactive rebase, it is best to **resume** the rebase (once merge conflicts are resolved) by running the tool's `continue` command (`trt continue`), as that will take over rebasing until the next set of "real" merge conflicts.
  - While rebasing some useful commands to note:
    - `trt showupstream` will show the upstream change in its entirety, including all files changed and the commit description.
    - `trt basediff` will show just file diffs from the upstream change. This can be particularly useful for larger files (like ecmascript.mjs) where the small diffs shown by the `showupstream` command are not enough detail.
      - Example: `trt basediff -U40 -- polyfill/lib/ecmascript.mjs` for the upstream diff in `ecmascript.mjs` with 40 unified diff lines on each side of a change. 
 - You might decide halfway through to finish where you are at with the current rebase and continue later in another Pull Request.
 One way to do this is to finish rebasing the current commit, but before running `trt continue` to instead clear out the git rebase todo list:
   - `git rebase --edit-todo` and then delete all the lines listed.
   - Save that file, quit the editor, and then run `trt continue`.
   - The rebase should now finish, and `git status` will show you in a "detached HEAD" state.
   - Create a branch at that new commit to save all your hard work! `git checkout -b <my branch name here>`.

 ## Code Review

 When opening a rebasing PR, please add [@12wrigja](https://github.com/12wrigja) as a reviewer.

 We have GitHub Actions CI checks that validate the extensive Test262 test suite will still pass with any changes, as well as some linters and static analysis tools to help keep the codebase reasonably clean.

 Some general code-review tips:
  - Avoid using TypeScript's `any` type.
  If you aren't sure what types to use, feel free to use `any` and then request help in the code review from the reviewers to suggest fixes to the types.
  - Try and avoid force-pushing new commits to the PR branch once a review has been started, and instead use [fixup commits](https://git-scm.com/docs/git-commit/) (search this page for 'fixup'), as the GitHub review UI handles this scenario better.

    - Example: `git commit --fixup <commit hash to fix>`

    Once all review comments are addressed, you will need to rebase that branch using autosquash to merge your fixes into the relevant commits, without squashing the overall commit history itself:

    - ```
      git rebase -i main --autosquash
      ```
    - without changing anything in the interactiv editor, save the file and quit the editor. This will squash all the fixup commits away while leaving the rest of the commit history intact.
    - Now, your branch will require force-pushing, and this is OK.
    - Once the branch structure looks good, a maintainer will merge (not squash) the PR into the main branch (to retain the commit history).
