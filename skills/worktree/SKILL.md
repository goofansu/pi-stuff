---
name: worktree
description: >-
  Manage git worktrees. Use when the user wants to check out a PR or branch as
  a worktree, list existing worktrees, or remove/prune one. Triggers include
  "create a worktree", "check out this PR", "add a worktree", "list worktrees",
  "remove worktree", or any request to work on a branch in a separate directory.
disable-model-invocation: true
---

# Worktree

A worktree lets you check out a branch into a separate directory so you can
work on it without disturbing your main checkout. This skill covers three
operations:

## Operations

| User intent | Reference |
|---|---|
| GitHub PR URL provided → check it out as a worktree | [pull_request.md](references/pull_request.md) |
| New branch (no PR) → create a worktree for it | [local_branch.md](references/local_branch.md) |
| List or remove existing worktrees | See below |

If it is unclear which applies, ask the user whether they have a PR URL before
proceeding.

## Listing worktrees

Run `git worktree list` from the main repo directory. Show the output as-is —
it includes the path, commit, and branch for each worktree.

## Removing a worktree

```bash
git worktree remove <path>          # removes a worktree and its directory
git worktree prune                  # removes stale entries for already-deleted directories
```

If the user wants to remove a worktree, confirm the path first, then run
`git worktree remove`. If the directory was already manually deleted, use
`git worktree prune` to clean up the stale reference.

## General rules

- Be concise
- Do not guess missing values; ask
- Ask for confirmation before anything destructive
