---
name: cl-description
description: >
  Use this skill whenever a user wants to write, review, or improve a CL
  (changelist) description for a pull request or code review. Triggers include:
  write a PR description, write a CL description, help me describe this change,
  review my pull request description, how should I title this PR, what should I
  put in the PR body, is my CL too large, should I split this PR, or any time
  the user is preparing to submit code for review. Also use when the user asks
  about best practices for pull request descriptions, commit messages for CLs,
  or how to break up large changes.
---

# CL description

A skill for writing and reviewing CL (changelist) descriptions that follow Google Engineering best practices. Use this skill when writing PR descriptions, reviewing whether a CL is well-scoped, or deciding how to split large changes.

## Sitemap

| Reference file | When to read it |
|---|---|
| `references/cl-descriptions.md` | Writing or reviewing a CL description — first line, body, examples, tags |
| `references/small-cls.md` | Evaluating CL size, splitting strategies, when large CLs are OK |

**Always read at least one reference file before producing output.**

---

## Quick Workflow

### 1. Understand the change
Ask (or infer from context):
- What does this CL do? (the *what*)
- Why is it being done? (the *why*)
- Is there a bug number, design doc, or benchmark result to reference?
- How large is it? (lines changed, files touched)

### 2. Decide which reference(s) to read
- Writing/reviewing a description → read `references/cl-descriptions.md`
- Evaluating scope or splitting → read `references/small-cls.md`
- Both → read both (they are concise)

### 3. Produce output

**For a CL description**, produce:
```
<Imperative first-line summary>

<Body: problem context, why this approach, any shortcomings, links>
```

**For a size review**, state:
- Whether the CL is appropriately sized
- If not, which splitting strategy to use (stacking, by files, horizontal, vertical)

---

## Key Principles (summary — details in reference files)

- First line: short imperative sentence, stands alone in history
- Body: *why*, not just *what*; context a reviewer needs
- One self-contained change per CL
- Include related tests in the same CL
- Refactors go in separate CLs from feature/bug changes
