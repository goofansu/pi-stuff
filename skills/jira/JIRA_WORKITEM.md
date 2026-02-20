# acli jira workitem

Jira work item commands.

## archive

Archive one or more work items.

```bash
acli jira workitem archive [flags]
```

**Examples:**
```bash
$ acli jira workitem archive --key "KEY-1,KEY-2"
$ acli jira workitem archive --jql "project = TEAM"
$ acli jira workitem archive --filter 10001
$ acli jira workitem archive --from-file "issues.txt" --yes
```

**Options:**
- `--filter string` — Filter ID of work items to archive
- `-f, --from-file string` — File of work item IDs/keys (comma, space, or newline separated)
- `--ignore-errors` — Ignore errors and continue
- `--jql string` — JQL query
- `--json` — Generate JSON output
- `-k, --key string` — Comma-separated work item keys
- `-y, --yes` — Confirm without prompting

---

## assign

Assign work items to an assignee.

```bash
acli jira workitem assign [flags]
```

**Examples:**
```bash
$ acli jira workitem assign --key "KEY-1" --assignee "@me"
$ acli jira workitem assign --jql "project = TEAM" --assignee "user@atlassian.com"
$ acli jira workitem assign --filter 10001 --assignee "default"
$ acli jira workitem assign --from-file "issues.txt" --remove-assignee --json
```

**Options:**
- `-a, --assignee string` — Email or account ID; use `@me` to self-assign, `default` for project default
- `--filter string` — Filter ID
- `-f, --from-file string` — File of work item IDs/keys
- `--ignore-errors` — Ignore errors and continue
- `--jql string` — JQL query
- `--json` — Generate JSON output
- `-k, --key string` — Work item keys
- `--remove-assignee` — Remove the assignee
- `-y, --yes` — Confirm without prompting

---

## attachment delete

Delete an attachment from a work item.

```bash
$ acli jira workitem attachment delete --id 12345
```

**Options:**
- `--id string` — ID of the attachment to delete

---

## attachment list

List all attachments for a work item.

```bash
$ acli jira workitem attachment list --key TEST-123
```

**Options:**
- `--json` — Output in JSON format
- `--key string` — Work item key

---

## clone

Clone one or more work items.

```bash
acli jira workitem clone [flags]
```

**Examples:**
```bash
$ acli jira workitem clone --key "KEY-1,KEY-2" --to-project "TEAM"
```

**Options:**
- `--filter string` — Filter ID
- `-f, --from-file string` — File of work item IDs/keys
- `--ignore-errors` — Ignore errors and continue
- `--jql string` — JQL query
- `--json` — Generate JSON output
- `-k, --key string` — Work item keys
- `--to-project string` — Target project key
- `--to-site string` — Target site (defaults to current authenticated site)
- `-y, --yes` — Confirm without prompting

---

## comment create

Add a comment to one or more work items.

```bash
acli jira workitem comment create [flags]
```

**Examples:**
```bash
$ acli jira workitem comment --key "KEY-1" --body "This is a comment"
$ acli jira workitem comment --jql "project = TEAM" --body-file "comment.txt" --edit-last
$ acli jira workitem comment --jql "project = TEAM" --editor
```

**Options:**
- `-b, --body string` — Comment body (plain text or ADF)
- `-F, --body-file string` — Plain text file or ADF file
- `-e, --edit-last` — Edit the last comment from the same author
- `--editor` — Open text editor to write the body
- `--filter string` — Filter ID
- `--ignore-errors` — Ignore errors and continue
- `--jql string` — JQL query
- `--json` — Generate JSON output
- `-k, --key string` — Work item keys

---

## comment delete

Delete a comment from a work item.

```bash
$ acli jira workitem comment delete --key TEST-1 --id 10023
```

**Options:**
- `--id string` — ID of the comment to delete
- `--key string` — Work item key

---

## comment list

List comments for a work item.

```bash
$ acli jira workitem comment list --key TEST-123
```

**Options:**
- `--json` — Output in JSON format
- `--key string` — Work item key
- `--limit int` — Maximum comments per page (default 50)
- `--order string` — Order by `created` or `updated` (default `+created`)
- `--paginate` — Fetch all pages

---

## comment update

Update a comment on a work item.

```bash
acli jira workitem comment update [flags]
```

**Examples:**
```bash
$ acli jira workitem comment update --key TEST-123 --id 10001 --body "Updated comment text"
$ acli jira workitem comment update --key TEST-123 --id 10001 --body-file comment.txt
$ acli jira workitem comment update --key TEST-123 --id 10001 --body-adf comment.json
$ acli jira workitem comment update --key TEST-123 --id 10001 --body "Internal" --visibility-role "Administrators"
$ acli jira workitem comment update --key TEST-123 --id 10001 --body "Team update" --visibility-group "dev-team" --notify
```

