# acli jira auth

Authenticate to use Atlassian CLI with Jira.

## login

Authenticate with an Atlassian host.

```bash
acli jira auth login [flags]
```

**Examples:**
```bash
# Authenticate using web browser (OAuth)
$ acli jira auth login --web

# Authenticate with your email, site name and API token
$ acli jira auth login --site "mysite.atlassian.net" --email "user@atlassian.com" --token < token.txt
# OR
$ echo <token> | acli jira auth login --site "mysite.atlassian.net" --email "user@atlassian.com" --token
```

**Options:**
- `-e, --email string` — User email
- `-s, --site string` — Atlassian instance site
- `--token` — Read token from standard input
- `-w, --web` — Authenticate using web browser

---

## logout

Logout from Jira account.

```bash
$ acli jira auth logout
```

---

## status

Show Jira account status.

```bash
$ acli jira auth status
```

---

## switch

Switch between Jira accounts.

```bash
acli jira auth switch [flags]
```

**Examples:**
```bash
# Interactive mode
$ acli jira auth switch

# Switch to a specific site
$ acli jira auth switch --site mysite.atlassian.net

# Switch to a specific email
$ acli jira auth switch --email user@atlassian.com

# Switch to a specific site and email
$ acli jira auth switch --site mysite.atlassian.net --email user@atlassian.com
```

**Options:**
- `-e, --email string` — Atlassian account email
- `-s, --site string` — Atlassian account site
