# Local branch worktree

## Step 1: Gather inputs

Ask the user for:
- **Worktree parent directory** — default suggestion is `~/work/`; mention it and let the user confirm or override
- **Base branch** to create the worktree from (e.g., `main`, `develop`)

Suggest a worktree directory name and a new branch name using the conventions
below. Present both suggestions together and wait for confirmation before
proceeding — the user may want to use their own names.

### Naming conventions

Always use lowercase for both directory and branch names. Prefix the directory
name with the repo name so worktrees from different repos don't collide in
`~/work/`.

**For Jira tickets:**
- Directory: `<repo>-<issue-key>-<short-summary>`, e.g., `my-app-proj-123-fix-login-timeout`
- Branch: `<issue-type>/<issue-key>-<short-summary>`, e.g., `bug/proj-123-fix-login-timeout`

**For other work:**
- Directory: `<repo>-<short-summary>-<random-phrase>`, e.g., `my-app-refactor-cache-sleepy-churning-karp`
- Branch: `<kind>/<short-summary>-<random-phrase>`, e.g., `task/refactor-cache-sleepy-churning-karp`

The random phrase (three lowercase words) is there to make the branch name
unique and easy to identify in lists without a ticket number to anchor it.
Kind is one of: `feature`, `bug`, `task`, `chore`, `spike`, `docs`.

## Step 2: Validate

Before making changes:
- Confirm the current directory is inside a git repository
- Check the target directory does not already exist
- Verify the base branch exists locally or on the remote
- If anything is wrong, explain clearly and ask how to proceed

## Step 3: Create the worktree

- If the base branch only exists on the remote, track it locally first with `git fetch`
- Create the worktree and new branch in one command:

```bash
git worktree add -b <new-branch> <target-dir> <base-branch>
```

## Step 4: Confirm to the user

Report:
- Absolute path to the new worktree
- Branch name
- Base branch it was created from
- The `cd` command to switch to it
- Output of `git worktree list` so they can see everything at a glance
