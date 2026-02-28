#!/usr/bin/env bash
# Check for upstream commits in mitsuhiko/agent-stuff/pi-extensions that are
# newer than the last time any vendored extension was updated locally.
#
# Vendored files are detected by parsing the curl lines in extensions/Makefile.

set -e

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
MAKEFILE="$REPO_ROOT/extensions/Makefile"

# Extract vendored filenames from the install target's curl lines
VENDORED_FILES=$(grep -oE 'pi-extensions/[^[:space:]]+\.ts' "$MAKEFILE" \
  | sed 's|pi-extensions/|extensions/|')

if [ -z "$VENDORED_FILES" ]; then
  echo "No vendored files found in $MAKEFILE" >&2
  exit 1
fi

# Find the most recent commit date across all vendored files
LAST_SYNC=$(git -C "$REPO_ROOT" log --format="%aI" -- $VENDORED_FILES | head -1)

if [ -z "$LAST_SYNC" ]; then
  echo "Could not determine last sync date from git log." >&2
  exit 1
fi

echo "Vendored files last updated: $LAST_SYNC"
echo "Checking upstream (mitsuhiko/agent-stuff) for newer commits..."

RESULT=$(curl -sf \
  "https://api.github.com/repos/mitsuhiko/agent-stuff/commits?path=pi-extensions&since=${LAST_SYNC}&per_page=20" \
  | jq -r '.[] | "\(.commit.author.date[:10])  \(.sha[:7])  \(.commit.message | split("\n")[0])"')

if [ -z "$RESULT" ]; then
  echo "No new upstream commits."
else
  echo ""
  echo "New upstream commits:"
  echo "$RESULT"
fi
