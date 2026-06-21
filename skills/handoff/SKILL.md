---
name: handoff
description: Use when creating a handoff for another agent or launching a fresh agent from a handoff.
---

Create or use a handoff document so a fresh agent can continue the current work.

## Modes

* Document mode: use [`references/document.md`](references/document.md) when writing a new handoff document.
* Launch mode: use [`references/launch.md`](references/launch.md) only when the user explicitly asks to launch, spawn, start a fresh agent, or execute work from a handoff.

Do not run tmux, worktree, or `pi` commands until the user explicitly chooses a launch option.

## Routing

* Create a new handoff: use document mode and write the document first.
* Launch from the current handoff: ensure the document exists, then use launch mode and offer launch choices.
* Launch from an old handoff: verify the path exists, then use launch mode and offer launch choices.

## Safety

* Save new handoff documents outside the repository, in the OS temporary directory.
* Redact secrets and unnecessary personal information.
* Do not push, discard, reset, overwrite, or stash local changes unless explicitly asked.
* If the handoff path is missing, ask for the path or create a new handoff first.
* If tmux is unavailable, report the issue and provide the command the user can run manually.
* If worktree setup fails, report the error and stop.
