---
description: Hand off the current task to pi in a new worktree and tmux window
---
Hand off the current task to a new worktree in a separate tmux window.

1. Infer the task from the current context
2. Derive a short kebab-case worktree name from the task
3. Open a new named tmux window: `tmux new-window -n <worktree> 'wt switch -c <worktree> -b @ -x pi -- "<task>"; exec fish'`
