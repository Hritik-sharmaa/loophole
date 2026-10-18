#!/usr/bin/env bash
# ADR-018 re-test: does this Piston survive overlapping jobs? Locally
# (Docker Desktop) about half of parallel runs crashed the sandbox.
# Run on the VPS: bash infra/check-piston-concurrency.sh
# If every parallel run passes, PistonClient may run jobs in parallel.
set -uo pipefail

PISTON=${PISTON:-http://127.0.0.1:2000}
ROUNDS=${ROUNDS:-10}
JOBS=${JOBS:-4}
BODY='{"language":"python","version":"*","files":[{"name":"main.py","content":"print(\"Hello, Loophole!\")"}],"run_timeout":3000}'
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

run_once() {
  curl -fsS -X POST "$PISTON/api/v2/execute" -H 'Content-Type: application/json' -d "$BODY" >"$1" 2>/dev/null
}

check() {
  local mode=$1 ok=0 total=0 started=$SECONDS
  for ((round = 0; round < ROUNDS; round++)); do
    for ((job = 0; job < JOBS; job++)); do
      if [[ $mode == parallel ]]; then
        run_once "$tmp/$job" &
      else
        run_once "$tmp/$job"
      fi
    done
    wait
    for ((job = 0; job < JOBS; job++)); do
      total=$((total + 1))
      grep -q '"stdout":"Hello, Loophole!\\n"' "$tmp/$job" && ok=$((ok + 1))
    done
  done
  echo "$mode: $ok/$total runs passed in $((SECONDS - started)) s"
}

check sequential
check parallel
