---
description: Use when the user wants a prepared spec or tickets implemented, tested, reviewed, and committed.
model: openai-codex/gpt-5.6-luna
effort: high
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.
