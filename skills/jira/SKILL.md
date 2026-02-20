---
name: jira
description: "Use acli to interact with Atlassian Jira from the command line"
---

Use `acli` to interact with Atlassian Jira (and Confluence) from the command line.

## Prerequisites

Before running any `acli` commands, verify it is installed:

```bash
which acli
```

If the command is not found, stop and tell the user:

> `acli` is not installed. Please install it first: https://developer.atlassian.com/cloud/acli/guides/install-acli/

## Jira Subcommand Reference

- [jira auth](JIRA_AUTH.md) — login, logout, status, switch
- [jira board](JIRA_BOARD.md) — list-sprints, search
- [jira dashboard](JIRA_DASHBOARD.md) — search
- [jira field](JIRA_FIELD.md) — cancel-delete, create, delete
- [jira filter](JIRA_FILTER.md) — add-favourite, change-owner, list, search
- [jira project](JIRA_PROJECT.md) — archive, create, delete, list, restore, update, view
- [jira sprint](JIRA_SPRINT.md) — list-workitems
- [jira workitem](JIRA_WORKITEM.md) — archive, assign, attachment, clone, comment, create, create-bulk, delete, edit, link, search, transition, unarchive, view, watcher

