# Reference: Small CLs


---

## Why Write Small CLs?

Small, self-contained CLs are:
- **Reviewed faster** — reviewers find 5-minute slots more easily than 30-minute blocks
- **Reviewed more thoroughly** — large volumes of back-and-forth commentary lose important points
- **Less likely to introduce bugs** — fewer changes means easier reasoning about impact
- **Less wasteful if rejected** — a wrong direction costs less work to discard
- **Easier to merge** — fewer conflicts accumulate over time
- **Easier to design well** — polish is easier on small changes
- **Non-blocking** — self-contained portions let you continue coding while waiting for review
- **Simpler to roll back** — fewer files touched between submission and rollback CL

> ⚠️ Reviewers have discretion to reject a CL outright for being too large. Splitting after writing is expensive. Write small CLs from the start.

---

## What Is "Small"?

The right size is **one self-contained change**:
- Makes a **minimal change addressing just one thing** (usually one part of a feature, not a whole feature)
- Includes **related test code**
- Contains everything the reviewer needs to understand it (except future development)
- The system **continues to work** after it is checked in
- Not so small its implications are hard to understand — if adding an API, include a usage example in the same CL

**Rough guidelines (not hard rules):**
- ~100 lines → usually reasonable
- ~1000 lines → usually too large
- Spread across 50 files → usually too large, even if only 200 lines total

When in doubt, write smaller than you think you need to. Reviewers rarely complain about CLs being too small.

---

## When Are Large CLs Okay?

- **Deleting an entire file** — counts roughly as one line; reviewers skim it fast
- **Automated refactoring tool output** — reviewer just verifies intent, doesn't read line by line (though merging/testing caveats still apply)

---

## Splitting Strategies

### Stacking (Sequential Dependencies)
Write CL 1, send for review, immediately start CL 2 based on CL 1. Most VCS systems support this. You keep working while review is in progress.

### Splitting by Files
Group files by reviewer or by logical boundary. Example:
- CL A: protocol buffer changes
- CL B: code that uses the proto (depends on CL A, but can be reviewed simultaneously)

Inform both sets of reviewers about the other CL for context.

### Splitting Horizontally (By Layer)
Create shared stubs or interfaces that isolate layers from each other. Example for a calculator app:
- CL A: shared proto signature (isolates service from data model)
- CL B: API stub (splits client from service implementation)

Encourages abstraction between layers.

### Splitting Vertically (By Feature)
Break down into full-stack vertical slices, each an independent implementation track. Example:
- CL A: multiplication operator (client + API + service + model)
- CL B: division operator (same layers, independent)

Each track can proceed in parallel.

### Combining Horizontal + Vertical
Chart a grid where rows = layers, columns = features. Each cell is its own CL. Start from the model layer and work up.

---

## Separate Out Refactorings

**Always** put refactorings in a separate CL from feature changes or bug fixes:
- Moving/renaming a class → separate CL from fixing a bug in that class
- Reviewers understand each CL far more easily when changes are separated

Exception: small local cleanups (e.g., renaming a local variable) can stay inside a feature or bug-fix CL.

---

## Keep Related Tests in the Same CL

- A CL that adds or changes logic **must** include new or updated tests
- Pure refactoring CLs should be covered by tests; add them if they don't exist
- "Small" means conceptually focused, not a simple line count — tests belong alongside the code they test

**Independent test modifications** can go in separate CLs first:
- Adding tests for pre-existing code
- Refactoring test code (helper functions)
- Introducing larger test framework code (integration tests)

---

## Don't Break the Build

For dependent CLs, ensure the system keeps working after **each** CL is submitted. A broken intermediate state blocks all colleagues until the next CL lands.

---

## When You Can't Make It Small Enough

Almost always possible to decompose. Before giving up:
1. Can a **refactoring-only CL** precede the large one and simplify it?
2. Ask teammates for ideas on decomposition.

If truly unavoidable: **get consent from reviewers in advance**. Expect a long review process. Be especially diligent about tests and not introducing bugs.
