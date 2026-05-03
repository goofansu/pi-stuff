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

## upstream.json

Located at `.pi/skills/check-upstream/upstream.json`.
Each key is a local filename, with these fields:

- `repo` — GitHub repo (`owner/repo`)
- `path` — path to the file in that repo
- `reviewed` — last-reviewed commit SHA
- `remark` — *(optional but recommended)* a short note explaining why the local copy diverges from upstream, so future reviews have context

```json
{
  "answer.ts": {
    "repo": "mitsuhiko/agent-stuff",
    "path": "extensions/answer.ts",
    "reviewed": "b861028c706edf3e3f983cde09dd8cc8549ec948",
    "remark": "functionally_same: config (model ID, provider), keybinding system, visual (editor theme)"
  }
}
```

After reviewing a batch of commits, update `remark` to summarise the remaining intentional differences (e.g. which diffs are config, keybinding, unavailable API, or local bug fixes). This prevents re-investigating the same diffs in a future check.

## Workflow

### 1. Check

Run the script and summarize the results to the user:

```bash
bash .pi/skills/check-upstream/check.sh
```

Output shows new commits per file since the last reviewed SHA:

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

For each commit the user wants to apply:

1. Fetch the full diff: `gh api /repos/{owner}/{repo}/commits/{sha}`
2. Identify the relevant hunks — skip pure formatting or import reordering
3. Apply the bug fix to the local modified file

### 3. Mark as reviewed

After applying the fixes, advance the reviewed SHA so those commits stop appearing:

```bash
# Mark a specific file (advances to its latest upstream commit)
bash .pi/skills/check-upstream/check.sh mark btw.ts

# Mark all files at once
bash .pi/skills/check-upstream/check.sh mark

# Mark at a specific commit (not latest)
bash .pi/skills/check-upstream/check.sh mark btw.ts abc1234
```

## Adding a new extension to track

Add an entry to `upstream.json`, setting `reviewed` to the commit you based
your local copy on:

```json
"new-ext.ts": {
  "repo": "owner/repo",
  "path": "path/to/file.ts",
  "reviewed": "<commit-sha>",
  "remark": "<brief note on intentional local differences, or omit if none yet>"
}
```
