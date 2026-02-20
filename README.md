# pi-stuff

This repository stores customizations for the [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/).

## Extensions

All extension files are in the [`extensions`](extensions) directory:

- [`answer.ts`](extensions/answer.ts) - Custom interactive TUI for answering questions. ([source](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/answer.ts))
- [`context.ts`](extensions/context.ts) - Small TUI view showing what's loaded and available. ([source](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/context.ts))
- [`librarian.ts`](extensions/librarian.ts) - Cross-repository code research subagent.
- [`notify.ts`](extensions/notify.ts) - Sends a native desktop notification when the agent finishes and is waiting for input. ([source](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/notify.ts))
- [`oracle.ts`](extensions/oracle.ts) - Second opinion subagent for complex analysis and debugging tasks.
- [`review.ts`](extensions/review.ts) - Provides a `/review` command that prompts the agent to review code changes. ([source](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/review.ts))
- [`snippets.ts`](extensions/snippets.ts) - Lists markdown code blocks from the last assistant message for selection.

## Skills

Local skill files are in the [`skills`](skills) directory:

- [`jira`](skills/jira) - For interacting with Atlassian Jira via `acli` (view, create, edit, transition issues, JQL search, etc.).
- [`note`](skills/note) - For creating and managing Denote notes in Emacs via `emacsclient`.

The following skills are installed globally via `make add-skills` (using `npx skills`):

- [`commit`](https://github.com/mitsuhiko/agent-stuff/tree/main/skills/commit) - For creating git commits using concise Conventional Commits-style subjects.
- [`gh-issue-sync`](https://github.com/mitsuhiko/gh-issue-sync) - For managing GitHub issues locally as Markdown files.
- [`skill-creator`](https://github.com/anthropics/skills) - Guide for creating effective skills.
- [`web-browser`](https://github.com/mitsuhiko/agent-stuff/tree/main/skills/web-browser) - For using Puppeteer in a Node environment to browse the web.
