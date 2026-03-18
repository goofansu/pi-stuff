---
description: Create a worktree and write a handoff.md summary for follow-up work
---
You are preparing a handoff for further work.

Context from user: $@

## Step 1: Gather inputs

Always ask me for:
- **Worktree parent directory** (where the worktree folder will be created)
- **Base branch** to create the worktree from — only needed if no PR link was provided

If a PR link was provided, fetch the PR branch name from the PR (e.g. via `gh pr view <number> --json headRefName`) and use it as the branch for the worktree. Do not create a new branch in this case.

Otherwise, suggest a worktree directory name and a matching new branch name using the conventions below. Present both suggestions together and wait for confirmation before proceeding.

### Naming conventions (no PR link only)

Always use lowercase for both directory and branch names.

**For Jira tickets:**
- Directory: `<issue-key>-<short-summary>` (all lowercase, e.g. `proj-123-fix-login-timeout`)
- Branch: `<issue-type>/<issue-key>-<short-summary>` (all lowercase, e.g. `bug/proj-123-fix-login-timeout`)

**For other work:**
- Directory: `<short-summary>-<random-phrase>` (3 random words like `sleepy-churning-karp`)
- Branch: `<kind>/<short-summary>-<random-phrase>`
- Kind: one of `feature`, `bug`, `task`, `chore`, `spike`, `docs`
- Example: directory `refactor-cache-sleepy-churning-karp`, branch `task/refactor-cache-sleepy-churning-karp`

If I provide my own names, use those instead.

## Step 2: Validate

Before making changes:
- Confirm the current directory is inside a git repository
- Check the target directory does not already exist
- If a PR link was provided: verify the PR branch exists on the remote and can be fetched
- Otherwise: verify the base branch exists locally or on the remote
- If anything is wrong, explain and ask how to proceed

## Step 3: Create the worktree

- If a PR link was provided, check out the existing PR branch in the worktree:
  - Fetch the branch from the remote if it doesn't exist locally
  - Use `git worktree add <target-dir> <pr-branch>` (no `-b` flag — the branch already exists)
- Otherwise, create a new branch from the base branch:
  - If the base branch only exists on the remote, track it locally first
  - Use `git worktree add -b <new-branch> <target-dir> <base-branch>`

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
- **PR / Base branch:** <pr-link or base-branch>
- **Created:** <date>
```

Fill in every section from the current session's context and any user instructions provided above. Be specific — file paths, function names, error messages. The goal is for a cold-start session to pick up immediately. Write "None" for any section that does not apply.

## Step 5: Summary

Print a brief summary:
- Worktree path
- Branch name
- PR link or base branch (whichever applies)
- Path to `handoff.md`
- Output of `git worktree list`

## Rules
- Be concise
- Do not guess missing values; ask
- Ask for confirmation before anything destructive
