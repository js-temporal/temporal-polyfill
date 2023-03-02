
export * from './index';

declare global {
  namespace Intl {

  /**
   * The locale or locales to use
   *
   * See [MDN - Intl - locales
   * argument](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locales_argument).
   */
  type LocalesArgument =
    UnicodeBCP47LocaleIdentifier
    | globalThis.Intl.Locale
    | readonly (UnicodeBCP47LocaleIdentifier | globalThis.Intl.Locale)[]
    | undefined;
  }
}
