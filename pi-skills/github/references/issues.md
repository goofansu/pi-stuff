# Issues

Sync GitHub issues to disk with `gh-issue-sync`, then read them as local Markdown files. This avoids repeated API calls and gives you a stable snapshot to work from.

## Workflow

1. **Pull the issue** to disk (safe to re-run — it checks for updates):
   ```bash
   gh-issue-sync pull <issue-number>
   ```

2. **Locate the file** — issues land in subdirectories under `.issues/`:
   ```bash
   find .issues/ -name "<issue-number>-*"
   ```

3. **Read the file** using the `read` tool with `offset` and `limit`. Issues can be long, so start with the first ~50 lines (which include the frontmatter and opening context) and continue only if needed.

## Frontmatter

Each issue file has YAML frontmatter at the top containing:
- **Top-level:** `title`, `labels`, `state`, `state_reason`
- **Nested under `info`:** `author`, `created_at`, `updated_at`
- The issue **number** is encoded in the filename, not in the frontmatter.
