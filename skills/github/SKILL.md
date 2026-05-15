---
name: github
description: Use when the user wants to find, read, or download GitHub resources (issues, gists) to local. Triggers on "pull this issue", "download that gist", "get issue 123", "find my gists", "sync issues locally", or any request involving GitHub issues or gists that need to be fetched to disk for inspection or processing.
---

# GitHub

Fetch GitHub resources to disk and read them locally. This avoids fragile API round-trips during analysis — pull once, then work from local files.

## Reference Map

| Resource | Sub-document | When to load |
|----------|-------------|--------------|
| Issues   | [issues.md](./references/issues.md) | Pulling, searching, or reading issues via `gh-issue-sync` |
| Gists    | [gists.md](./references/gists.md)   | Downloading or inspecting gist files via `gh`             |

## Core Principles

- **Pull before reading** — fetch the resource to disk first, then read from the local file. This gives you a stable snapshot and avoids repeated API calls.
- **Read incrementally** — issues and gists can be large. Read in small chunks with offset/limit and stop as soon as you have what you need.
- **Use `gh` for writes** — creating, editing, or closing resources goes through the `gh` CLI directly, not through local file edits.
