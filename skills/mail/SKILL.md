---
name: mail
description: "Search and manage emails indexed by notmuch from the command line"
---

Use `notmuch` to search, read, tag, and count emails. Run `notmuch help <command>` or `notmuch help search-terms` for full syntax reference.

## My Setup

**Mail root:** `~/.mail/` with folders `Home/`, `Work/`, `sent`  
**Note:** Use `path:Home/**` / `path:Work/**` — not `folder:Home/` — due to Gmail subfolder structure (e.g. `[Gmail]/All Mail`).  
**Initial tags on new mail:** `unread`, `inbox`, `new`

## Common Tasks

```bash
# Search (threads by default)
notmuch search tag:inbox and tag:unread
notmuch search path:Work/** and tag:unread
notmuch search from:alice@example.com date:"1 week ago"..

# Read a thread
notmuch show thread:<thread-id>

# Count unread
notmuch count tag:unread

# Tag messages (remove "new" after processing, mark as read, etc.)
notmuch tag -new -- tag:new
notmuch tag -unread -- tag:inbox and from:newsletters@example.com

# Import new mail
notmuch new
```
