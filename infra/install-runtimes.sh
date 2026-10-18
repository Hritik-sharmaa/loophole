#!/usr/bin/env bash
# Installs the language runtimes Loophole grades with into Piston.
# Run on the VPS after the stack is up (docs/DEPLOY.md); safe to run again.
# Runtimes live in the piston-packages volume, so this is needed once.
set -euo pipefail

PISTON=${PISTON:-http://127.0.0.1:2000}
# Same version as local development, so grading behaves the same.
RUNTIMES=("python 3.12.0")

for entry in "${RUNTIMES[@]}"; do
  read -r language version <<<"$entry"
  if curl -fsS "$PISTON/api/v2/runtimes" | grep -q "\"language\":\"$language\",\"version\":\"$version\""; then
    echo "$language $version: already installed"
    continue
  fi
  echo "$language $version: installing (takes a minute)..."
  curl -fsS -X POST "$PISTON/api/v2/packages" \
    -H 'Content-Type: application/json' \
    -d "{\"language\":\"$language\",\"version\":\"$version\"}"
  echo
done

echo "Installed runtimes:"
curl -fsS "$PISTON/api/v2/runtimes"
echo
