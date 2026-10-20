#!/usr/bin/env bash
# Installs the language runtimes Loophole grades with into Piston.
# Run on the VPS after the stack is up (docs/DEPLOY.md); safe to run again.
# Runtimes live in the piston-packages volume, so this is needed once.
set -euo pipefail

PISTON=${PISTON:-http://127.0.0.1:2000}
# Same versions as local development, so grading behaves the same.
# "node" is Piston's package for the JavaScript course (language
# "javascript", ADR-025).
RUNTIMES=("python 3.12.0" "node 20.11.1")

for entry in "${RUNTIMES[@]}"; do
  read -r language version <<<"$entry"
  # Check the package list, not the runtimes: a package's runtime can have
  # another name (the "node" package runs language "javascript").
  if curl -fsS "$PISTON/api/v2/packages" | grep -q "\"language\":\"$language\",\"language_version\":\"$version\",\"installed\":true"; then
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
