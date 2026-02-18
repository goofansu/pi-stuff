# pi-stuff

This repository stores customizations for the [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/).

## Install

```bash
gh repo clone goofansu/pi-stuff ~/code/pi-stuff
pi install ~/code/pi-stuff
```

## Extensions

All extension files are in the [`extensions`](extensions) directory:

- [`answer.ts`](extensions/answer.ts) - Interactive TUI for answering questions one by one. ([source](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/answer.ts))
- [`context.ts`](extensions/context.ts) - Quick context breakdown (extensions, skills, AGENTS.md/CLAUDE.md) + token usage; highlights skills that were actually read/loaded. ([source](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/context.ts))
- [`notify.ts`](extensions/notify.ts) - Sends native desktop notifications when the agent finishes (OSC 777 compatible terminals). ([source](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/notify.ts))
- [`review.ts`](extensions/review.ts) - Code review command inspired by Codex. Supports reviewing uncommitted changes, against a base branch (PR style), specific commits, pull requests, or with custom instructions. ([source](https://github.com/mitsuhiko/agent-stuff/blob/main/pi-extensions/review.ts))
- [`librarian.ts`](extensions/librarian.ts) - Cross-repository code research subagent. Spawns an isolated `pi` process to search and read code across GitHub repositories using `gh` CLI.
- [`oracle.ts`](extensions/oracle.ts) - Second opinion reasoning subagent. Spawns an isolated `pi` process for complex analysis, debugging, and review tasks.
- [`snippets.ts`](extensions/snippets.ts) - Code snippet viewer for the last assistant message. Lists markdown code blocks and lets you copy them to clipboard or ask for an explanation with custom instructions.

## Skills

All skill files are in the [`skills`](skills) directory:

- [`commit`](skills/commit) - For creating git commits using concise Conventional Commits-style subjects. ([source](https://github.com/mitsuhiko/agent-stuff/tree/main/skills/commit))
- [`gh-issue-sync`](skills/gh-issue-sync) - For using `gh-issue-sync` command to manage GitHub issues. ([source](https://github.com/mitsuhiko/gh-issue-sync/blob/main/skill/SKILL.md))
- [`mlwcli`](skills/mlwcli) - For using `mlwcli` command to manage Miniflux, Linkding, and Wallabag. ([source](https://github.com/goofansu/mlwcli/blob/main/skill/SKILL.md))
- [`web-browser`](skills/web-browser) - For using Puppeteer in a Node environment to browse the web. ([source](https://github.com/mitsuhiko/agent-stuff/tree/main/skills/web-browser))