**Options:**
- `-b, --body string` — Comment body text
- `--body-adf string` — Body in ADF (JSON file)
- `-F, --body-file string` — Plain text file
- `--id string` — Comment ID to update
- `--key string` — Work item key
- `--notify` — Notify users about the change
- `--visibility-group string` — Restrict visibility to a group
- `--visibility-role string` — Restrict visibility to a role

---

## comment visibility

Get visibility options for work item comments.

```bash
acli jira workitem comment visibility [flags]
```

**Examples:**
```bash
# Get project roles for visibility
$ acli jira workitem comment visibility --role --project PROJ-123

# List available groups
$ acli jira workitem comment visibility --group
```

**Options:**
- `--group` — List available groups for comment visibility
- `--project string` — Project key (required with `--role`)
- `--role` — Get project roles for comment visibility

---

## create

Create a Jira work item.

```bash
acli jira workitem create [flags]
```

**Examples:**
```bash
$ acli jira workitem create --summary "New Task" --project "TEAM" --type "Task"
$ acli jira workitem create --from-file "workitem.txt" --project "PROJ" --type "Bug" --assignee "user@atlassian.com" --label "bug,cli"
$ acli jira workitem create --generate-json
$ acli jira workitem create --from-json "workitem.json"
```

**Options:**
- `-a, --assignee string` — Email or account ID; use `@me`, `default`
- `-d, --description string` — Description (plain text or ADF)
- `--description-file string` — Read description from file
- `-e, --editor` — Open editor for summary and description
- `-f, --from-file string` — Read summary/description from file
- `--from-json string` — Read work item definition from JSON
- `--generate-json` — Generate a JSON template
- `--json` — Output in JSON
- `-l, --label strings` — Labels (comma-separated)
- `--parent string` — Parent work item ID
- `-p, --project string` — Project key
- `-s, --summary string` — Work item summary
- `-t, --type string` — Work item type (Epic, Story, Task, Bug, etc.)

---

## create-bulk

Bulk create Jira work items.

```bash
acli jira workitem create-bulk [flags]
```

**Examples:**
```bash
$ acli jira workitem create-bulk --from-json issues.json
$ acli jira workitem create-bulk --from-csv issues.csv
$ acli jira workitem create-bulk --generate-json
```

**Options:**
- `--from-csv string` — CSV file (columns: summary, projectKey, issueType, description, label, parentIssueId, assignee)
- `--from-json string` — JSON file containing array of issue objects
- `--generate-json` — Print example JSON structure
- `--ignore-errors` — Ignore errors and continue
- `--yes` — Confirm without prompting

---

## delete

Delete one or more work items.

```bash
acli jira workitem delete [flags]
```

**Examples:**
```bash
$ acli jira workitem delete --key "KEY-1,KEY-2"
$ acli jira workitem delete --jql "project = TEAM"
$ acli jira workitem delete --filter 10001
$ acli jira workitem delete --from-file "issues.txt" --yes
```

**Options:**
- `--filter string` — Filter ID
- `-f, --from-file string` — File of work item IDs/keys
- `--ignore-errors` — Ignore errors and continue
- `--jql string` — JQL query
- `--json` — Generate JSON output
- `-k, --key string` — Work item keys
- `-y, --yes` — Confirm without prompting

---

## edit

Edit one or more work items.

```bash
acli jira workitem edit [flags]
```

**Examples:**
```bash
$ acli jira workitem edit --key "KEY-1,KEY-2" --summary "New Summary"
$ acli jira workitem edit --jql "project = TEAM" --assignee "user@atlassian.com"
$ acli jira workitem edit --filter 10001 --description "Updated description" --yes
$ acli jira workitem edit --generate-json
$ acli jira workitem edit --from-json "workitem.json"
```

**Options:**
- `-a, --assignee string` — Email or account ID; use `@me`, `default`
- `-d, --description string` — Description (plain text or ADF)
- `--description-file string` — Read description from file
- `--filter string` — Filter ID
- `--from-json string` — Read work item definition from JSON
- `--generate-json` — Generate a JSON template
- `--ignore-errors` — Ignore errors and continue
- `--jql string` — JQL query
- `--json` — Generate JSON output
- `-k, --key string` — Work item keys
- `-l, --labels string` — Labels to set
- `--remove-assignee` — Remove the assignee
- `--remove-labels string` — Labels to remove
- `-s, --summary string` — New summary
- `-t, --type string` — New work item type
- `-y, --yes` — Confirm without prompting

