import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import { env } from 'process';
import pkg from './package.json';

const isPlaygroundBuild = !!env.TEMPORAL_PLAYGROUND;
const isTest262 = !!env.TEST262;
const isProduction = env.NODE_ENV === 'production' && !isTest262;
const libName = 'temporal';

const plugins = [
  typescript({
    typescript: require('typescript')
  }),
  replace({ exclude: 'node_modules/**', 'globalThis.__debug__': !isTest262 && !isProduction, preventAssignment: true }),
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

let builds = [
  {
    input,
    external,
    output: [
      // ESM bundle
      outputEntry(pkg.module, 'es'),
      // CJS bundle.
      // Note that because package.json specifies "type":"module", the name of
      // this file MUST end in ".cjs" in order to be treated as a CommonJS file.
      outputEntry(pkg.main, 'cjs')
    ],
    plugins
  },
  {
    input,
    // UMD bundle for using in script tags, etc
    // Note that some build systems don't like reading UMD files if they end in
    // '.cjs', so this entry in package.json should end in a .js file extension.
    output: [outputEntry(pkg.browser, 'umd')],
    plugins
  }
];

if (isTest262) {
  builds = [
    {
      input: 'lib/init.ts',
      output: {
        name: libName,
        file: 'dist/script.js',
        format: 'iife',
        sourcemap: true
      },
      plugins
    }
  ];
}

if (isPlaygroundBuild) {
  builds = [
    {
      input: 'lib/init.ts',
      output: {
        name: libName,
        file: 'dist/playground.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      plugins
    }
  ];
}

export default builds;
