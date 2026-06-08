---
name: handoff
description: Use when the user asks to create a handoff document for another agent, or to launch a fresh agent from a handoff.
---

# Handoff

Create or use a handoff document so a fresh agent can continue the current work.

Use `references/document.md` when writing a handoff document.

Use `references/launch.md` only when the user explicitly asks to launch, spawn, start a fresh agent, or execute work from a handoff.

Do not launch tmux, worktree, or `pi` commands until the user explicitly chooses a launch option.

## Routing

- Create a new handoff: write the document first.
- Launch from the current handoff: ensure the document exists, then offer launch choices.
- Launch from an old handoff: verify the path exists, then offer launch choices.

## Safety

- Save new handoff documents outside the repository, in the OS temporary directory.
- Redact secrets and unnecessary personal information.
- Do not push, discard, reset, overwrite, or stash local changes unless explicitly asked.
- If the handoff path is missing, ask for the path or create a new handoff first.
- If tmux is unavailable, report the issue and provide the command the user can run manually.
- If worktree setup fails, report the error and stop.
