#!/usr/bin/env bash
# Check for upstream commits across all GitHub repositories referenced in
# extensions/Makefile.  Supports multiple vendors — any raw.githubusercontent.com
# curl URL is detected and grouped by repo + path prefix.
#
# For each upstream, the script finds the most recent local git-commit date
# across the vendored files that came from that upstream, then queries the
# GitHub Commits API for anything newer.

set -e

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
MAKEFILE="$REPO_ROOT/extensions/Makefile"

if [ ! -f "$MAKEFILE" ]; then
  echo "Makefile not found: $MAKEFILE" >&2
  exit 1
fi

# Extract all raw.githubusercontent.com URLs from the Makefile.
# Expected format:
#   https://raw.githubusercontent.com/{owner}/{repo}/refs/heads/{branch}/{path}/{file}
URLS=$(grep -oE 'https://raw\.githubusercontent\.com/[^[:space:]]+' "$MAKEFILE")

if [ -z "$URLS" ]; then
  echo "No upstream URLs found in $MAKEFILE" >&2
  exit 1
fi

# Build an associative array: key = "owner/repo::path-prefix", value = list of local filenames
declare -A UPSTREAM_FILES  # local filenames per upstream key
declare -A UPSTREAM_REPO   # "owner/repo" per key
declare -A UPSTREAM_PATH   # API path prefix per key

while IFS= read -r url; do
  # Strip the base and split:  owner/repo/refs/heads/branch/path.../file
  stripped="${url#https://raw.githubusercontent.com/}"
  owner=$(echo "$stripped" | cut -d/ -f1)
  repo=$(echo "$stripped" | cut -d/ -f2)
  # Everything after refs/heads/{branch}/ is the file path inside the repo
  # Pattern: owner/repo/refs/heads/branch/rest...
  rest=$(echo "$stripped" | sed -E 's|^[^/]+/[^/]+/refs/heads/[^/]+/||')
  # path-prefix = directory portion, filename = basename
  dir_prefix=$(dirname "$rest")
  filename=$(basename "$rest")

  key="${owner}/${repo}::${dir_prefix}"
  UPSTREAM_REPO["$key"]="${owner}/${repo}"
  UPSTREAM_PATH["$key"]="$dir_prefix"
  UPSTREAM_FILES["$key"]+="extensions/${filename} "
done <<< "$URLS"

ANY_UPDATES=false

for key in $(echo "${!UPSTREAM_REPO[@]}" | tr ' ' '\n' | sort); do
  repo="${UPSTREAM_REPO[$key]}"
  api_path="${UPSTREAM_PATH[$key]}"
  local_files="${UPSTREAM_FILES[$key]}"

  echo "━━━ ${repo}  (path: ${api_path}) ━━━"

  # Find the most recent commit date across the vendored files from this upstream
  # shellcheck disable=SC2086
  LAST_SYNC=$(git -C "$REPO_ROOT" log --format="%aI" -- $local_files 2>/dev/null | head -1)

  if [ -z "$LAST_SYNC" ]; then
    echo "  ⚠  Could not determine last sync date (files not yet committed?)."
    echo "     Files: $local_files"
    echo ""
    continue
  fi

  echo "  Last local update: $LAST_SYNC"

  RESULT=$(curl -sf \
    "https://api.github.com/repos/${repo}/commits?path=${api_path}&since=${LAST_SYNC}&per_page=20" \
    | jq -r '.[] | "  \(.commit.author.date[:10])  \(.sha[:7])  \(.commit.message | split("\n")[0])"')

  if [ -z "$RESULT" ]; then
    echo "  ✓ Up to date."
  else
    echo "  New upstream commits:"
    echo "$RESULT"
    ANY_UPDATES=true
  fi
  echo ""
done

if [ "$ANY_UPDATES" = true ]; then
  echo "Run 'make -C extensions install' to pull updates, then review with 'git diff extensions/'."
fi
