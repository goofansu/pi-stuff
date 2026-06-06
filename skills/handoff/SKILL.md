---
name: handoff
description: Use when the user asks to create a handoff document for another agent to continue the current work.
---

# Handoff

Write a handoff document summarizing the current conversation so a fresh agent can continue the work.

Save the document to the temporary directory of the user's OS, not the current workspace.

If the user passed arguments, treat them as the intended focus of the next session and tailor the document accordingly.

## Desired outcome

A fresh agent should be able to read the handoff and understand:

* what the user is trying to accomplish
* what has already been decided or completed
* what files, branches, artifacts, commands, or external references matter
* what should happen next
* which skills are likely useful
* what risks, constraints, or open questions remain

## Handoff content

Write the handoff as concise Markdown.

Include these sections when relevant:

```md
# Handoff

## Goal

## Current State

## Important Context

## Completed Work

## Relevant Files and Artifacts

## Suggested Next Steps

## Suggested Skills

## Validation / Commands Run

## Open Questions

## Risks and Constraints
```

Omit a section only if it would be empty and not useful.

## Suggested skills

Include a `Suggested Skills` section listing skills the next agent should consider invoking.

For each suggested skill, include a short reason.

Example:

```md
## Suggested Skills

- `simplify`: Review the changed code for reuse, quality, and efficiency before committing.
- `commit`: Create a concise Conventional Commits-style commit once the diff is final.
```

If the next step is to launch a fresh agent from the handoff document, suggest `launch-handoff`.

## Avoid duplication

Do not duplicate long content already captured in other artifacts, such as:

* PRDs
* plans
* ADRs
* issues
* PRs
* commits
* diffs
* generated reports
* existing handoff documents

Reference those artifacts by path, branch, commit, issue, PR, URL, or filename instead.

## Redaction and safety

Before saving, redact sensitive information, including:

* API keys
* tokens
* passwords
* credentials
* private keys
* session cookies
* secrets in environment variables
* unnecessary personally identifiable information

Do not invent context. If something is unknown, mark it as unknown or omit it.

If sensitive material is central to the task, describe it abstractly instead of copying it.

## File location

Save the file in the OS temporary directory.

Use a descriptive filename such as:

```sh
handoff-<slug>-<timestamp>.md
```

Prefer `$TMPDIR` when available. Otherwise use `/tmp`.

Do not save the handoff inside the current repository or workspace.

## After saving

After saving the document, respond with:

```md
Handoff saved to `<path>`.
```

Then:

* If the user explicitly asked to launch, continue, resume, spawn, start a fresh agent, or execute the handoff, offer the launch choices below.
* Otherwise, do not offer launch choices by default. You may briefly say that the handoff can be launched later with the `launch-handoff` skill.

## Launch choices

Only offer these choices when launch intent is explicit:

```md
Two execution options:

**1. Worktree (recommended)** - Create a worktree and execute `pi` in a new tmux window.

**2. No worktree** - Execute `pi` in a new tmux window from the current working directory.

Which approach?
```

Do not run tmux, worktree, or `pi` commands until the user chooses an execution option.

If the user chooses an option, use the `launch-handoff` skill.
