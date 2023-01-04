/*
 ** Copyright (C) 2018-2019 Bloomberg LP. All rights reserved.
 ** This code is governed by the license found in the LICENSE file.
 */

import fs from 'fs';
const PKG = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf-8' }));
export function resolve(specifier, context, defaultResolve) {
  if (specifier === PKG.name) {
    specifier = new URL('../tsc-out/temporal.js', import.meta.url).toString();
  } else if (specifier.startsWith('../lib')) {
    specifier = new URL(specifier.replace('../lib/', '../tsc-out/'), import.meta.url).toString();
    if (!specifier.endsWith('.js')) specifier += '.js';
  } else if (
    context.parentURL &&
    context.parentURL.includes('/tsc-out/') &&
    specifier.startsWith('./') &&
    !specifier.endsWith('.js')
  ) {
    specifier += '.js';
  }
  return defaultResolve(specifier, context);
}
