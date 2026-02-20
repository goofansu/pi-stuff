# acli jira project

Jira project commands.

## archive

Archive a Jira project.

```bash
$ acli jira project archive --key "TEAM"
```

**Options:**
- `--key string` — Key of the project to archive

---

## create

Create a Jira project.

```bash
acli jira project create [flags]
```

**Examples:**
```bash
# Create a project from an existing project
$ acli jira project create --from-project "TEAM" --key "NEWTEAM" --name "New Project"

# With optional fields
$ acli jira project create --from-project "TEAM" --key "NEWTEAM" --name "New Project" --description "Description" --url "https://example.com" --lead-email "user@atlassian.com"

# Generate a JSON template
$ acli jira project create --generate-json

# Create from a JSON file
$ acli jira project create --from-json "project.json"
```

**Options:**
- `-d, --description string` — Project description
- `-j, --from-json string` — Read project details from JSON file
- `-f, --from-project string` — Clone from an existing project (company managed only)
- `-g, --generate-json` — Generate a JSON template for project creation
- `-k, --key string` — Project key
- `-l, --lead-email string` — Lead user email
- `-n, --name string` — Project name
- `-u, --url string` — Project URL

---

## delete

Delete a Jira project.

```bash
$ acli jira project delete --key "TEAM"
```

**Options:**
- `--key string` — Key of the project to delete

---

## list

List projects visible to the user.

```bash
acli jira project list [flags]
```

**Examples:**
```bash
# List up to 20 recently viewed projects
$ acli jira project list --recent

# List all projects
$ acli jira project list --paginate

# List 50 projects in JSON
$ acli jira project list --limit 50 --json
```

**Options:**
- `--json` — Generate JSON output
- `-l, --limit int` — Maximum number of projects (default 30)
- `--paginate` — Fetch all pages (ignores `--limit`)
- `--recent` — Return up to 20 recently viewed projects

---

## restore

Restore an archived Jira project.

```bash
$ acli jira project restore --key "TEAM"
```

**Options:**
- `--key string` — Key of the project to restore

---

## update

Update a Jira project.

```bash
acli jira project update [flags]
```

**Examples:**
```bash
# Update project key and name
$ acli jira project update --project-key "TEAM1" --key "TEAM" --name "New Name"

# Generate a JSON template
$ acli jira project update --generate-json

# Update from a JSON file
$ acli jira project update --project-key "TEAM1" --from-json "project.json"
```

**Options:**
- `-d, --description string` — New project description
- `-j, --from-json string` — Read updated details from JSON file
- `-g, --generate-json` — Generate a JSON template for project update
- `-k, --key string` — New project key
- `-l, --lead-email string` — New lead user email
- `-n, --name string` — New project name
- `-p, --project-key string` — Key of the project to update
- `-u, --url string` — New project URL

---

## view

Fetch a Jira project.

```bash
acli jira project view [flags]
```

**Examples:**
```bash
$ acli jira project view --key "TEAM"
$ acli jira project view --key "TEAM" --json
```

**Options:**
- `-j, --json` — Output in JSON format
- `--key string` — Key of the project to fetch
