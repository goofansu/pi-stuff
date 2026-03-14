# pi-stuff

This repository stores customizations for the [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/).

## Extensions

All extension files are in the [`extensions`](extensions) directory — both ones I wrote and ones sourced from others (through [`extensions/Makefile`](extensions/Makefile)). That keeps everything in one place, easy to maintain. 

Here is a list of extensions I wrote:

- [`librarian.ts`](extensions/librarian.ts) - Searches code across GitHub repositories in a subagent; prefers Kimi K2.5 (`kimi-coding/k2p5`), falls back to Claude Sonnet 4.6, at medium thinking level.
- [`oracle.ts`](extensions/oracle.ts) - Second opinion reasoning subagent using GPT 5.4 (`openai-codex/gpt-5.4`) at medium thinking level.
- [`snippets.ts`](extensions/snippets.ts) - Lists code blocks from the last assistant message for further action.

## Skills

All skill files are in the [`skills`](skills) directory:

- [`note`](skills/note) - For creating and managing Denote notes in Emacs via `emacsclient`.
- [`tmux`](skills/tmux) - Remote control tmux sessions for interactive CLIs (python, gdb, etc.) by sending keystrokes and scraping pane output.
