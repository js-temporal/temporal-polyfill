# Release Checklist

- Run `npm test` and `npm run test262` to make sure that everything works, or
  check that the current commit at which you are going to cut a release has a
  passing set of GitHub Actions checks.
- Determine next version number (0.1.0 → 0.2.0 for breaking changes, 0.1.0 → 0.1.1 for non-breaking changes)
- Increment the version number in `package.json`
- Update the CHANGELOG.md file ([example](https://github.com/js-temporal/temporal-polyfill/blob/5df9d9f659b5fe2f8f051f12e2e9fd5f81e81b2d/CHANGELOG.md))
  - Look at the log (e.g. `git log -p <latest-release-version-here>..`)
  - Summarize the major changes, grouping changes into bug fixes, non-breaking
    changes, and other.
    - Don't forget to linkify commit references in [CHANGELOG.md](./CHANGELOG.md). Specify all the commit URLS as [link labels](https://spec.commonmark.org/0.30/#link-label), and add all the links as [link reference definitions](https://spec.commonmark.org/0.30/#link-reference-definition) to the very end of the changelog. To quickly generate all the link refereces in the doc, try using `grep`:
      - `cat CHANGELOG.md | grep -oP '(?<=\[)([a-z0-9]{8})(?=\])' | xargs -I{} bash -c 'echo "[{}]: https://github.com/js-temporal/temporal-polyfill/commit/$(git rev-parse {})"'`
    - It's nice to include links back to the original proposal-temporal PRs when possible. To search through commit messages for relevant links, try `cat CHANGELOG.md | grep -oP '(?<=^\[)([a-z0-9]{8})(?=\])' | xargs -I{} bash -c 'git log --format=%B -n 1 {} | grep "tc39/proposal-temporal" && echo {}'`, which will print out all links **followed by** the relevant commit short ref.
- Open a pull request with the above change, get it approved, and merge it into
  `main`
- Create the new release on GitHub https://github.com/js-temporal/temporal-polyfill/releases/new
  - In the release description, include a permalink to the CHANGELOG.md file at the commit created earlier.
  - Thank everyone who contributed to the release (e.g. `git shortlog <old-version-tag>..<new-version-tag>` to see the contributors)
  - Make the release target point at the commit created above (or, for a patch
    release, create a branch with the release commit + the relevant
    cherry-picked commits and use that as the target).
  - In the "Choose a Tag" dropdown, type the new version identifier to create a
    tag in the repository when the release is published. Don't forget the `v` in the version tag, e.g. `v0.2.0`.
  - Check the "This is a pre-release" box unless we've decided to release a production version.
  - Publish the release. Note, you can leave the release as draft and ask other
    maintainers to spot-check the release if you wish before publishing.
- Once the GitHub release has been published, update your local repository (`git fetch <remote name> --all`) to pull in the newly created tag. Checkout this
  tag (`git checkout v<new-release-tag>`), and make sure your working directory
  is clean.
- Run `NODE_ENV=production npm publish` to publish the release to NPM. Note this
  will publish whatever version is specified in the package.json file in your working directory, so be sure this matches your intended version to release (this should have been
  checked in code-review when creating the Release commit, and if this is
  incorrect would indicate the created Tag is wrong).
  - This requires two-factor authentication to be active on your NPM account
  - Setting `NODE_ENV` is important: without this, package content will not be
    minified.
