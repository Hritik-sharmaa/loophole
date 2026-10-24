#!/usr/bin/env bash
# Can a learner's program reach the network? It must not (ADR-054): from
# inside Piston it could call the API, Piston's package API, or the cloud
# metadata address that hands out the server's credentials. Run on the VPS:
#   bash infra/check-piston-network.sh
# "network: off" is the only good answer.
set -uo pipefail

PISTON=${PISTON:-http://127.0.0.1:2000}
# Tries each address; prints REACHED for any that answers.
CODE='import urllib.request
for url in ["http://api:3001/health", "http://piston:2000/api/v2/runtimes", "http://169.254.169.254/", "https://example.com/"]:
    try:
        urllib.request.urlopen(url, timeout=1)
        print("REACHED", url)
    except Exception:
        pass'
BODY=$(python3 -c 'import json, sys; print(json.dumps({"language": "python", "version": "*", "files": [{"name": "main.py", "content": sys.argv[1]}], "run_timeout": 3000}))' "$CODE")

out=$(curl -sS -X POST "$PISTON/api/v2/execute" -H 'Content-Type: application/json' -d "$BODY")
if grep -q REACHED <<<"$out"; then
  echo "network: ON. Learner code reached:"
  grep -o 'REACHED [^\\"]*' <<<"$out"
  exit 1
fi
if ! grep -q '"run"' <<<"$out"; then
  echo "Piston did not run the check: $out"
  exit 2
fi
echo "network: off"
