---
name: denote
description: "Create and manage Denote notes in Emacs via emacsclient -s gui"
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
2. **Determine parameters**: From the user's request, extract:
   - **Title** (required)
   - **Keywords/tags** (optional; ask if unclear)
   - **Note type**: work notes go in the `work` subdirectory; general notes use the default directory
   - **Date** (optional; only needed for back-dated notes)
3. **Create the note** with `emacsclient -s gui -e '(denote ...)'` — always pass `(quote org)` as FILE-TYPE.
4. **Strip surrounding quotes** from the returned path: `NOTE=$(echo "$NOTE" | tr -d '"')`
5. **Append content** under a `* Context` heading using `cat >> "$NOTE"`.
6. **Refresh the buffer**: Run `emacsclient -s gui -e "(with-current-buffer (find-file-noselect \"$NOTE\") (revert-buffer t t))"` so Emacs picks up the new content.
7. **Report the result**: Show the file path to the user.

---

## Tips

- Use single-quoted shell strings containing the Elisp to avoid escaping issues.
- Keywords are **always a list**, even for a single keyword: `(list "work")`.
- To inspect the current `denote-directory`:
  ```bash
  emacsclient -s gui -e "denote-directory"
  ```
- To list known keywords:
  ```bash
  emacsclient -s gui -e "denote-known-keywords"
  ```
