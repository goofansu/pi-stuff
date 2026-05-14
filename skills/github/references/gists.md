# Gists

Download gist files directly to disk using the `gh` CLI. Redirect output straight to the destination file — don't read gist content into context and re-write it with the `write` tool, because content passing through the context window can lose whitespace or change encoding silently.

## Workflow

1. **Find the gist** (if you don't have the ID):
   ```bash
   gh gist list --limit 50 | grep -i <keyword>
   ```

2. **List files in the gist**:
   ```bash
   gh gist view <gist-id> --files
   ```

3. **Download directly** to the destination path:
   ```bash
   gh gist view <gist-id> --filename <filename> > /path/to/destination
   ```
