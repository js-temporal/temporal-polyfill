import runTest262 from '@js-temporal/temporal-test262-runner';

const isProduction = process.env.NODE_ENV === 'production';
const isTranspiledBuild = !!process.env.TRANSPILE;

const expectedFailureFiles = ['test/expected-failures.txt'];
if (isProduction) {
  expectedFailureFiles.push(isTranspiledBuild ? 'test/expected-failures-es5.txt' : 'test/expected-failures-opt.txt');
}

const result = runTest262({
  test262Dir: 'test262',
  polyfillCodeFile: 'dist/script.js',
  expectedFailureFiles,
  testGlobs: process.argv.slice(2)
});

process.exit(result ? 0 : 1);
