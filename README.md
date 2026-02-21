# pi-stuff

This repository stores customizations for the [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/).

## Extensions

All extension files are in the [`extensions`](extensions) directory:

- [`librarian.ts`](extensions/librarian.ts) - Cross-repository code research subagent.
- [`oracle.ts`](extensions/oracle.ts) - Second opinion subagent for complex analysis and debugging tasks.
- [`snippets.ts`](extensions/snippets.ts) - Lists markdown code blocks from the last assistant message for selection.

## Skills

All skill files are in the [`skills`](skills) directory:

- [`jira`](skills/jira) - For interacting with Atlassian Jira via `acli` (view, create, edit, transition issues, JQL search, etc.).
- [`note`](skills/note) - For creating and managing Denote notes in Emacs via `emacsclient`.


