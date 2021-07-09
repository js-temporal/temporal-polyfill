import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import { env } from 'process';
import pkg from './package.json';

const isProduction = env.NODE_ENV === 'production';
const libName = 'temporal';

const plugins = [
  typescript({
    typescript: require('typescript')
  }),
  replace({ exclude: 'node_modules/**', 'globalThis.__debug__': !isProduction, preventAssignment: true }),
  resolve({ preferBuiltins: false }),
  commonjs(),
  babel({
    exclude: 'node_modules/**',
    babelHelpers: 'external',
    presets: [
      [
        '@babel/preset-env',
        {
          targets: '> 0.25%, not dead'
        }
      ]
    ]
  }),
  isProduction && terser()
].filter(Boolean);

const input = 'lib/index.ts';

const external = [
  // Some dependencies (e.g. es-abstract) are imported using sub-paths, so the
  // regex below will match these imports too
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
].map((dep) => new RegExp(dep + '*'));

function outputEntry(file, format) {
  return {
    name: libName,
    file,
    format,
    exports: 'named',
    sourcemap: true
  };
}

export default [
  {
    input,
    external,
    output: [outputEntry(pkg.module, 'es'), outputEntry(pkg.main, 'cjs')],
    plugins
  },
  {
    input,
    output: [outputEntry(pkg.browser, 'umd'), outputEntry(pkg.module.replace('.esm', '.browser.esm'), 'es')],
    plugins
  }
];
