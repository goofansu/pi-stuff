---
description: Hand off the current task to pi in a new worktree and tmux window
---
Hand off the current task to a new worktree in a separate tmux window.

1. Infer the task from the current context
2. Derive a short kebab-case worktree name from the task
3. Open a new tmux window (the window name is auto-renamed): `tmux new-window 'wt switch -c <worktree> -b @ -x pi -- "<task>"; exec fish'`
