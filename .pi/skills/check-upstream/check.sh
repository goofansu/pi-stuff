#!/usr/bin/env bash
# check-upstream: Track upstream commits to vendored extensions.
#
# Reads upstream.json for repo/path/last-reviewed-SHA per file.
# Queries GitHub for newer commits and displays them with messages and links.
#
# Usage:
#   check.sh              Show new upstream commits per file (default)
#   check.sh mark [file]  Mark file(s) as reviewed (update SHA to latest)
#   check.sh --help       Show help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UPSTREAM="$SCRIPT_DIR/upstream.json"

[[ -f "$UPSTREAM" ]] || { echo "error: $UPSTREAM not found" >&2; exit 1; }
command -v gh &>/dev/null || { echo "error: gh CLI required (brew install gh)" >&2; exit 1; }
command -v jq &>/dev/null || { echo "error: jq required" >&2; exit 1; }

_api() { gh api "$@" 2>/dev/null; }

# --- check: show new upstream commits per file ---

cmd_check() {
  local any_new=false
  local names
  names=$(jq -r 'keys[]' "$UPSTREAM")

  for name in $names; do
    local repo fpath reviewed
    repo=$(jq -r --arg n "$name" '.[$n].repo' "$UPSTREAM")
    fpath=$(jq -r --arg n "$name" '.[$n].path' "$UPSTREAM")
    reviewed=$(jq -r --arg n "$name" '.[$n].reviewed' "$UPSTREAM")

    # Date of reviewed commit
    local pin_date
    pin_date=$(_api "/repos/$repo/commits/$reviewed" --jq '.commit.committer.date') || {
      echo "⚠  $name — cannot fetch commit ${reviewed:0:7}"
      continue
    }

    # Newer commits touching this file
    local raw
    raw=$(_api "/repos/$repo/commits?path=$fpath&since=$pin_date&per_page=30" \
      --jq ".[] | select(.sha != \"$reviewed\") | \"\(.sha)\t\(.commit.committer.date[:10])\t\(.commit.message | split(\"\n\")[0])\"") || true

    if [[ -z "$raw" ]]; then
      echo "✓  $name"
    else
      local n
      n=$(wc -l <<< "$raw" | tr -d ' ')
      echo "↑  $name — $n new commit(s):"
      while IFS=$'\t' read -r sha date msg; do
        echo "   ${sha:0:7} $date $msg"
        echo "        https://github.com/$repo/commit/${sha:0:7}"
      done <<< "$raw"
      echo ""
      any_new=true
    fi
  done

  echo ""
  if [[ "$any_new" == true ]]; then
    echo "After applying fixes, mark as reviewed:"
    echo "  bash $0 mark <filename>"
    echo "  bash $0 mark              # mark all"
  else
    echo "Everything is up to date."
  fi
}

# --- mark: update reviewed SHA after applying fixes ---

cmd_mark() {
  local target="${1:-}" explicit_sha="${2:-}"
  local names
  names=$(jq -r 'keys[]' "$UPSTREAM")

  for name in $names; do
    [[ -n "$target" && "$name" != "$target" ]] && continue

    local repo fpath
    repo=$(jq -r --arg n "$name" '.[$n].repo' "$UPSTREAM")
    fpath=$(jq -r --arg n "$name" '.[$n].path' "$UPSTREAM")

    local sha
    if [[ -n "$explicit_sha" ]]; then
      # Resolve to full SHA
      sha=$(_api "/repos/$repo/commits/$explicit_sha" --jq '.sha') || {
        echo "⚠  $name — invalid SHA: $explicit_sha"
        continue
      }
    else
      # Latest commit touching this file
      sha=$(_api "/repos/$repo/commits?path=$fpath&per_page=1" --jq '.[0].sha') || {
        echo "⚠  $name — cannot resolve latest"
        continue
      }
    fi
    [[ -z "$sha" || "$sha" == "null" ]] && { echo "⚠  $name — no commits found"; continue; }

    local current
    current=$(jq -r --arg n "$name" '.[$n].reviewed' "$UPSTREAM")
    if [[ "$current" == "$sha" ]]; then
      echo "✓  $name (already at ${sha:0:7})"
    else
      local tmp
      tmp=$(jq --arg n "$name" --arg s "$sha" '.[$n].reviewed = $s' "$UPSTREAM")
      echo "$tmp" > "$UPSTREAM"
      echo "✓  $name → ${sha:0:7}"
    fi
  done
}

# --- main ---

case "${1:-check}" in
  check)       cmd_check ;;
  mark)        shift; cmd_mark "$@" ;;
  -h|--help)
    cat <<'EOF'
Usage: check.sh [command]

Commands:
  check          Show new upstream commits per file (default)
  mark [file]    Mark file(s) as reviewed (update SHA to latest)
  --help         Show this help
EOF
    ;;
  *)  echo "Unknown: $1 — run '$0 --help'" >&2; exit 1 ;;
esac
