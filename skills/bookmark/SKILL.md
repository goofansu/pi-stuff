---
name: bookmark
description: >
  Use when the user wants to save a bookmark, bookmark a link, or save multiple
  URLs to Raindrop.io. Triggers on "bookmark this", "save this link", "add to
  raindrop", or when given one or more URLs to save.
---

# Bookmark

Save one or multiple bookmarks to [Raindrop.io](https://raindrop.io) via its REST API.

## Requirements

- **`RAINDROP_TOKEN`** environment variable must be set (a Raindrop.io API token — get one from raindrop.io/settings/integrations).
- **Required fields per bookmark:** `link`, `title`
- **Optional:** `note` — personal context about when/why the bookmark was saved (maps directly to Raindrop's `note` field)
- **Optional:** `tags` — array of strings; infer relevant tags from context if the user doesn't provide them

If the user doesn't provide a title, infer one from context (the page title if known, the URL path, or a short description from the conversation).

If the user doesn't provide tags, infer 1–3 short lowercase tags from the URL, title, or conversation context (e.g. `"api"`, `"docs"`, `"javascript"`).

If `RAINDROP_TOKEN` is not set, tell the user and stop.

---

## Saving a Single Bookmark

```bash
curl -s -X POST \
  -H "Authorization: Bearer $RAINDROP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "link": "https://example.com",
    "title": "Example Title",
    "note": "Why/when I saved this",
    "tags": ["tag1", "tag2"],
    "pleaseParse": {}
  }' \
  "https://api.raindrop.io/rest/v1/raindrop"
# pleaseParse: {} asks Raindrop to auto-fetch metadata (favicon, description, etc.) for the link
```

---

## Saving Multiple Bookmarks

Use the bulk endpoint when saving 2+ bookmarks in one shot (max 100 per request):

```bash
curl -s -X POST \
  -H "Authorization: Bearer $RAINDROP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"link": "https://example.com/a", "title": "Title A", "note": "Note A", "tags": ["tag1"], "pleaseParse": {}},
      {"link": "https://example.com/b", "title": "Title B", "note": "Note B", "tags": ["tag2"], "pleaseParse": {}}
    ]
  }' \
  "https://api.raindrop.io/rest/v1/raindrops"
```

| Count | Endpoint | Method |
|-------|----------|--------|
| 1     | `/rest/v1/raindrop` | POST |
| 2+    | `/rest/v1/raindrops` | POST |

---

## Updating a Bookmark

Use when the user wants to edit an existing bookmark (e.g. change title, add tags, update note). Requires the raindrop `id`.

```bash
curl -s -X PUT \
  -H "Authorization: Bearer $RAINDROP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Title",
    "note": "Updated note",
    "tags": ["tag1", "tag2"],
    "important": true
  }' \
  "https://api.raindrop.io/rest/v1/raindrop/{id}"
```

All fields from Create are valid (except `link` is optional). Use `pleaseParse: {}` to re-parse link metadata.

---

## Deleting a Bookmark

Moves the raindrop to **Trash**. Deleting again from Trash removes it **permanently**.

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer $RAINDROP_TOKEN" \
  "https://api.raindrop.io/rest/v1/raindrop/{id}"
```

Response: `{ "result": true }`

| Action | Endpoint | Method |
|--------|----------|--------|
| Update | `/rest/v1/raindrop/{id}` | PUT |
| Delete | `/rest/v1/raindrop/{id}` | DELETE |

---

## Workflow

1. **Collect** link(s), title(s), optional note(s), and optional tag(s) from the user. Ask for any missing required fields (`link`, `title`). Infer tags if not provided.
2. **Determine intent:** save (POST), update (PUT), or delete (DELETE)? For update/delete, obtain the raindrop `id` from the user or from a prior save response.
3. **Choose** single vs. bulk endpoint for saves based on count.
4. **Call** the API with `curl`. Pipe through `jq` if available for readable output.
5. **Check** the response: `"result": true` means success. Report the saved title(s) and link(s) to the user. On failure, show the `error` field.

---

## Response

Success returns `"result": true` plus the created item(s):

```json
// Single
{ "result": true, "item": { "_id": 123456789, "title": "...", "link": "..." } }

// Bulk
{ "result": true, "items": [{ "_id": 123456789, "title": "...", "link": "..." }, ...] }
```

Failure returns `"result": false` with an `error` field — show it to the user.
