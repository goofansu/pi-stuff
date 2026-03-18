#!/usr/bin/env bash
# Check for upstream changes across all GitHub repositories referenced in
# extensions/Makefile by directly comparing local file content to upstream.
#
# This approach is immune to the "local patch shifts the date cutoff" bug that
# affects commit-date-based checks: it downloads each upstream file to a temp
# location and diffs it against the local copy.

set -e

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
MAKEFILE="$REPO_ROOT/extensions/Makefile"

if [ ! -f "$MAKEFILE" ]; then
  echo "Makefile not found: $MAKEFILE" >&2
  exit 1
fi

TMPDIR_WORK=$(mktemp -d)
trap 'rm -rf "$TMPDIR_WORK"' EXIT

ANY_DIFF=false

# Parse every curl line from the Makefile.
# Handles two forms:
#   curl -O <url>                  -> local filename = basename of url
#   curl <url> -o <localname>      -> local filename = <localname>
#   curl -o <localname> <url>      -> local filename = <localname>
while IFS= read -r line; do
  # Skip lines that don't contain a raw.githubusercontent.com URL
  url=$(echo "$line" | grep -oE 'https://raw\.githubusercontent\.com/[^[:space:]]+') || continue

  # Determine local output filename
  if echo "$line" | grep -qE '(curl -O |curl -sO )'; then
    # -O: use the URL basename
    local_name=$(basename "$url")
  elif echo "$line" | grep -qE -- '-o '; then
    # -o <name>: extract the argument after -o
    local_name=$(echo "$line" | grep -oE -- '-o [^[:space:]]+' | head -1 | awk '{print $2}')
  else
    local_name=$(basename "$url")
  fi

  local_file="$REPO_ROOT/extensions/$local_name"

  if [ ! -f "$local_file" ]; then
    echo "⚠  $local_name  (local file not found: $local_file)"
    continue
  fi

  # Download upstream to a temp file
  tmp_file="$TMPDIR_WORK/$local_name"
  if ! curl -sf "$url" -o "$tmp_file" 2>/dev/null; then
    echo "⚠  $local_name  (upstream fetch failed: $url)"
    continue
  fi

  if ! diff -q "$local_file" "$tmp_file" > /dev/null 2>&1; then
    echo "↑  $local_name  differs from upstream"
    echo "   upstream: $url"
    diff --unified=3 "$local_file" "$tmp_file" | head -40 || true
    echo ""
    ANY_DIFF=true
  fi

done < "$MAKEFILE"

if [ "$ANY_DIFF" = false ]; then
  echo "✓ All vendored extensions match upstream."
else
  echo "Run 'make -C extensions install' to pull updates, then review with 'git diff extensions/'."
fi
