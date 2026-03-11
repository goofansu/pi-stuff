---
description: Create a worktree and write a handoff.md summary for follow-up work
---
You are preparing a handoff for further work.

Context from user: $@

## Step 1: Gather inputs

Always ask me for:
- **Worktree parent directory** (where the worktree folder will be created)
- **Base branch** to create the worktree from

Then suggest a worktree directory name and a matching new branch name using the conventions below. Present both suggestions together and wait for confirmation before proceeding.

### Naming conventions

**For Jira tickets:**
- Directory: `<issue-type>-<issue-key>-<short-summary>` (lowercase slug)
- Branch: `<issue-type>/<ISSUE-KEY>-<short-summary>` (key stays uppercase)
- Example: directory `bug-proj-123-fix-login-timeout`, branch `bug/PROJ-123-fix-login-timeout`

**For other work:**
- Directory: `<short-summary>-<random-phrase>` (3 random words like `sleepy-churning-karp`)
- Branch: `<kind>/<short-summary>-<random-phrase>`
- Kind: one of `feature`, `bug`, `task`, `chore`, `spike`, `docs`
- Example: directory `refactor-cache-sleepy-churning-karp`, branch `task/refactor-cache-sleepy-churning-karp`

If I provide my own names, use those instead.

## Step 2: Validate

Before making changes:
- Confirm the current directory is inside a git repository
- Check the base branch exists locally or on the remote
- Check the target directory does not already exist
- If anything is wrong, explain and ask how to proceed

## Step 3: Create the worktree

- Create a new branch from the base branch and check it out in the worktree
- If the base branch only exists on the remote, track it locally first
- Do not overwrite existing directories

```
git worktree add -b <new-branch> <target-dir> <base-branch>
```

## Step 4: Write handoff.md

Create `handoff.md` in the worktree root. Structure it as follows:

```markdown
# Handoff

## Objective
<!-- What we set out to do -->

## Completed
<!-- What was done in this session -->

## Files changed
<!-- List of files created, modified, or deleted -->

## Open questions
<!-- Unresolved decisions or unknowns -->

## Remaining work
<!-- What still needs to be done -->

## Next steps
<!-- Concrete actions for the next session -->

## Context
- **Worktree:** <path>
- **Branch:** <branch>
- **Base branch:** <base-branch>
- **Created:** <date>
```

Fill in every section from the current session's context and any user instructions provided above. Be specific — file paths, function names, error messages. The goal is for a cold-start session to pick up immediately.

## Step 5: Summary

Print a brief summary:
- Worktree path
- Branch name
- Base branch
- Path to `handoff.md`
- Output of `git worktree list`

## Rules
- Be concise
- Do not guess missing values; ask
- Ask for confirmation before anything destructive
