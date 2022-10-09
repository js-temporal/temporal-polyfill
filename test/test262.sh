#!/usr/bin/env bash
# Note that this script is only expected to be run via `npm run test262`, not by
# being manually executed.
set -e
TESTS_FROM_ENV="$TESTS"
TESTS="*/Temporal/**/*.js"
if [ $# -ne 0 ]; then
  TESTS="*/Temporal/$@";
elif [ ! -z "$TESTS_FROM_ENV" ]; then
  # VSCode launch.json passes the full path to the current file in some cases,
  # so pass that on.
  if [[ "$TESTS_FROM_ENV" =~ ^/.* ]]; then
    TESTS="$TESTS_FROM_ENV";
  else
    TESTS="*/Temporal/$TESTS_FROM_ENV";
  fi
fi

TIMEOUT=${TIMEOUT:-10000}

if [ "$(uname)" = 'Darwin' ]; then
  threads=$(sysctl -n hw.logicalcpu)
else
  threads=$(nproc --ignore 1)
fi
if [ $threads -gt 8 ]; then threads=8; fi

if [ ! -d "$(dirname "$0")"/../test262/test/ ]; then
  echo "Missing Test262 directory. Try initializing the submodule with 'git submodule init && git submodule update'";
  exit 1;
fi

cd "$(dirname "$0")"/../test262/test/
test262-harness \
  -t $threads \
  -r json \
  --reporter-keys file,rawResult,result,scenario \
  --test262Dir .. \
  --prelude "../../dist/script.js" \
  --timeout "$TIMEOUT" \
  --preprocessor ../../test/preprocessor.test262.cjs \
  "$TESTS" \
  | ../../test/parseResults.js
