# pi-stuff

This repository stores customizations for the [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/).

## Extensions

All extension files are in the [`extensions`](extensions) directory — both ones I wrote and ones sourced from others (through [`extensions/Makefile`](extensions/Makefile)), which keeps everything in one place and easy to maintain.

Here is a list of extensions I wrote:

- [`btw.ts`](extensions/btw.ts) - Ask a quick context-free question (`/btw <question>`) using Claude Haiku 4.5 with no system prompt and no session history. Uses web search via Brave API if `BRAVE_SEARCH_API_KEY` is set.
- [`gondolin.ts`](extensions/gondolin.ts) - Sandboxes all tool calls (read/write/edit/bash) inside a Gondolin micro-VM via `--gondolin` flag; mounts the current directory at `/workspace` in the VM.
- [`librarian.ts`](extensions/librarian.ts) - Searches code across GitHub repositories in a subagent using Claude Haiku 4.5.
- [`oracle.ts`](extensions/oracle.ts) - Second opinion reasoning subagent using GPT 5.4.
- [`snippets.ts`](extensions/snippets.ts) - Lists code blocks from the last assistant message for further action.

## Skills

All skill files are in the [`skills`](skills) directory:

- [`note`](skills/note) - For creating and managing Denote notes in Emacs via `emacsclient`.
- [`tmux`](skills/tmux) - Remote control tmux sessions for interactive CLIs (python, gdb, etc.) by sending keystrokes and scraping pane output.
