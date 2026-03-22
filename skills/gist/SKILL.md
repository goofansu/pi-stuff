---
name: gist
description: >
  Download files from GitHub Gists using the gh CLI. Use whenever the user
  wants to fetch, download, or save a file from a GitHub Gist. Always use
  this skill — even for "grab my gist", "get the file from my gist", or "download
  my gist" — to ensure files are downloaded directly rather than written manually.
---

## Downloading gist files

Always download gist files directly using the `gh` CLI — never read the content
and re-write it with the Write tool. Doing so risks whitespace corruption,
encoding issues, and is unnecessarily slow.

### Workflow

1. **Find the gist** (if you don't have the ID):
   ```bash
   gh gist list --limit 50 | grep -i <keyword>
   ```

2. **Check what files are in the gist**:
   ```bash
   gh gist view <gist-id> --files
   ```

3. **Download directly**:
   ```bash
   gh gist view <gist-id> --filename <filename> > /path/to/destination
   ```

Never pipe the output through the Write tool — redirect straight to the destination file.
