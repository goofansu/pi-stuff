---
name: commit
description: Use when creating a git commit.
---

Create exactly one git commit using Conventional Commits format.

## Steps

1. Infer from the prompt whether the user provided file paths, globs, or additional instructions.
2. Review `git status --short` and `git diff` to understand the current changes. Limit inspection to the provided file paths or globs when present.
3. Optionally run `git log -n 50 --pretty=format:%s | grep -E '^[a-z]+\([^)]+\):'` to identify commonly used commit scopes.
4. Determine the intended changes:
   - If the user provided file paths or globs, use only those paths.
   - If the user did not provide file paths or globs, use all current changes.
   - If there are no intended changes to commit, do not create a commit. Report that there is nothing to commit.
   - If there are unrelated, ambiguous, generated, or risky changes, ask for clarification before committing.
5. Stage only the intended changes.
6. Review `git diff --staged` and create a Conventional Commits message based only on the staged diff.
7. Run `git commit -m "<subject>"` and include `-m "<body>"` only when a body is useful.
8. Run `git status --short` and `git log -1 --oneline` after committing, then report the commit hash and message.
