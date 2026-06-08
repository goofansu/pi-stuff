---
name: simplify
description: Use when the user asks to simplify, clean up, or improve changed code.
---

# Simplify

Improve the current changed code by making it simpler, more reusable, more maintainable, and more efficient without changing intended behavior.

## Desired outcome

The changed code should be cleaner and easier to review, with unnecessary complexity removed and behavior preserved.

A successful result may be either:

* changes that simplify the code, or
* confirmation that the changed code is already clean.

## Scope

Review the current git changes.

Use:

```sh
git status --short
git diff
```

If there are staged changes, also inspect:

```sh
git diff --staged
```

If there are no git changes, review the most recently modified files that the user mentioned or that were edited earlier in the conversation.

Only edit files that are part of the current change unless an adjacent edit is clearly necessary to remove duplication or use an existing abstraction.

## Review lenses

Evaluate the changed code through these lenses.

### 1. Reuse

Look for newly added code that duplicates existing utilities, helpers, components, types, constants, or patterns.

Prefer existing project conventions over new one-off logic.

Common issues:

* hand-rolled string/path/date/env handling when utilities already exist
* duplicated type guards or validation logic
* new helpers that overlap with existing helpers
* inline logic that should use shared code
* repeated JSX or UI patterns that already have components

### 2. Code quality

Look for complexity or maintainability problems.

Common issues:

* redundant state that can be derived
* unnecessary effects, observers, or caches
* parameter sprawl instead of a clearer abstraction
* copy-paste with slight variation
* leaky abstractions
* raw strings where constants, enums, or string unions already exist
* unnecessary JSX wrappers
* deeply nested conditionals that can be flattened
* comments that explain obvious code, narrate the change, or reference the task instead of explaining non-obvious why

### 3. Efficiency

Look for avoidable work introduced by the change.

Common issues:

* repeated computation
* duplicate file reads or network/API calls
* N+1 patterns
* independent async work done sequentially
* blocking work added to startup, request, render, or other hot paths
* unconditional state/store updates in loops, intervals, subscriptions, or event handlers
* existence pre-checks that should instead operate directly and handle errors
* unbounded memory growth or missing cleanup
* broad reads or loads when a narrower operation is enough

## How to work

1. Inspect the changed files and surrounding code before editing.
2. Search nearby/shared code for existing patterns before creating new abstractions.
3. Apply only simplifications that clearly improve the current change.
4. Preserve intended behavior and public APIs unless the user explicitly asks otherwise.
5. Keep the diff smaller and clearer than what you started with.
6. Do not introduce new dependencies unless explicitly justified.
7. Do not perform broad rewrites, style-only churn, or speculative architecture changes.
8. If a potential issue is subjective or low-value, leave it unchanged.

For large or complex diffs, you may use subagents or separate review passes for reuse, quality, and efficiency. Do not use subagents mechanically for small diffs.

## Validation

After editing, run the most relevant available checks, such as targeted tests, typecheck, lint, or formatting.

Prefer existing project scripts.

If validation is unavailable, too expensive, or blocked, say what you were able to check instead.

## Final response

Briefly report:

* what was simplified
* any notable issues intentionally left unchanged
* validation run and result

If no edits were needed, say the changed code was already clean and mention what was checked.
