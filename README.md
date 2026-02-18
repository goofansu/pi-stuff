# pi-stuff

This repository stores customizations for the [pi coding agent](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/).

Files and directories are symlinked into `~/.pi/agent/`:

- [`extensions`](extensions) → `~/.pi/agent/extensions/`
- [`skills`](skills) → `~/.pi/agent/skills/`
- [`keybindings.json`](keybindings.json) → `~/.pi/agent/keybindings.json`

## Extensions

All extensions files are in the [`extensions`](extensions) directory:

- [`extensions/snippets.ts`](extensions/snippets.ts) - Code snippet viewer for the last assistant message. Lists markdown code blocks and lets you copy them to clipboard or ask for an explanation with custom instructions. Invokable via `/snippets`.
- [`extensions/librarian.ts`](extensions/librarian.ts) - Cross-repository code research subagent. Spawns an isolated `pi` process with kimi-coding/k2p5 (cost-efficient default) to search and read code across GitHub repositories using `gh` CLI. Invokable as a tool by the agent or directly via `/librarian`.
- [`extensions/oracle.ts`](extensions/oracle.ts) - Second opinion reasoning subagent. Spawns an isolated `pi` process with openai-codex/gpt-5.2 for complex analysis, debugging, and review tasks. The agent can autonomously consult the oracle, or you can invoke it directly via `/oracle`.

## Skills

All skills files are in the [`skills`](skills) directory:

- [`skills/commit/SKILL.md`](skills/commit/SKILL.md) - For creating git commits with concise Conventional Commits-style subjects. ([via](https://github.com/mitsuhiko/agent-stuff/tree/main/skills/commit))
- [`skills/gh-issue-sync/SKILL.md`](skills/gh-issue-sync/SKILL.md) - For using `gh-issue-sync` command to manage GitHub issues. ([via](https://github.com/mitsuhiko/gh-issue-sync/blob/main/skill/SKILL.md))
- [`skills/mlwcli/SKILL.md`](skills/mlwcli/SKILL.md) - For using `mlwcli` command to manage Miniflux, Linkding, and Wallabag. ([via](https://github.com/goofansu/mlwcli/blob/main/skill/SKILL.md))
- [`skills/web-browser/SKILL.md`](skills/web-browser/SKILL.md) - For browsing the web by controlling Chrome/Chromium via CDP actions. ([via](https://github.com/mitsuhiko/agent-stuff/tree/main/skills/web-browser))
