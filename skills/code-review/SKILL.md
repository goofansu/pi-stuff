---
name: code-review
description: >
  Use this skill whenever a user wants to review a CL (changelist) or pull
  request, write review comments, evaluate code quality, or understand how to
  be a good code reviewer. Triggers include: review this PR, review this CL,
  give me feedback on this code, what should I look for in a code review,
  how do I write good review comments, is this code well-designed, should I
  approve this CL, LGTM or not, how do I navigate a large CL, or any time the
  user is acting as a reviewer on someone else's change. Also use when the user
  asks about code review standards, reviewer responsibilities, or how to handle
  disagreements in review.
---

# Code Review Skill

A skill for performing and writing code reviews following Google Engineering
best practices. This skill is for the **reviewer** role — evaluating someone
else's CL and writing feedback on it.

## Prerequisite: CL Description

Before reviewing a CL, a clear description must exist. If the CL being reviewed
lacks a good description (missing *what* and *why*), flag this first and use
the `cl-description` skill to help the author write one. A good review starts
with understanding the intent of the change.

---

## Sitemap

| Reference file | When to read it |
|---|---|
| `references/standard.md` | The review standard — when to approve, how to balance progress vs. quality, resolving conflicts |
| `references/looking-for.md` | What to check: design, functionality, complexity, tests, naming, comments, style, docs |
| `references/navigate.md` | How to efficiently sequence a review across multiple files |
| `references/comments.md` | How to write review comments — tone, severity labels, giving guidance |

**Always read at least the relevant reference file(s) before producing review output.**

---

## Quick Workflow

### 1. Check the CL description
- Does it clearly explain *what* and *why*?
- If not → ask the author to improve it (reference `cl-description` skill)

### 2. Take a broad view (`references/navigate.md`)
- Does the change make sense overall?
- Is it the right thing to be doing at all?
- Reject early if the direction is fundamentally wrong — do it courteously

### 3. Review the main parts first (`references/looking-for.md`)
- Find the file(s) with the most logical changes
- Check design problems before spending time on details
- If major design issues exist, send those comments immediately — don't wait

### 4. Review the rest in sequence (`references/navigate.md`)
- Work through remaining files in a logical order
- Reading tests first can help clarify intent

### 5. Write comments (`references/comments.md`)
- Comment on the *code*, not the *developer*
- **Always read the source file to get the exact line number** — include `filename:line_number` in every comment
- Label severity: `Nit:`, `Optional:`, `FYI:`, or required (unlabeled)
- Explain *why*, not just *what* to change
- Praise good things too

### 6. Apply the standard (`references/standard.md`)
- Approve if the CL **improves overall code health**, even if imperfect
- Do not demand perfection — seek continuous improvement
- Use `Nit:` for polish that isn't blocking

---

## Key Principles (details in reference files)

- **Approve when it's better, not when it's perfect** — no code is perfect
- **Review every line** you're assigned — don't skim human-written code
- **Design > details** — catch design problems first, before reviewing style
- **Comment on code, not people** — keep feedback impersonal and constructive
- **Label severity** so authors know what's blocking vs. optional
- **Don't let CLs stall** — escalate conflicts rather than leaving them unresolved
