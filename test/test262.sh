#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -d "tc39" ]; then
  git clone --depth=1 https://github.com/tc39/proposal-temporal.git tc39
else
  cd ./tc39
  git fetch origin
  git merge --ff-only origin/main
fi

cd ../ && TEST262=1 npm run build
cd tc39/polyfill && npm install
if [ ! -z "$TESTS" ]; then
  PRELUDE=../../../dist/script.js npm run test262 "$TESTS"
else
  PRELUDE=../../../dist/script.js npm run test262
fi
