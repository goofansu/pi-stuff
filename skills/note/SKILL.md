---
name: note
description: >
  Use when the user wants to create a note, take notes, jot something down, or
  save information as a note.
---

# Note Skill

Create [Denote](https://protesilaos.com/emacs/denote) journal notes by sending commands to a running Emacs GUI server via `emacsclient -s gui`.

## Creating Notes

Always create notes using `denote-journal-new-entry`, which creates a new journal entry in `denote-journal-directory` with the `denote-journal-keyword` automatically applied.

```bash
NOTE=$(emacsclient -s gui -e '(buffer-file-name (denote-journal-new-entry))')
NOTE=$(echo "$NOTE" | tr -d '"')
```

To back-date an entry, pass a date string:

```bash
NOTE=$(emacsclient -s gui -e '(buffer-file-name (denote-journal-new-entry "2024-01-15"))')
NOTE=$(echo "$NOTE" | tr -d '"')
```

After creating the note, append content to the file:

```bash
cat >> "$NOTE" << 'EOF'

<content here>
EOF
```

### Org-mode Formatting

Notes are org-mode files. Always use org-mode syntax — never Markdown.

| Element        | Org syntax                              | ❌ Not Markdown         |
|----------------|------------------------------------------|-------------------------|
| Inline code    | `~code~`                                | `` `code` ``            |
| Verbatim       | `=literal=`                             | `` `literal` ``         |
| Code block     | `#+begin_src lang … #+end_src`          | ` ```lang … ``` `       |
| Bold           | `*bold*`                                | `**bold**`              |
| Italic         | `/italic/`                              | `*italic*`              |
| Heading        | `* Heading` / `** Subheading`           | `# Heading`             |
| List item      | `- item` or `1. item`                   | same                    |

Use `~code~` for inline references to commands, variables, filenames, and short code snippets. Use `=verbatim=` for exact literal strings (e.g., keybindings, output).

---

## Create Note Workflow

1. **Create the note** with `denote-journal-new-entry` and capture the file path. Stop and tell the user if it fails.
2. **Append content** using `cat >> "$NOTE"`.
3. **Report**: Show the file path and ask the user to refresh the buffer in Emacs.


