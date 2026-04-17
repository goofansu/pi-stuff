---
name: cl-description
description: >
  Use this skill whenever the user needs help writing, rewriting, reviewing, or
  scoping a CL/PR for code review. Trigger on requests like: write the PR
  description, help me describe this change, review this PR body, improve this
  changelist description, what should the title/summary be, what should I put
  in the PR body, is this CL too large, should I split this change, how should
  I break this into smaller PRs, or any time the user is preparing a code
  change for review and needs reviewer-facing wording or scope guidance. Also
  use it for best practices around CL descriptions, PR descriptions, and
  splitting large changes into reviewable pieces.
---

# CL description

A skill for writing and reviewing CL (changelist) descriptions that follow Google Engineering best practices. Use this skill when writing PR descriptions, reviewing whether a CL is well-scoped, or deciding how to split large changes.

## References

| Reference file | When to read it |
|---|---|
| `references/cl-descriptions.md` | Writing, rewriting, or reviewing a CL/PR description |
| `references/small-cls.md` | Deciding whether a CL is too large or how to split it |

**Always read the relevant reference file before producing output.** Read both when the user needs both description help and scope/splitting advice.

## Workflow

### 1. Identify the task type
First decide which of these the user needs:
- **Write or rewrite a description**
- **Review an existing description**
- **Judge CL size or recommend a split**
- **Both description help and size/splitting advice**

### 2. Read the right reference(s)
- Description work → read `references/cl-descriptions.md`
- Size or splitting work → read `references/small-cls.md`
- Combined request → read both

### 3. Gather the missing context
Ask for missing details, or infer them from the conversation, diff, or files:
- What changed?
- Why was it changed?
- Is there supporting context to mention, such as a bug, design doc, benchmark, or rollout detail?
- How large is the CL: roughly how many files or lines changed, and does it mix refactors, tests, and feature work?

Only ask follow-up questions that are needed to produce a useful answer.

### 4. Produce the right kind of output

#### If the user wants a CL description
Return a polished draft in this shape:

```text
<Short imperative first line>

<Body with problem context, why this approach, and any important caveats or links>
```

If information is missing, either:
- write the best draft you can and clearly mark placeholders or assumptions, or
- ask a brief follow-up question if the missing detail materially affects the result

#### If the user wants a description review
Give a concise review that covers:
- what is already working
- what is unclear or missing
- a revised version, if helpful

#### If the user wants a size or splitting review
State:
- whether the CL seems appropriately scoped
- the main reason if it is too large or mixed-purpose
- the best split strategy to use next, such as stacking, splitting by files, horizontal splitting, or vertical splitting

When recommending a split, suggest concrete boundaries rather than generic advice.

## Output guidelines

- Be specific and practical
- Optimize for reviewer comprehension and future readers, not just immediate approval
- Prefer a ready-to-use draft when the user asks for writing help
- Prefer direct recommendations when the user asks whether to split a CL