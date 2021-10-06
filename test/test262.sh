#!/bin/bash
# Note that this script is only expected to be run via `npm run test262`, not by
# being manually executed.
set -e

TESTS=${TESTS:-"*/Temporal/**/*.js"}
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
