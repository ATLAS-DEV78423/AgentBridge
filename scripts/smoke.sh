#!/usr/bin/env bash
# Smoke-tests the compiled CLI (dist/) against a synthetic project:
# scan detects agents, doctor flags a commented config (exit 1),
# fix repairs it in place, doctor then passes. Run `npm run build` first.
# Used by CI on every node version.
set -euo pipefail

CLI="node dist/cli/main.js"
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT

mkdir -p "$T/.claude"
echo "# Rules" > "$T/AGENTS.md"
printf '{ "mcpServers": { "fs": { "command": "npx", "args": ["-y", "fs"] } } }' > "$T/.mcp.json"
printf '{\n  // hand-added comment\n  "model": "m",\n}' > "$T/.claude/settings.json"

# scan: detects the agents present in the synthetic project (display names).
# Output is captured rather than piped into grep -q: the CLI crashes on EPIPE
# when the reader closes the pipe early.
SCAN_OUT=$($CLI scan "$T")
echo "$SCAN_OUT" | grep -q "Detected: Claude Code"
echo "$SCAN_OUT" | grep -q "Detected: grok"

# doctor: the commented strict-JSON config must fail validation (exit 1)
if $CLI doctor "$T" > /dev/null 2>&1; then
  echo "FAIL: doctor should have rejected the commented config"
  exit 1
fi

# fix: rewrites it comment-free inside a backup transaction
$CLI fix "$T" | grep -q "Rollback"
if grep -q "//" "$T/.claude/settings.json"; then
  echo "FAIL: fix left comments behind"
  exit 1
fi
node -e "JSON.parse(require('fs').readFileSync('$T/.claude/settings.json','utf8'))"

# doctor: project is clean now
$CLI doctor "$T" | grep -q "0 error(s)"

echo "smoke OK"
