# Reference: The Standard of Code Review


---

## The Core Standard

> **Approve a CL once it is in a state where it definitely improves the overall code health of the system, even if the CL isn't perfect.**

This is the senior principle of all code review guidelines. There is no "perfect" code — only *better* code. The goal is **continuous improvement**, not perfection.

A CL that improves maintainability, readability, and understandability should not be delayed for days or weeks over polish. Reviewers should balance the need for forward progress against the importance of suggested changes.

Use `Nit:` to flag polish that the author can choose to ignore — don't block progress on minor points.

> ⚠️ This does not justify approving CLs that *worsen* code health. That is only acceptable in emergencies.

---

## Two Competing Duties

**Developer velocity**: If nothing ever gets submitted, the codebase never improves. Overly difficult reviewers discourage future improvements.

**Code health**: Each CL must not decrease the overall quality of the codebase over time. Codebases degrade through accumulated small shortcuts — reviewers are the defense.

---

## Principles

- **Technical facts and data** overrule opinions and personal preferences
- **Style guides** are the absolute authority on style. Purely personal style preferences (whitespace, etc.) not covered by the guide are not grounds for blocking a CL
- **Software design is not a style issue.** Design decisions are based on engineering principles, not preference. If the author can show via data or solid principles that multiple approaches are equally valid, accept the author's preference. Otherwise, standard design principles decide
- **Consistency**: If no other rule applies, ask the author to be consistent with the existing codebase — as long as it doesn't worsen code health

---

## Mentoring

Code review is a teaching opportunity. Leaving comments that help a developer learn something new is always fine. If a comment is purely educational and not critical to meeting review standards, prefix it with `Nit:` or mark it as non-mandatory.

---

## Resolving Conflicts

1. **Start with consensus** — developer and reviewer work through it using the CL Author's Guide and Reviewer Guide
2. **Escalate if stuck** — face-to-face or video call, then record the result as a CL comment
3. **Further escalation**: broader team discussion, Technical Lead, code maintainer, or Eng Manager

**Do not let a CL sit unresolved because author and reviewer can't agree.** Escalate.
