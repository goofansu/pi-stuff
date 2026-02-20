---
name: note
description: "Create and manage Denote notes in Emacs via emacsclient."
---

# Denote Skill

Create and manage [Denote](https://protesilaos.com/emacs/denote) notes by sending commands to a running Emacs GUI server via `emacsclient -s gui`.

## Prerequisites

Verify a running Emacs server is reachable:

```bash
emacsclient -s gui -e "t"
```

If this fails, tell the user:
> No Emacs GUI server found on socket `gui`. Start one inside Emacs with `M-x server-start` (or ensure `(server-start)` is in your config).

---

## `denote` Function Signature

```elisp
(denote &optional TITLE KEYWORDS FILE-TYPE DIRECTORY DATE TEMPLATE SIGNATURE IDENTIFIER)
```

| Argument     | Type                     | Notes                                                                 |
|--------------|--------------------------|-----------------------------------------------------------------------|
| `TITLE`      | string                   | Note title. Becomes part of the filename.                            |
| `KEYWORDS`   | list of strings          | Tags/keywords, e.g. `(list "emacs" "work")`. Sorted alphabetically. |
| `FILE-TYPE`  | symbol                   | Always use `org`.                                                    |
| `DIRECTORY`  | string path              | Must be `denote-directory` or a pre-existing subdirectory of it.     |
| `DATE`       | string                   | e.g. `"2025-06-01"` or `"2025-06-01 14:30"`. `nil` = now.          |
| `TEMPLATE`   | symbol                   | A key from `denote-templates`. Omit if unused.                       |
| `SIGNATURE`  | string                   | Optional signature component added to the filename.                   |
| `IDENTIFIER` | string                   | Custom identifier (must match `denote-date-identifier-format`).       |

---

## Note Types and Subdirectories

| Note type | DIRECTORY argument                |
|-----------|-----------------------------------|
| Work      | `(concat (denote-directory) "work")` |
| General   | `nil` (uses `denote-directory`)   |

---

## Creating Notes

Always use `org` as the file type. `denote` returns the path of the newly created file.

```bash
# General note
emacsclient -s gui -e '(denote "My note title" (list "tag1") (quote org))'

# Work note — always use the "work" subdirectory
emacsclient -s gui -e '(denote "Meeting notes" (list "work") (quote org) (concat (denote-directory) "work"))'

# With a specific date (back-dated note)
emacsclient -s gui -e '(denote "Old entry" (list "journal") (quote org) nil "2024-01-15")'
```

After creating the note, append content under a `* Context` heading:

```bash
cat >> "/path/to/note.org" << 'EOF'

* Context

<content here>
EOF
```

---

## Workflow Steps

When the user asks you to **create a denote note**:

1. **Check for a running server**: Run `emacsclient -s gui -e "t"`. Stop and report if it fails.
2. **Fetch existing keywords**: Run `emacsclient -s gui -e "(denote-keywords)"` to get the list of known keywords.
3. **Determine parameters**: From the user's request and the note's content, determine:
   - **Title** (required)
   - **Keywords/tags**: Choose at most **3** tags that best describe the note content. Prefer existing keywords from step 2; only introduce a new keyword if no existing one fits.
   - **Note type**: work notes go in the `work` subdirectory; general notes use the default directory
   - **Date** (optional; only needed for back-dated notes)
4. **Create the note** with `emacsclient -s gui -e '(denote ...)'` — always pass `(quote org)` as FILE-TYPE.
5. **Strip surrounding quotes** from the returned path: `NOTE=$(echo "$NOTE" | tr -d '"')`
6. **Append content** under a `* Context` heading using `cat >> "$NOTE"`.
7. **Report the result**: Show the file path to the user and ask them to refresh the buffer manually in Emacs.

---

## Renaming Notes / Updating Filetags

Use `denote-rename-file` to rename a note or update its keywords. It updates both the filename and the front matter atomically.

**Function signature:**
```elisp
(denote-rename-file FILE TITLE KEYWORDS SIGNATURE DATE IDENTIFIER)
```

Pass the symbol `'keep-current` for any parameter you don't want to change.

**Suppress confirmation prompts** by binding `denote-rename-confirmations` to `nil`, auto-save by binding `denote-save-buffers` to `t`, and set `default-directory` to `denote-directory` so that Denote's internal `git mv` resolves paths against the correct repository:

```bash
# Update keywords only, keep everything else
emacsclient -s gui -e '(let ((denote-rename-confirmations nil) (denote-save-buffers t) (default-directory (denote-directory))) (denote-rename-file "/path/to/note.org" (quote keep-current) (list "tag1" "tag2") (quote keep-current) (quote keep-current) (quote keep-current)))'

# Update title only
emacsclient -s gui -e '(let ((denote-rename-confirmations nil) (denote-save-buffers t) (default-directory (denote-directory))) (denote-rename-file "/path/to/note.org" "New Title" (quote keep-current) (quote keep-current) (quote keep-current) (quote keep-current)))'
```

> **Important:** Always bind `default-directory` to `(denote-directory)`. Without it, Emacs may compute `git mv` paths relative to its current working directory (e.g. a different repo), causing a fatal git error.

### Workflow: updating filetags

1. Find the note file (use `find` or the identifier).
2. Read the current `#+filetags:` line to see existing keywords.
3. Determine the new keyword list (sorted alphabetically; prefer existing keywords from `(denote-keywords)`).
4. Run `denote-rename-file` with `denote-rename-confirmations` bound to `nil`, `denote-save-buffers` bound to `t`, and `default-directory` bound to `(denote-directory)`, passing the new keyword list and `'keep-current` for all other parameters.
5. Report the new file path and ask the user to refresh the buffer manually in Emacs.

---

## Tips

- Use single-quoted shell strings containing the Elisp to avoid escaping issues.
- Keywords are **always a list**, even for a single keyword: `(list "work")`.
- To inspect the current `denote-directory`:
  ```bash
  emacsclient -s gui -e "(denote-directory)"
  ```
- To list all known keywords (user-defined + inferred from existing notes):
  ```bash
  emacsclient -s gui -e "(denote-keywords)"
  ```
