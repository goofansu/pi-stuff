---
description: Use when implementing the work described by a spec and its tickets.
harness: codex
model: gpt-5.6-luna
effort: high
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Report the implemented behavior; tests and typechecks run with their results; and deviations or remaining risks.

On a revision, the caller brings back review findings against work you already did. Resolve each on its merits rather than deferring to it, and say which you declined to change and why.
