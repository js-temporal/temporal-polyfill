#!/bin/bash
set -e

TESTS=${@:-"**/*.js"}
TIMEOUT=${TIMEOUT:-10000}

if [ "$(uname)" = 'Darwin' ]; then
  threads=$(sysctl -n hw.logicalcpu)
else
  threads=$(nproc --ignore 1)
fi
if [ $threads -gt 8 ]; then threads=8; fi

cd "$(dirname "$0")"/../test262/test/
test262-harness \
  -t $threads \
  -r json \
  --reporter-keys file,rawResult,result,scenario \
  --test262Dir .. \
  --prelude "../../dist/script.js" \
  --timeout "$TIMEOUT" \
  --preprocessor ../../test/preprocessor.test262.cjs \
  "*/Temporal/$TESTS" \
  | ../../test/parseResults.js
