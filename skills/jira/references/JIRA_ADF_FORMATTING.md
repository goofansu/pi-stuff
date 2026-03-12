# Jira ADF Formatting

Jira only renders rich formatting (headings, tables, lists, code blocks) when content is submitted as **ADF (Atlassian Document Format)** JSON. Posting Markdown as plain text will show raw syntax characters (`##`, `**`, `|---|`) literally.

Use ADF whenever content contains headings, tables, bullet/numbered lists, code blocks, or bold/italic spans. For plain prose, `--body "text"` or `--description "text"` is fine.

---

## Ruby ADF Builder

Use this helper to build ADF JSON programmatically:

```ruby
require "json"

def text(str, marks = [])
  node = { "type" => "text", "text" => str }
  node["marks"] = marks unless marks.empty?
  node
end
def bold(str)   = text(str, [{ "type" => "strong" }])
def code(str)   = text(str, [{ "type" => "code" }])
def heading(level, str) = { "type" => "heading", "attrs" => { "level" => level }, "content" => [text(str)] }
def para(*nodes)        = { "type" => "paragraph", "content" => nodes }
def rule                = { "type" => "rule" }
def bullet_list(items)  = { "type" => "bulletList",  "content" => items.map { |i| { "type" => "listItem", "content" => [para(*i)] } } }
def ordered_list(items) = { "type" => "orderedList", "content" => items.map { |i| { "type" => "listItem", "content" => [para(*i)] } } }
def th(*nodes) = { "type" => "tableHeader", "attrs" => {}, "content" => [para(*nodes)] }
def td(*nodes) = { "type" => "tableCell",   "attrs" => {}, "content" => [para(*nodes)] }
def table(rows) = { "type" => "table", "attrs" => { "isNumberColumnEnabled" => false, "layout" => "default" },
                    "content" => rows.map { |cells| { "type" => "tableRow", "content" => cells } } }

doc = { "version" => 1, "type" => "doc", "content" => [
  # build your content nodes here using the helpers above
] }

puts JSON.pretty_generate(doc)
```

---

## Pattern 1 — Rich comment

`comment create` has no `--body-adf` flag. Use a two-step approach:

```bash
# 1. Create a placeholder to get a comment ID
acli jira workitem comment create --key OA-123 --body "placeholder"

# 2. Get the new comment ID
acli jira workitem comment list --key OA-123 --json

# 3. Replace with ADF content
acli jira workitem comment update --key OA-123 --id <comment-id> --body-adf /tmp/comment.json
```

---

## Pattern 2 — Rich ticket description (create or edit)

There is no `--description-adf` flag. Embed ADF directly in a work item JSON and pass it via `--from-json`:

```json
{
  "summary": "My ticket summary",
  "description": {
    "version": 1,
    "type": "doc",
    "content": []
  }
}
```

```bash
# Generate the JSON template to see all available fields
acli jira workitem create --generate-json

# Create with ADF description
acli jira workitem create --project OA --type Task --from-json /tmp/workitem.json

# Edit an existing ticket's description
acli jira workitem edit --key OA-123 --from-json /tmp/workitem.json
```

---

## Known limitations

- **`comment create --body-file`** sends plain text only — does not render ADF even if you pass a `.json` file.
- **`--description "..."`** on `create`/`edit` accepts plain text only despite what the docs say; use `--from-json` for ADF.
- **Attachment upload is not supported** — `acli attachment` only supports `list` and `delete`. Use the Jira web UI to attach files.
