---
name: check-upstream
description: Check whether upstream GitHub repositories have new commits since the local vendored extensions were last updated. Supports multiple vendors — any repo referenced in extensions/Makefile is checked. Use this skill whenever the user asks about upstream changes, new extensions, whether extensions are up to date, syncing with upstream, or anything like "any new commits?", "what's changed upstream?", "are there updates?", or "should I sync?".
---

# check-upstream

Checks all upstream GitHub repositories referenced in `extensions/Makefile` for
commits that postdate the local vendored extensions.  Supports multiple vendors
(e.g. `mitsuhiko/agent-stuff`, `other-org/other-repo`, etc.).

## Usage

Run the helper script:

```bash
bash .pi/skills/check-upstream/scripts/check.sh
```

The script automatically:
1. Parses `extensions/Makefile` to extract all `raw.githubusercontent.com` URLs
2. Groups them by GitHub repository and path prefix
3. For each upstream, finds the most recent local git commit date across its vendored files
4. Queries the GitHub Commits API for any commits newer than that date
5. Reports new commits per upstream, or confirms you're up to date

## What to do with the results

**No new commits** — you're up to date, nothing to do.

**New commits found** — review them, then pull the ones you want:

```bash
make -C extensions install   # re-downloads all vendored extensions from upstream
```

Review the diff after (`git diff extensions/`) before committing, since upstream
changes may conflict with local modifications.

## Adding a new vendor

Just add `curl` lines to `extensions/Makefile` pointing at the new repo's
`raw.githubusercontent.com` URLs.  The check script will automatically pick them
up — no configuration needed.
