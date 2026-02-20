# acli jira filter

Jira filter commands.

## add-favourite

Add a filter as a favourite.

```bash
$ acli jira filter add-favourite --filterId 10001
```

**Options:**
- `--filterId string` — Filter ID to mark as favourite

---

## change-owner

Change the owner of one or more filters.

```bash
$ acli jira filter change-owner --id 123,1234,12345 --owner anna@example.com
```

**Options:**
- `-f, --from-file string` — File containing list of filter IDs
- `--id string` — Comma-separated filter IDs
- `--ignore-errors` — Ignore errors and continue
- `--json` — Generate JSON output
- `--owner string` — Email of the new owner

---

## list

List filters that are mine or favourited.

```bash
acli jira filter list [flags]
```

**Examples:**
```bash
# List my filters
$ acli jira filter list --my

# List my favourite filters
$ acli jira filter list --favourite
```

**Options:**
- `--favourite` — List favourite filters
- `--json` — Output in JSON format
- `--my` — List my filters

---

## search

Search for Jira filters. When multiple parameters are present, all must be satisfied.

```bash
acli jira filter search [flags]
```

**Examples:**
```bash
$ acli jira filter search
$ acli jira filter search --paginate --csv
$ acli jira filter search --limit 5 --json

# Filter by owner and name
$ acli jira filter search --owner user@atlassian.com --name 'report'
```

**Options:**
- `--csv` — Generate CSV output
- `--json` — Generate JSON output
- `-l, --limit int` — Maximum number of filters to fetch (default 30)
- `-n, --name string` — Case-insensitive partial match on filter name
- `-e, --owner string` — Filter by owner email
- `--paginate` — Fetch all filters by paginating
