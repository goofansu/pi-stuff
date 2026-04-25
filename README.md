# pi-stuff

This repository stores customizations for the [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/).

## Extensions

All extension files are in the [`extensions`](extensions) directory, including both my own extensions and ones sourced from others via [`extensions/Makefile`](extensions/Makefile). This keeps everything in one place and easy to maintain.

Here are the extensions I wrote:

- [`ghostty.ts`](extensions/ghostty.ts) - Ghostty terminal title and progress bar integration. Shows a dynamic window title with project, session, and model info, animates a braille spinner, and pulses Ghostty's native progress bar while the agent is working.
- [`librarian.ts`](extensions/librarian.ts) - Searches code across GitHub repositories in a subagent using GPT 5.4 Mini.
- [`oracle.ts`](extensions/oracle.ts) - Second opinion reasoning subagent using GPT 5.5.
- [`snippets.ts`](extensions/snippets.ts) - Lists code blocks from the last assistant message for further action.
- [`web-search.ts`](extensions/web-search.ts) - Searches the web using Brave LLM Context and returns extracted content, snippets, structured data, and sources for grounded answers. Use for current information, recent events, external facts, product/docs lookups, or other web-grounded research.

## Skills

All skill files are in the [`skills`](skills) directory:

- [`github`](skills/github) - Interact with GitHub via the `gh` CLI: download Gist files and create pull request review comments.
- [`note`](skills/note) - For creating and managing Denote notes in Emacs via `emacsclient`.
- [`summarize`](skills/summarize) - Fetch a URL or convert a local file (PDF/DOCX/HTML/etc.) into Markdown using `uvx markitdown`, optionally summarizing the result.
- [`worktree`](skills/worktree) - Manage git worktrees: check out PRs or branches in a separate directory, list, and remove worktrees.
