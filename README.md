# agent-stuff

This repository stores customizations for coding agents. Files are copied or symlinked into agent directories. For example, `~/.pi/agent/extensions` a symlink to the `pi/extensions` directory in this repository.

## pi extensions

The following are my custom extensions for [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/):

* [`snippets.ts`](pi/extensions/snippets.ts) - Code snippet viewer for the last assistant message. Lists all markdown code blocks and lets you copy them to clipboard or ask for an explanation with custom instructions. Invokable via `/snippets`.
* [`librarian.ts`](pi/extensions/librarian.ts) - Cross-repository code research subagent. Spawns an isolated `pi` process with Claude Sonnet 4.5 to search and read code across GitHub repositories using `gh` CLI. Invokable as a tool by the agent or directly via `/librarian`.
* [`oracle.ts`](pi/extensions/oracle.ts) - Second opinion reasoning subagent. Spawns an isolated `pi` process with GPT-5.2 for complex analysis, debugging, and review tasks. The agent can autonomously consult the oracle, or you can invoke it directly via `/oracle`.
