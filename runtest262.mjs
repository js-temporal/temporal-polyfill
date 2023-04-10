import runTest262 from '@js-temporal/temporal-test262-runner';
import yargs from 'yargs';
import * as process from 'process';
import { hideBin } from 'yargs/helpers';

const isProduction = process.env.NODE_ENV === 'production';
const isTranspiledBuild = !!process.env.TRANSPILE;
const timeoutMsecs = process.env.TIMEOUT || undefined;

yargs(hideBin(process.argv))
  .command(
    '*',
    'Run test262 tests',
    (builder) => {
      builder.option('update-expected-failure-files', {
        requiresArg: false,
        default: false,
        type: 'boolean',
        description: 'Whether to update the existing expected-failure files on-disk and remove tests that now pass.'
      });
    },
    (parsedArgv) => {
      const expectedFailureFiles = ['test/expected-failures.txt'];
      if (isProduction) {
        expectedFailureFiles.push(
          isTranspiledBuild ? 'test/expected-failures-es5.txt' : 'test/expected-failures-opt.txt'
        );
      }

      const nodeVersion = parseInt(process.versions.node.split('.')[0]);
      if (nodeVersion < 18) expectedFailureFiles.push('test/expected-failures-before-node18.txt');
      if (nodeVersion < 16) expectedFailureFiles.push('test/expected-failures-before-node16.txt');
      // Eventually this should be fixed and this condition should be updated.
      if (nodeVersion >= 18) expectedFailureFiles.push('test/expected-failures-cldr42.txt');

      // As we migrate commits from proposal-temporal, remove expected failures from here.
      expectedFailureFiles.push('test/expected-failures-todo-migrated-code.txt');

      const result = runTest262({
        test262Dir: 'test262',
        polyfillCodeFile: 'dist/script.js',
        expectedFailureFiles,
        testGlobs: parsedArgv._,
        timeoutMsecs,
        updateExpectedFailureFiles: parsedArgv.updateExpectedFailureFiles
      });

      process.exit(result ? 0 : 1);
    }
  )
  .help().argv;
