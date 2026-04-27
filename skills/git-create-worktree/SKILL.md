---
name: git-create-worktree
description: >-
  Create git worktrees. Use this skill specifically for requests that explicitly
  say to create or add a git worktree — for a PR, an existing branch, or a new
  local branch. Good trigger phrases: "create a git worktree", "add a git
  worktree", "create a git worktree for this PR", "create a git worktree for
  this branch". Leave checkout, branch switching, listing, and removal requests
  to the normal git workflow.
---

# Git create worktree

Create a git worktree so the user can work on a PR or branch in a separate
checkout without disturbing the current one.

## Workflow

### Step 1: Identify the source

Determine what the worktree should check out:

- **GitHub PR URL**: use the PR's head branch.
- **Existing branch**: use that branch directly.
- **New branch**: create it from a base branch such as `main` or `develop`.

Ask for any missing source information before proceeding. For PRs, require a
full GitHub PR URL rather than a bare PR number so the repository can be
resolved.

### Step 2: Resolve branch details

**For a GitHub PR**, run `gh pr view <url> --json title,headRefName` to get the
head branch, then fetch it:

```bash
git fetch origin <headRefName>
```

**For an existing branch**, verify it exists locally or on the remote. If it
only exists on the remote, fetch it:

```bash
git fetch origin <branch>
```

**For a new branch**, verify the base branch exists locally or on the remote.
If it only exists on the remote, fetch it:

```bash
git fetch origin <base-branch>
```

### Step 3: Derive the worktree path

Worktrees are created as sibling directories of the current project. Use the
current repository root to derive the default worktree location:

1. Find the project root with `git rev-parse --show-toplevel`.
2. Use the project root's parent directory as the worktree parent.
3. Name the worktree `<repo-name>-<sanitized-short-description>`.

The short description should come from the user request, PR title, branch name,
or a brief phrase you ask the user to provide. Sanitize it by lowercasing,
replacing spaces, slashes, and punctuation with hyphens, collapsing repeated
hyphens, and truncating to a maximum of 30 characters at a word boundary where possible.

Examples:

- Current repo: `~/code/my-app`; description: `new dashboard`; path:
  `~/code/my-app-new-dashboard`
- Current repo: `~/code/my-app`; description: `fix the broken login on the settings page`; path:
  `~/code/my-app-fix-the-broken-login` (truncated to a maximum of 30 characters)

### Step 4: Validate

Before making changes:

- Confirm the current directory is inside a git repository.
- Check that the target directory does not already exist.
- Confirm the branch resolved in Step 2 is available.
- If anything is wrong, explain clearly and ask how to proceed.

Show the proposed path and branch information to the user and wait for
confirmation before proceeding.

### Step 5: Create the worktree

Run worktree commands from the main repo root, not from inside another worktree.

For a PR or existing branch:

```bash
git worktree add <target-dir> <branch-name>
```

For a new branch:

```bash
git worktree add -b <new-branch> <target-dir> <base-branch>
```

### Step 6: Confirm to the user

Report:

- Absolute path to the new worktree
- Branch name
- Base branch, if a new branch was created
- The `cd` command to switch to it

## Error handling

- **Directory already exists**: tell the user and suggest choosing a different
  short description or target path.
- **Branch missing after fetch**: report the error clearly and ask the user to
  check that the branch still exists.
- **No remote named `origin`**: run `git remote -v` to identify the correct
  remote name and substitute it in fetch commands.

## General rules

- Be concise.
- Do not guess missing values; ask.
- Ask for confirmation before creating the worktree.
- Always use sibling worktree directories and sanitized short descriptions; do
  not use ticket numbers or PR numbers in the directory name.
