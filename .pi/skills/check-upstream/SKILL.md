---
name: check-upstream
description: Check whether upstream GitHub repositories have new commits since the local vendored extensions were last updated. Supports multiple vendors — any repo referenced in upstream.json is checked. Use this skill whenever the user asks about upstream changes, new extensions, whether extensions are up to date, syncing with upstream, or anything like "any new commits?", "what's changed upstream?", "are there updates?", or "should I sync?".
---

# check-upstream

Track and selectively apply upstream bug fixes to locally modified vendored
extensions.

Upstream sources and last-reviewed commit SHAs are stored in
`upstream.json` (next to the script). The script queries GitHub for
commits newer than the reviewed SHA per file, showing individual commit
messages and links so you can identify bug fixes worth cherry-picking.

## Quick reference

```bash
# Check for new upstream commits
bash .pi/skills/check-upstream/scripts/check.sh

# After applying fixes, mark as reviewed
bash .pi/skills/check-upstream/scripts/check.sh mark answer.ts
bash .pi/skills/check-upstream/scripts/check.sh mark            # all files
```

## upstream.json

Located at `.pi/skills/check-upstream/upstream.json`. Each key is a local
filename, with `repo`, `path`, and `reviewed` (last reviewed commit SHA):

```json
{
  "answer.ts": {
    "repo": "mitsuhiko/agent-stuff",
    "path": "extensions/answer.ts",
    "reviewed": "b861028c706edf3e3f983cde09dd8cc8549ec948"
  }
}
```

## Workflow

### 1. Check

```bash
bash .pi/skills/check-upstream/scripts/check.sh
```

Shows new upstream commits per file since the last reviewed SHA:

```
✓  answer.ts
↑  btw.ts — 2 new commit(s):
   abc1234 2026-04-20 fix: session cleanup race condition
        https://github.com/mitsuhiko/agent-stuff/commit/abc1234
   def5678 2026-04-22 refactor: clean up imports
        https://github.com/mitsuhiko/agent-stuff/commit/def5678
✓  ghostty.ts
```

### 2. Review and apply

For each commit that looks like a bug fix:

1. Click the GitHub link to see the full diff
2. Apply the relevant change to your local modified file
3. The agent can help — ask it to review a specific commit and apply the fix

### 3. Mark as reviewed

After applying the fixes you want, update the reviewed SHA so those commits
stop appearing:

```bash
# Mark a specific file (advances to latest upstream commit for that file)
bash .pi/skills/check-upstream/scripts/check.sh mark btw.ts

# Mark all files at once
bash .pi/skills/check-upstream/scripts/check.sh mark

# Mark at a specific commit (not latest)
bash .pi/skills/check-upstream/scripts/check.sh mark btw.ts abc1234
```

## Agent instructions

When the user asks to check upstream / check for updates:

1. Run `check.sh` and summarize the results
2. If the user wants to apply a specific fix:
   - Fetch the commit diff from GitHub (`gh api /repos/{owner}/{repo}/commits/{sha}`)
   - Identify the relevant hunks (skip pure formatting/import reordering)
   - Apply the bug fix to the local modified file
3. After applying, run `check.sh mark <file>` to update the reviewed SHA

## Adding a new extension to track

Add an entry to `upstream.json`:

```json
"new-ext.ts": {
  "repo": "owner/repo",
  "path": "path/to/file.ts",
  "reviewed": "<commit-sha>"
}
```

Set `reviewed` to the commit you based your local copy on.
