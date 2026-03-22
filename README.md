# pi-stuff

This repository stores customizations for the [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/).

## Extensions

All extension files are in the [`extensions`](extensions) directory, including both my own extensions and ones sourced from others via [`extensions/Makefile`](extensions/Makefile). This keeps everything in one place and easy to maintain.

Here are the extensions I wrote:

- [`ask.ts`](extensions/ask.ts) - Ask a quick context-free question using Claude Haiku 4.5 with no system prompt and no session history. Uses web search via Brave API if `BRAVE_SEARCH_API_KEY` is set.
- [`btw.ts`](extensions/btw.ts) - Ask a question with full session context using the current model. No tools — answers from what's already in context. Press `ctrl+s` to save the answer as a Markdown note in `.pi/btw/`.
- [`ghostty.ts`](extensions/ghostty.ts) - Ghostty terminal title and progress bar integration. Shows a dynamic window title with project, session, and model info, animates a braille spinner, and pulses Ghostty's native progress bar while the agent is working.
- [`librarian.ts`](extensions/librarian.ts) - Searches code across GitHub repositories in a subagent using Claude Haiku 4.5.
- [`oracle.ts`](extensions/oracle.ts) - Second opinion reasoning subagent using GPT 5.4.
- [`snippets.ts`](extensions/snippets.ts) - Lists code blocks from the last assistant message for further action.

## Skills

All skill files are in the [`skills`](skills) directory:

- [`gist`](skills/gist) - Download files from GitHub Gists using the `gh` CLI.
- [`note`](skills/note) - For creating and managing Denote notes in Emacs via `emacsclient`.
- [`tmux`](skills/tmux) - Remote control tmux sessions for interactive CLIs (python, gdb, etc.) by sending keystrokes and scraping pane output.
