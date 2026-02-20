---
name: acli
description: "Use acli to interact with Atlassian Jira and Confluence from the command line"
---

Use `acli` to interact with Atlassian Jira (and Confluence) from the command line.

## Prerequisites

Before running any `acli` commands, verify it is installed:

```bash
which acli
```

If the command is not found, stop and tell the user:

> `acli` is not installed. Please install it first: https://developer.atlassian.com/cloud/acli/guides/install-acli/

## Check a Jira Issue

To view a Jira issue by its ID:

```bash
acli jira workitem view <ISSUE_ID>
```

**Example:**
```bash
acli jira workitem view OA-27831
```

This returns the issue's key, type, summary, status, assignee, and description.

## Notes

- The Jira subcommand uses `workitem`, not `issue` (e.g. `acli jira workitem view`, not `acli jira issue view`).
- Use `acli jira workitem --help` to see all available workitem subcommands (create, update, list, etc.).
- Use `acli jira --help` for all Jira commands (board, sprint, project, field, filter, dashboard).
- Use `acli confluence --help` for Confluence commands.
