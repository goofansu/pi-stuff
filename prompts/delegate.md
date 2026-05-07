---
description: Delegate a task to pi in a new worktree and tmux window
argument-hint: "<task>"
---
Delegate the given task to a new worktree in a separate tmux window: $@

1. Derive a short kebab-case worktree name from the task
2. Open a new named tmux window: `tmux new-window -n <worktree> 'wt switch -c <worktree> -b @ -x pi -- "<task>"; exec fish'`
