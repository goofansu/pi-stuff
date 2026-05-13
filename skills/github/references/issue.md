# Issues

Working with GitHub issues locally via `gh-issue-sync`.

## Workflow

1. **Pull the issue** — sync it to disk:
   ```bash
   gh-issue-sync pull <issue-number>
   ```

2. **Find the file**:
   ```bash
   find .issues/ -name "<issue-number>-*"
   ```

3. **Read incrementally** — open the file in small chunks; stop as soon as you have what you need:
   ```bash
   # Read first 50 lines
   head -50 .issues/<filename>
   # Read next chunk if needed
   sed -n '51,100p' .issues/<filename>
   ```

## Rules

- **Pull first** — never assume an issue is already on disk; always run `gh-issue-sync pull` before reading.
- **Find to locate** — run `find .issues/ -name "<number>-*"` to get the path.
- **Read in small chunks** — issues can be long; read incrementally and stop early when the answer is found.
- **One pull per issue** — pulling again is a no-op if already synced, so it's always safe to pull.

Metadata (number, title, author, labels, state) is in the YAML frontmatter at the top of each file.
