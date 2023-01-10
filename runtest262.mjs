import runTest262 from '@js-temporal/temporal-test262-runner';

const isProduction = process.env.NODE_ENV === 'production';
const isTranspiledBuild = !!process.env.TRANSPILE;

const expectedFailureFiles = ['test/expected-failures.txt'];
if (isProduction) {
  expectedFailureFiles.push(isTranspiledBuild ? 'test/expected-failures-es5.txt' : 'test/expected-failures-opt.txt');
}

const nodeVersion = parseInt(process.versions.node.split('.')[0]);
if (nodeVersion < 18) expectedFailureFiles.push('test/expected-failures-before-node18.txt');
if (nodeVersion < 16) expectedFailureFiles.push('test/expected-failures-before-node16.txt');

// As we migrate commits from proposal-temporal, remove expected failures from here.
expectedFailureFiles.push('test/expected-failures-todo-migrated-code.txt');

const result = runTest262({
  test262Dir: 'test262',
  polyfillCodeFile: 'dist/script.js',
  expectedFailureFiles,
  testGlobs: process.argv.slice(2)
});

process.exit(result ? 0 : 1);
