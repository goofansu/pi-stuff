---
description: Use when implementing well-specified, bounded work using established codebase patterns.
harness: codex
model: gpt-5.6-luna
effort: medium
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.

Report the implemented behavior; tests and typechecks run with their results; review findings and their resolution; deviations or remaining risks; and the commit hash.
