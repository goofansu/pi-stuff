---
name: check-upstream
description: Check whether the upstream mitsuhiko/agent-stuff pi-extensions repository has new commits since the local vendored extensions were last updated. Use this skill whenever the user asks about upstream changes, new extensions from mitsuhiko, whether extensions are up to date, syncing with upstream, or anything like "any new commits?", "what's changed upstream?", "are there updates?", or "should I sync?".
---

# check-upstream

Checks the upstream `mitsuhiko/agent-stuff/pi-extensions` repo for commits that
postdate the local vendored extensions.

## Usage

Run the helper script:

```bash
bash .pi/skills/check-upstream/scripts/check.sh
```

The script automatically:
1. Parses `extensions/Makefile` to identify vendored files (from `curl` lines in the `install` target) — so local-only extensions like `oracle.ts` don't skew the date
2. Finds the most recent git commit date across those vendored files
3. Queries the GitHub API for any `pi-extensions/` commits newer than that date
4. Reports new commits (date, short SHA, message), or confirms you're up to date

## What to do with the results

**No new commits** — you're up to date, nothing to do.

**New commits found** — review them, then pull the ones you want:

```bash
make -C extensions install   # re-downloads all vendored extensions from upstream
```

Review the diff after (`git diff extensions/`) before committing, since upstream
changes may conflict with local modifications.
