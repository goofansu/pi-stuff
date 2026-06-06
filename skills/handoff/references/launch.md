# Handoff launch reference

Start a fresh agent in a new tmux window using an existing handoff document.

## Desired outcome

A new tmux window is created with `pi` running against the handoff task.

Use a worktree when requested so the fresh agent can work safely without interfering with the current working tree.

## Required inputs

Use the handoff document path from the current session when available.

If no handoff document path is known, ask the user for the path or create one first using `references/document.md`.

If the user passed arguments, treat them as the handoff document path and optional task focus.

## Execution choices

If the user has not already chosen an execution mode, offer exactly these options:

```md
Two execution options:

**1. Worktree (recommended)** - Create a worktree and execute `pi` in a new tmux window.

**2. No worktree** - Execute `pi` in a new tmux window from the current working directory.

Which approach?
```

Do not run anything until the user chooses one option.

## Task argument

Build the `pi` task from the handoff document path and any user-provided focus.

Prefer a short instruction such as:

```text
Continue from the handoff document at <handoff-path>.
```

If the user provided a focus, include it:

```text
Continue from the handoff document at <handoff-path>. Focus on <focus>.
```

Quote the task safely for the shell.

## Worktree option

If the user chooses Worktree:

1. Choose a short branch name based on the task.
2. Use lowercase words separated by hyphens.
3. Avoid spaces, quotes, shell metacharacters, and overly long names.
4. Run:

```sh
tmux new-window 'wt switch -c <branch> -b @ -x pi -- "<task>"'
```

Replace:

- `<branch>` with the generated branch name
- `<task>` with the safely quoted task instruction

## No-worktree option

If the user chooses No worktree, run:

```sh
tmux new-window -c "#{pane_current_path}" 'pi "<task>"'
```

Replace `<task>` with the safely quoted task instruction.

## Safety rules

- Do not launch anything unless the user explicitly chooses an execution option.
- Do not push.
- Do not discard, reset, overwrite, or stash local changes unless explicitly asked.
- Do not silently fall back from Worktree to No worktree.
- If tmux is unavailable, report the issue and provide the command the user can run manually.
- If worktree creation fails, report the error and stop.
- If the handoff file does not exist, stop and ask for the correct path.
- If the repository is in an unsafe state for worktree creation, report the issue and ask for guidance.

## Final response

After launching, briefly report:

```md
Started fresh agent in tmux.

Mode: <Worktree | No worktree>
Task: <task>
```

If launch failed, report the failing command and the error.
