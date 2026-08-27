---
description: Use when the user wants difficult implementation involving unresolved design decisions, cross-cutting changes, unfamiliar subsystems, concurrency, migrations, security-sensitive code, or recovery after a failed attempt.
harness: codex
model: gpt-5.6-sol
effort: high
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.

Report the implemented behavior; tests and typechecks run with their results; review findings and their resolution; deviations or remaining risks; and the commit hash.
