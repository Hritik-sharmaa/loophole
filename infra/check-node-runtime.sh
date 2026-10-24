#!/usr/bin/env bash
# ADR-025 re-test: does Node start fast enough for the 3 s run limit?
# Locally (Docker Desktop) Node sometimes took over 3 s of wall clock to
# start, which grades as a time-out. Run on the VPS:
#   bash infra/check-node-runtime.sh
# Every run passing with the slowest well under 3 s means the limit stays.
set -uo pipefail

PISTON=${PISTON:-http://127.0.0.1:2000}
RUNS=${RUNS:-20}
BODY='{"language":"javascript","version":"*","files":[{"name":"main.js","content":"console.log(\"Hello, Loophole!\")"}],"run_timeout":3000}'
out=$(mktemp)
trap 'rm -f "$out"' EXIT

ok=0
timeouts=0
times=()
for ((i = 0; i < RUNS; i++)); do
  t=$(curl -sS -o "$out" -w '%{time_total}' -X POST "$PISTON/api/v2/execute" \
    -H 'Content-Type: application/json' -d "$BODY")
  times+=("$t")
  if grep -q '"stdout":"Hello, Loophole!\\n"' "$out"; then
    ok=$((ok + 1))
  elif grep -q '"status":"TO"' "$out"; then
    timeouts=$((timeouts + 1))
  fi
done

printf '%s\n' "${times[@]}" | sort -n | awk -v ok="$ok" -v to="$timeouts" -v n="$RUNS" '
  { t[NR] = $1; sum += $1 }
  END {
    printf "node: %d/%d passed, %d timed out\n", ok, n, to
    printf "request time: fastest %.2f s, average %.2f s, slowest %.2f s\n", t[1], sum / NR, t[NR]
  }'
