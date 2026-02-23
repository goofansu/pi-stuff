# pi-stuff

This repository stores customizations for the [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/).

## Extensions

All extension files are in the [`extensions`](extensions) directory — both ones I wrote and ones sourced from others (through [`extensions/Makefile`](extensions/Makefile)). That keeps everything in one place, easy to maintain. 

Here is a list of extensions I wrote:

- [`gondolin.ts`](extensions/gondolin.ts) - Sandboxes all tool calls (read/write/edit/bash) inside a Gondolin micro-VM via `--gondolin` flag; mounts the current directory at `/workspace` in the VM.
- [`librarian.ts`](extensions/librarian.ts) - Searches code across GitHub repositories in a subagent; prefers Kimi K2.5 (`kimi-coding/k2p5`), falls back to Claude Sonnet 4.6, at medium thinking level.
- [`oracle.ts`](extensions/oracle.ts) - Second opinion reasoning subagent using GPT 5.2 (`openai-codex/gpt-5.2`) at medium thinking level.
- [`snippets.ts`](extensions/snippets.ts) - Lists code blocks from the last assistant message for further action.

## Skills

All skill files are in the [`skills`](skills) directory:

- [`jira`](skills/jira) - For interacting with Atlassian Jira via `acli`.
- [`note`](skills/note) - For creating and managing Denote notes in Emacs via `emacsclient`.
