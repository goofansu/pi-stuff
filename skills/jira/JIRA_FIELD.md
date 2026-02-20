# acli jira field

Jira custom field commands.

## cancel-delete

Restore a custom field from the trash.

```bash
$ acli jira field cancel-delete --id customfield_12345
```

**Options:**
- `--id string` — The ID of the custom field to restore

---

## create

Create a custom field in Jira.

```bash
acli jira field create [flags]
```

**Examples:**
```bash
# Create a text field
$ acli jira field create --name "Customer Name" --type "com.atlassian.jira.plugin.system.customfieldtypes:textfield"

# Create a select field with searcher
$ acli jira field create --name "Priority Level" --type "com.atlassian.jira.plugin.system.customfieldtypes:select" --searcherKey "com.atlassian.jira.plugin.system.customfieldtypes:multiselectsearcher"

# Create a field with description
$ acli jira field create --name "Release Date" --type "com.atlassian.jira.plugin.system.customfieldtypes:datepicker" --description "The planned release date"
```

**Options:**
- `--description string` — Description of the custom field
- `--json` — Output in JSON format
- `--name string` — Name of the custom field
- `--searcherKey string` — Searcher key for the custom field
- `--type string` — Type of the custom field

---

## delete

Move a custom field to trash.

```bash
$ acli jira field delete --id customfield_12345
```

**Options:**
- `--id string` — The ID of the custom field to trash