---

## link create

Create links between work items.

```bash
acli jira workitem link create [flags]
```

**Examples:**
```bash
$ acli jira workitem link create --out KEY-123 --in KEY-456 --type Blocks
$ acli jira workitem link create --from-json links.json
$ acli jira workitem link create --generate-json
```

**Options:**
- `--from-csv string` — CSV: outward ID, inward ID, link type (first row ignored)
- `--from-json string` — JSON file for link mappings
- `--generate-json` — Print example JSON structure
- `--ignore-errors` — Ignore errors and continue
- `--in string` — Inward work item ID
- `--out string` — Outward work item ID
- `--type string` — Link type (accepts outward descriptions)
- `--yes` — Confirm without prompting

---

## link delete

Delete links between work items.

```bash
acli jira workitem link delete [flags]
```

**Examples:**
```bash
$ acli jira workitem link delete --id 10001
$ acli jira workitem link delete --from-json links.json
$ acli jira workitem link delete --from-csv links.csv
```

**Options:**
- `--from-csv string` — CSV file of link IDs to delete
- `--from-json string` — JSON file of link IDs to delete
- `--id string` — Link IDs to delete
- `--ignore-errors` — Ignore errors and continue
- `--yes` — Confirm without prompting

---

## link list

List all links for a work item.

```bash
$ acli jira workitem link list --key TEST-123
```

**Options:**
- `--json` — Output in JSON format
- `--key string` — Work item key

---

## link type

Get available work item link types.

```bash
$ acli jira workitem link type
$ acli jira workitem link type --json
```

**Options:**
- `--json` — Output in JSON format

---

## search

Search for work items using JQL or a filter.

```bash
acli jira workitem search [flags]
```

**Examples:**
```bash
$ acli jira workitem search --jql "project = TEAM" --paginate
$ acli jira workitem search --jql "project = TEAM" --count
$ acli jira workitem search --jql "project = TEAM" --fields "key,summary,assignee" --csv
$ acli jira workitem search --jql "project = TEAM" --limit 50 --json
$ acli jira workitem search --filter 10001 --web
```

**Options:**
- `--count` — Return count of matching work items
- `--csv` — Generate CSV output
- `-f, --fields string` — Fields to display (default: `issuetype,key,assignee,priority,status,summary`)
- `--filter string` — Filter ID
- `-j, --jql string` — JQL query
- `--json` — Generate JSON output
- `-l, --limit int` — Maximum number of work items
- `--paginate` — Fetch all work items by paginating
- `-w, --web` — Open results in web browser

---

## transition

Transition a work item to a new status.

```bash
acli jira workitem transition [flags]
```

**Examples:**
```bash
$ acli jira workitem transition --key "KEY-1,KEY-2" --status "Done"
$ acli jira workitem transition --jql "project = TEAM" --status "In Progress"
$ acli jira workitem transition --filter 10001 --status "To Do" --yes
```

**Options:**
- `--filter string` — Filter ID
- `--ignore-errors` — Ignore errors and continue
- `--jql string` — JQL query
- `--json` — Generate JSON output
- `-k, --key string` — Work item keys
- `-s, --status string` — Target status
- `-y, --yes` — Confirm without prompting

---

## unarchive

Unarchive one or more work items.

```bash
acli jira workitem unarchive [flags]
```

**Examples:**
```bash
$ acli jira workitem unarchive --key "KEY-1,KEY-2"
$ acli jira workitem unarchive --from-file "issues.txt" --yes
```

**Options:**
- `-f, --from-file string` — File of work item IDs/keys
- `--ignore-errors` — Ignore errors and continue
- `--json` — Generate JSON output
- `-k, --key string` — Work item keys
- `-y, --yes` — Confirm without prompting

---

## view

Retrieve information about work items.

```bash
acli jira workitem view [key] [flags]
```

**Examples:**
```bash
$ acli jira workitem view KEY-123
$ acli jira workitem view KEY-123 --json
$ acli jira workitem view KEY-123 --fields summary,comment
$ acli jira workitem view KEY-123 --web
```

**Options:**
- `-f, --fields string` — Fields to return (default: `key,issuetype,summary,status,assignee,description`). Use `*all`, `*navigable`, or prefix with `-` to exclude
- `--json` — Generate JSON output
- `-w, --web` — Open in web browser

---

## watcher remove

Remove a watcher from a work item.

```bash
$ acli jira workitem watcher remove --key TEST-1 --user 5b10ac8d82e05b22cc7d4ef5
```

**Options:**
- `--key string` — Work item key
- `--user string` — Atlassian account ID of the watcher to remove
