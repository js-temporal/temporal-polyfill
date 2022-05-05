# Release Checklist

- Run `npm test` to make sure that everything works
- Determine next version number (0.1.0 → 0.2.0 for breaking changes, 0.1.0 → 0.1.1 for non-breaking changes)
- Increment the version number in `package.json`
- Open a pull request with the above change, and get it rubber-stamped
- Update your local `main` branch after the pull request is merged
- Prepare changelog ([example](https://github.com/js-temporal/temporal-polyfill/releases/tag/v0.2.0))
  - Look at the log (e.g. `git log -p v0.1.0..`)
  - Summarize the major changes
    - Don't forget to linkify commit references in [CHANGELOG.md](./CHANGELOG.md). Specify all the commit URLS as [link labels](https://spec.commonmark.org/0.30/#link-label), and add all the links as [link reference definitions](https://spec.commonmark.org/0.30/#link-reference-definition) to the very end of the changelog. To quickly generate all the link refereces in the doc, try using `grep`:
      - `cat CHANGELOG.md | grep -oP '(?<=\[)([a-z0-9]{8})(?=\])' | xargs -I{} bash -c 'echo "[{}]: https://github.com/js-temporal/temporal-polyfill/commit/$(git rev-parse {})"'`
    - It's nice to include links back to the original proposal-temporal PRs when possible. To search through commit messages for relevant links, try `cat CHANGELOG.md | grep -oP '(?<=^\[)([a-z0-9]{8})(?=\])' | xargs -I{} bash -c 'git log --format=%B -n 1 {} | grep "tc39/proposal-temporal" && echo {}'`, which will print out all links **followed by** the relevant commit short ref.
  - Thank everyone who contributed to the release (e.g. `git shortlog v0.1.0..` to see the contributors)
- Create the new release on GitHub https://github.com/js-temporal/temporal-polyfill/releases/new
  - Don't forget the `v` in the version tag, e.g. `v0.2.0`
  - Check the "This is a pre-release" box unless we've decided to release a production version
- Run `NODE_ENV=production npm publish` to publish the release to NPM
  - This requires two-factor authentication to be active on your NPM account
  - Setting `NODE_ENV` is important: without this, package content will not be
    minified.
