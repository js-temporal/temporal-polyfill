import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import { env } from 'process';

const isProduction = env.NODE_ENV === 'production';
const libName = 'temporal';

export default [
  {
    input: 'lib/index.mjs',
    plugins: [
      replace({ exclude: 'node_modules/**', __debug__: !isProduction }),
      commonjs(),
      resolve({ preferBuiltins: false }),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled',
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
    ],
    output: [
      {
        name: libName,
        file: './dist/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        name: libName,
        file: './dist/index.umd.js',
        format: 'umd',
        sourcemap: true
      }
    ]
  }
];
