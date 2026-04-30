#!/usr/bin/env bash
# render.sh — inject a call-graph-diff JSON file into the HTML template
#
# Usage:
#   render.sh <json-file> [output-file]
#
# Examples:
#   render.sh call-graph-diff-data.json
#   render.sh /tmp/diff.json ~/Desktop/my-diff.html
#
# The output file defaults to call-graph-diff.html in the current directory.
# The browser opens automatically after writing.

set -euo pipefail

JSON="${1:?Usage: render.sh <json-file> [output-file]}"
OUTPUT="${2:-call-graph-diff.html}"
SKILL_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SKILL_DIR/../examples/call-graph-diff-template.html"

python3 - "$TEMPLATE" "$JSON" "$OUTPUT" <<'EOF'
import sys, json, pathlib

template_path, json_path, output_path = sys.argv[1], sys.argv[2], sys.argv[3]

template = pathlib.Path(template_path).read_text(encoding='utf-8')
data     = pathlib.Path(json_path).read_text(encoding='utf-8')

# Validate JSON before writing
try:
    json.loads(data)
except json.JSONDecodeError as e:
    print(f"ERROR: {json_path} is not valid JSON — {e}", file=sys.stderr)
    sys.exit(1)

PLACEHOLDER = '/* GRAPH_DATA_PLACEHOLDER */'
if PLACEHOLDER not in template:
    print(f"ERROR: placeholder '{PLACEHOLDER}' not found in template", file=sys.stderr)
    sys.exit(1)

result = template.replace(PLACEHOLDER, data)
pathlib.Path(output_path).write_text(result, encoding='utf-8')
print(f"✓ Written to {output_path}")
EOF

# Open in default browser
if command -v open &>/dev/null; then
  open "$OUTPUT"
elif command -v xdg-open &>/dev/null; then
  xdg-open "$OUTPUT"
fi
