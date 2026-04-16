# PR worktree

Create a git worktree from a GitHub PR so it can be reviewed or worked on in
isolation, without disturbing the main checkout.

## Step 1: Gather inputs

A full GitHub pull request URL is required. If the user has not provided one,
ask for it. Do not accept a bare PR number — you need the URL to resolve the
repo.

Also confirm (or suggest) the **worktree parent directory**. Default suggestion
is `~/work/` — mention it and let the user confirm or override. You want to ask
rather than silently decide, so the worktrees end up where the user expects.

## Step 2: Resolve the PR details

```bash
gh pr view <url> --json number,title,headRefName
```

This gives you the PR number, title, and branch name.

## Step 3: Fetch the branch

```bash
git fetch origin <headRefName>
```

## Step 4: Derive the worktree directory name

Combine the repo name, PR number, and sanitized branch name (replacing `/`
with `-`):

```
<parent-dir>/<repo>-<pr-number>-<sanitized-branch-name>
```

Example: `~/work/my-app-42-feature-auth`

Show this path to the user before creating.

## Step 5: Create the worktree

Run this from the main repo directory:

```bash
git worktree add <full-path> <headRefName>
```

## Step 6: Confirm to the user

Report:
- PR number and title
- Branch name
- Absolute path to the new worktree
- The `cd` command to switch to it
- Output of `git worktree list` so they can see all worktrees at a glance

## Error handling

- **Directory already exists**: `git worktree add` will fail. Tell the user
  and suggest they either remove the existing directory or use it as-is.
- **Branch missing after fetch**: report the error clearly and ask the user
  to check the PR is still open and the branch hasn't been deleted.
- Always run `git worktree add` from the main repo root, not from inside
  another worktree.
