export * from './index';

declare global {
  // `Intl.LocalesArgument` type was recently added to TS — polyfilled here via `typesVersions` in `package.json` for
  // compatibility with TS versions older than v4.7.4.
  // TODO: Revisit/remove once TS >= v4.7.4 is widespread enough.
  namespace Intl {
    /**
     * The locale or locales to use
     *
     * See [MDN - Intl - locales
     * argument](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locales_argument)
     */
    type LocalesArgument =
      | UnicodeBCP47LocaleIdentifier
      | globalThis.Intl.Locale
      | readonly (UnicodeBCP47LocaleIdentifier | globalThis.Intl.Locale)[]
      | undefined;
  }
}
