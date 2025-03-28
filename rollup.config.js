import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import replace from '@rollup/plugin-replace';
import strip from '@rollup/plugin-strip';
import terser from '@rollup/plugin-terser';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { env } from 'process';

// Uncomment and replace the code below once all supported Node versions work with import assertions. See
// pawelgrzybek.com/all-you-need-to-know-to-move-from-commonjs-to-ecmascript-modules-esm-in-node-js/#importing-json
// import pkg from './package.json' assert { type: 'json' };
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const isPlaygroundBuild = !!env.TEMPORAL_PLAYGROUND;
const isTest262Build = !!env.TEST262;
const isProduction = env.NODE_ENV === 'production';
const isTranspiledBuild = !!env.TRANSPILE;
const libName = 'temporal';

function withPlugins(
  options = {
    babelConfig: undefined,
    optimize: false,
    debugBuild: true,
    enableAssertions: true,
    minifyNames: false
  }
) {
  const basePlugins = [
    replace({ exclude: 'node_modules/**', 'globalThis.__debug__': options.debugBuild, preventAssignment: true }),
    replace({
      exclude: 'node_modules/**',
      'globalThis.__enableAsserts__': options.enableAssertions,
      preventAssignment: true
    }),
    commonjs(),
    nodeResolve({ preferBuiltins: false }),
    sourcemaps()
  ];
  if (options.babelConfig) {
    if (!options.babelConfig.inputSourceMap) {
      options.babelConfig.inputSourceMap = true;
    }
    basePlugins.push(babel(options.babelConfig));
  }
  if (!options.enableAssertions) {
    basePlugins.push(
      strip({
        functions: ['assert', 'assertNotReached', 'assertExists', 'ES.assertExists']
      })
    );
  }
  if (options.optimize) {
    basePlugins.push(
      terser({
        keep_classnames: true,
        keep_fnames: !options.minifyNames,
        ecma: 2015,
        compress: {
          keep_fargs: true,
          keep_classnames: true,
          keep_fnames: !options.minifyNames,
          passes: 2
        },
        mangle: {
          keep_classnames: true,
          keep_fnames: !options.minifyNames
        }
      })
    );
  }
  return basePlugins;
}

const input = 'tsc-out/index.js';

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

const es5BundleBabelConfig = {
  babelHelpers: 'bundled',
  presets: [
    [
      '@babel/preset-env',
      {
        targets: '> 0.25%, not dead, ie 11'
      }
    ]
  ]
};

let builds = [];

if (isTest262Build) {
  builds = [
    {
      input: 'tsc-out/init.js',
      output: {
        name: libName,
        file: 'dist/script.js',
        format: 'iife',
        sourcemap: true
      },
      plugins: withPlugins({
        debugBuild: false, // Disable other debug features that can break test262 tests
        enableAssertions: true, // But enable assertions
        optimize: isProduction,
        babelConfig: isTranspiledBuild ? es5BundleBabelConfig : undefined
      })
    }
  ];
} else if (isPlaygroundBuild) {
  builds = [
    {
      input: 'tsc-out/init.js',
      output: {
        name: libName,
        file: 'dist/playground.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      },
      plugins: withPlugins({})
    }
  ];
} else {
  // Production / production-like builds

  // - an ES2020 CJS bundle for "main"
  // - an ES2020 ESM bundle for "module"
  // Note that all dependencies are marked as external and won't be included in
  // these bundles.
  const modernBuildDef = {
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
    plugins: withPlugins({
      debugBuild: !isProduction,
      enableAssertions: !isProduction,
      optimize: isProduction,
      minifyNames: isProduction
      // Here is where we could insert the JSBI -> native BigInt plugin if we
      // could find a way to provide a separate bundle for modern browsers
      // that can use native BigInt.
      // Maybe use node's exports + a user-defined condition?
      // https://nodejs.org/api/packages.html#resolving-user-conditions
    })
  };
  // A legacy build that
  // - bundles all our dependencies (big-integer) into this file
  // - transpiles down to ES5
  const legacyUMDBuildDef = {
    input,
    // UMD bundle for using in script tags, etc
    // Note that some build systems don't like reading UMD files if they end in
    // '.cjs', so this entry in package.json should end in a .js file extension.
    output: [outputEntry(pkg.browser, 'umd')],
    plugins: withPlugins({
      debugBuild: !isProduction,
      enableAssertions: !isProduction,
      optimize: isProduction,
      babelConfig: es5BundleBabelConfig
    })
  };
  builds = [modernBuildDef, legacyUMDBuildDef];
}

export default builds;
