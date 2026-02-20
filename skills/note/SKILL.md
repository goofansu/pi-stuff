---
name: note
description: >
  Create and manage Denote notes in Emacs via emacsclient. Use when the user
  wants to: create a note, take notes, jot something down, save information as
  a note, add a journal entry, back-date a note, tag or rename an existing
  note, or update keywords/filetags on a Denote file. Denote notes are org-mode
  files stored in a structured directory with filename-encoded metadata.
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

| Argument     | Type            | Notes                                                                 |
|--------------|-----------------|-----------------------------------------------------------------------|
| `TITLE`      | string          | Note title. Becomes part of the filename.                            |
| `KEYWORDS`   | list of strings | Tags/keywords, e.g. `(list "emacs" "work")`. Sorted alphabetically. |
| `FILE-TYPE`  | symbol          | Always use `(quote org)`.                                            |
| `DIRECTORY`  | string path     | Must be `denote-directory` or a pre-existing subdirectory of it.     |
| `DATE`       | string          | e.g. `"2025-06-01"` or `"2025-06-01 14:30"`. `nil` = now.          |
| `TEMPLATE`   | symbol          | A key from `denote-templates`. Omit if unused.                       |
| `SIGNATURE`  | string          | Optional signature component added to the filename.                   |
| `IDENTIFIER` | string          | Custom identifier (must match `denote-date-identifier-format`).       |

---

## Creating Notes

Always use `(quote org)` as FILE-TYPE. `denote` returns the path of the newly created file.

```bash
# General note
emacsclient -s gui -e '(denote "My note title" (list "tag1") (quote org))'

# Work note — always use the "work" subdirectory
emacsclient -s gui -e '(denote "Meeting notes" (list "work") (quote org) (concat (denote-directory) "work"))'

# Back-dated note
emacsclient -s gui -e '(denote "Old entry" (list "journal") (quote org) nil "2024-01-15")'
```

After creating the note, append content to the file:

```bash
cat >> "/path/to/note.org" << 'EOF'

<content here>
EOF
```

### Org-mode Formatting

Notes are org-mode files. Always use org-mode syntax — never Markdown.

| Element        | Org syntax                              | ❌ Not Markdown         |
|----------------|-----------------------------------------|-------------------------|
| Inline code    | `~code~`                                | `` `code` ``            |
| Verbatim       | `=literal=`                             | `` `literal` ``         |
| Code block     | `#+begin_src lang … #+end_src`          | ` ```lang … ``` `       |
| Bold           | `*bold*`                                | `**bold**`              |
| Italic         | `/italic/`                              | `*italic*`              |
| Heading        | `* Heading` / `** Subheading`           | `# Heading`             |
| List item      | `- item` or `1. item`                   | same                    |

**Code block example:**

```
#+begin_src python
def greet(name):
    return f"Hello, {name}"
#+end_src
```

Use `~code~` for inline references to commands, variables, filenames, and short code snippets. Use `=verbatim=` for exact literal strings (e.g., keybindings, output).

---

## Create Note Workflow

1. **Check for a running server**: Run `emacsclient -s gui -e "t"`. Stop and report if it fails.
2. **Fetch existing keywords**: Run `emacsclient -s gui -e "(denote-keywords)"`.
3. **Determine parameters** from the user's request:
   - **Title** (required)
   - **Keywords**: at most 3 tags. Prefer existing keywords; only introduce new ones if nothing fits.
   - **Directory**: work notes → `(concat (denote-directory) "work")`; general notes → omit (uses default).
   - **Date**: only if back-dating.
4. **Create the note** with `emacsclient -s gui -e '(denote ...)'`.
5. **Strip surrounding quotes** from the returned path: `NOTE=$(echo "$NOTE" | tr -d '"')`
6. **Append content** using `cat >> "$NOTE"`.
7. **Report**: Show the file path and ask the user to refresh the buffer in Emacs.

---

## Renaming Notes / Updating Filetags

Use `denote-rename-file` to rename a note or update its keywords. It updates both the filename and the front matter atomically.

```elisp
(denote-rename-file FILE TITLE KEYWORDS SIGNATURE DATE IDENTIFIER)
```

Pass `(quote keep-current)` for any parameter to leave unchanged.

**Always** bind `denote-rename-confirmations` to `nil`, `denote-save-buffers` to `t`, and `default-directory` to `(denote-directory)`. Without `default-directory`, Emacs may compute `git mv` paths relative to the wrong repo.

```bash
# Update keywords only
emacsclient -s gui -e '(let ((denote-rename-confirmations nil) (denote-save-buffers t) (default-directory (denote-directory))) (denote-rename-file "/path/to/note.org" (quote keep-current) (list "tag1" "tag2") (quote keep-current) (quote keep-current) (quote keep-current)))'

# Update title only
emacsclient -s gui -e '(let ((denote-rename-confirmations nil) (denote-save-buffers t) (default-directory (denote-directory))) (denote-rename-file "/path/to/note.org" "New Title" (quote keep-current) (quote keep-current) (quote keep-current) (quote keep-current)))'
```

### Rename/Retag Workflow

1. Find the note file (use `find` or the identifier).
2. Read the current `#+filetags:` line to see existing keywords.
3. Determine the new keyword list (sorted alphabetically; prefer existing keywords from `(denote-keywords)`).
4. Run `denote-rename-file` with the bindings above, passing new keywords and `(quote keep-current)` for all other parameters.
5. **Report**: Show the new file path and ask the user to refresh the buffer in Emacs.

---

## Tips

- Use single-quoted shell strings containing the Elisp to avoid shell escaping issues.
- Keywords are **always a list**, even for a single tag: `(list "work")`.
