---
name: handoff
description: Use when the user asks to hand off the current session to a fresh agent.
---

# Handoff

Write a handoff document summarizing the current conversation so a fresh agent can continue the work. Save it to the user's OS temporary directory, not the current workspace.

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.

After saving the document, offer this execution choice:

> Document saved to `<filename>.md`. Two execution options:
>
> **1. Worktree (recommended)** - I create a worktree and execute pi in a new tmux window.
>
> **2. No worktree** - Execute pi in a new tmux window.
>
> Which approach?

**If Worktree is chosen:**
- Run `tmux new-window 'wt switch -c <branch> -b @ -x pi -- "<task>"'`

**If No worktree is chosen:**
- Run `tmux new-window -c "#{pane_current_path}" 'pi "<task>"'`
