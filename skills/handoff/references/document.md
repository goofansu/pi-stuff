# Document mode reference

Write a handoff document summarizing the current conversation so a fresh agent can continue the work.

Save the document to the temporary directory of the user's OS, not the current workspace.

If the user provided arguments, treat them as the intended focus of the next session and tailor the document accordingly.

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

## Current state

## Important context

## Completed work

## Relevant files and artifacts

## Suggested next steps

## Suggested skills

## Validation / Commands run

## Open questions

## Risks and constraints
```

Omit a section only if it would be empty and not useful.

## Suggested skills

Include a `Suggested skills` section listing skills the next agent should consider invoking.

For each suggested skill, include a short reason.

Example:

```md
## Suggested Skills

- `simplify`: Review the changed code for reuse, quality, and efficiency before committing.
- `commit`: Create a concise Conventional Commits-style commit once the diff is final.
```

If the next step is to launch a fresh agent from the handoff document, suggest `handoff` and note that launch behavior is in [`launch.md`](launch.md).

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

Use a unique filename:

```text
handoff-<slug>-<YYYYMMDD-HHMMSS>-<shortid>.md
```

Example:

```text
handoff-opencode-cache-20260606-143027-a7f3.md
```

If a file with the chosen name already exists, do not overwrite it. Generate a new suffix.

Prefer `$TMPDIR` when available. Otherwise use `/tmp`.

Do not save the handoff inside the current repository or workspace.

## After saving

After saving the document, respond with:

```md
Handoff saved to `<path>`.
```

Then:

* If the user explicitly asked to launch, spawn, start a fresh agent, or execute work from the handoff, offer the launch choices from [`launch.md`](launch.md).
* Otherwise, do not offer launch choices by default. Briefly mention that the handoff can be launched later with the `handoff` skill.
