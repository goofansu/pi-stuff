---
name: github
description: >
  Use the gh CLI to interact with GitHub. Covers downloading Gist files and
  creating pull request review comments (single inline or batched multi-comment
  reviews via the Reviews API). Use whenever the user wants to fetch a Gist,
  post a PR review, add inline review comments, or interact with GitHub from
  the CLI.
---

# GitHub

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

---

## Creating pull request review comments

Use `gh api` to post reviews with inline comments via the GitHub Reviews API.
A single API call can attach multiple inline comments to different files by
repeating the `comments[][]` field notation.

Get the PR's head commit SHA before calling the API:

```bash
gh pr view <pr-number> --json headRefOid
```

### Posting a review with inline comments

Each group of three `comments[][]` fields (path / position / body) adds one
inline comment. `position` is the line number in the source file. The top-level
`body` is required by the API but may be an empty string.

```bash
gh api repos/<owner>/<repo>/pulls/<pr-number>/reviews \
  --method POST \
  --field commit_id='<head-sha>' \
  --field event='COMMENT' \
  --field body='Overall review summary.' \
  --field 'comments[][path]=path/to/first/file.rb' \
  --field 'comments[][position]=35' \
  --field 'comments[][body]=First inline comment body.' \
  --field 'comments[][path]=path/to/second/file.rb' \
  --field 'comments[][position]=116' \
  --field 'comments[][body]=Second inline comment body.'
```

### `event` values

| Value | Meaning |
|---|---|
| `COMMENT` | Submit immediately without approving or requesting changes |
| `APPROVE` | Approve the PR |
| `REQUEST_CHANGES` | Request changes |