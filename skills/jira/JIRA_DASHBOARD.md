# acli jira dashboard

Jira dashboard commands.

## search

Search for Jira dashboards. When multiple parameters are present, all must be satisfied.

```bash
acli jira dashboard search [flags]
```

**Examples:**
```bash
$ acli jira dashboard search
$ acli jira dashboard search --paginate --csv
$ acli jira dashboard search --limit 5 --json

# Filter by owner and name
$ acli jira dashboard search --owner user@atlassian.com --name 'report'
```

**Options:**
- `--csv` — Generate CSV output
- `--json` — Generate JSON output
- `-l, --limit int` — Maximum number of dashboards to fetch (default 30)
- `-n, --name string` — Case-insensitive partial match on dashboard name
- `-e, --owner string` — Filter dashboards by owner email
- `--paginate` — Fetch all dashboards by paginating
