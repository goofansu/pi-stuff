# acli jira board

Jira board commands.

## list-sprints

Get all sprints for a board.

```bash
acli jira board list-sprints [flags]
```

**Examples:**
```bash
# Get all sprints
$ acli jira board list-sprints --id 123

# Get all sprints with state filters
$ acli jira board list-sprints --id 123 --state active,closed

# Get all sprints and output in JSON format
$ acli jira board list-sprints --id 123 --json

# Get all sprints and output in CSV format
$ acli jira board list-sprints --id 123 --csv
```

**Options:**
- `--csv` — Output in CSV format
- `--id string` — The ID of the board
- `--json` — Output in JSON format
- `--limit int` — Limit the number of sprints (default 50)
- `--paginate` — Load all sprints, paginating as needed
- `--state string` — Filter by state: `future`, `active`, `closed` (comma-separated)

---

## search

Search through all boards.

```bash
acli jira board search [flags]
```

**Options:**
- `--csv` — Output in CSV format
- `--filter string` — Filter ID (not supported for next-gen boards)
- `--json` — Output in JSON format
- `--limit int` — Limit the number of boards (default 50)
- `--name string` — Filter boards by name (partial match)
- `--orderBy string` — Order by: `name`, `-name`, `+name`
- `--paginate` — Load all boards
- `--private` — Append private boards to results
- `--project string` — Filter by project key
- `--type string` — Filter by type: `scrum`, `kanban`, `simple`
