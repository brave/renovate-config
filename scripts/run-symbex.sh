#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npx tsc -p tsconfig.symbolic.json

echo "Building symbex image (cached layers keep this fast)"
docker build -t renovate-config-symbex - < Dockerfile.symbex >/dev/null

failed=0

for driver in symbolic/*.driver.js; do
  echo "=== Symbolic driver: $driver"
  if ! docker run --rm -v "$PWD":/work renovate-config-symbex "/work/$driver"; then
    echo "!!! Symbolic driver failed: $driver"
    failed=1
  fi
done

exit "$failed"
