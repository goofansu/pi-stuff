# acli jira sprint

Jira sprint commands.

## list-workitems

List work items in a sprint.

```bash
acli jira sprint list-workitems [flags]
```

**Examples:**
```bash
$ acli jira sprint list-workitems --sprint 1 --board 6
```

**Options:**
- `--board int` — ID of the board (required)
- `--csv` — Output in CSV format
- `--fields string` — Comma-separated fields to include (default: `key,issuetype,summary,assignee,priority,status`)
- `--jql string` — JQL query to filter work items in the sprint
- `--json` — Output in JSON format
- `--limit int` — Maximum number of issues per page (default 50)
- `--paginate` — Fetch all pages of results
- `--sprint int` — ID of the sprint (required)
