# Release Checklist

- Run `npm test` to make sure that everything works
- Determine next version number (0.1.0 → 0.2.0 for breaking changes, 0.1.0 → 0.1.1 for non-breaking changes)
- Increment the version number in `package.json`
- Open a pull request with the above change, and get it rubber-stamped
- Update your local `main` branch after the pull request is merged
- Prepare changelog ([example](https://github.com/js-temporal/temporal-polyfill/releases/tag/v0.2.0))
  - Look at the log (e.g. `git log -p v0.1.0..`)
  - Summarize the major changes
  - Thank everyone who contributed to the release (e.g. `git shortlog v0.1.0..` to see the contributors)
- Create the new release on GitHub https://github.com/js-temporal/temporal-polyfill/releases/new
  - Don't forget the `v` in the version tag, e.g. `v0.2.0`
  - Check the "This is a pre-release" box unless we've decided to release a production version
- Run `npm publish` to publish the release to NPM
  - This requires two-factor authentication to be active on your NPM account
