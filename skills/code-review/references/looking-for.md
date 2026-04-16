# Reference: What to Look for in a Code Review


Always apply the review standard (approve if it improves code health, not only if perfect) when considering each of these areas.

---

## Design ⭐ (Most Important)

Do the interactions between pieces of code make sense? Does this change belong in the codebase or in a library? Does it integrate well with the rest of the system? Is now a good time to add this functionality?

Design is the most important thing to cover. Catch design problems before reviewing details — if the design is fundamentally wrong, other code may disappear anyway.

---

## Functionality

Does the CL do what the developer intended? Is that intention good for users?

"Users" means both end-users (affected by the change) and developers (who will use this code in the future).

Expect that CLs have been tested before review. But still consider:
- **Edge cases** — are there scenarios the developer didn't test?
- **Concurrency** — any potential deadlocks or race conditions? These are hard to detect at runtime and require careful reasoning
- **User-facing changes (UI)** — consider asking for a demo if the impact is hard to reason about from code alone

---

## Complexity

Is the CL more complex than it needs to be? Check at every level:
- Are individual lines too complex?
- Are functions too complex?
- Are classes too complex?

**"Too complex"** means: can't be understood quickly, or likely to cause bugs when called or modified.

Watch especially for **over-engineering** — making code more generic than needed, or adding functionality for speculative future needs. Encourage developers to solve the problem they *know* needs solving now, not problems they *imagine* might arise later.

---

## Tests

Tests should be added in the same CL as production code (except emergencies).

Check that tests are:
- **Correct** — will they actually fail when the code is broken?
- **Sensible** — do they make simple, useful assertions?
- **No false positives** — if the code changes beneath them, will they break correctly or produce noise?
- **Well-organized** — are tests separated appropriately between methods?

Tests are code too — don't accept complexity in tests just because they aren't in the main binary.

---

## Naming

Did the developer pick good names for variables, classes, methods, etc.?

A good name is long enough to fully communicate what the item is or does, without being so long it becomes hard to read.

---

## Comments

Are comments clear, in understandable English, and actually necessary?

Comments should explain **why** code exists, not **what** it does. If code isn't clear enough to explain itself, simplify the code — don't explain it with a comment.

Exceptions where *what* comments are useful: regular expressions, complex algorithms.

Also look at pre-existing comments:
- Is there a TODO that can now be removed?
- Is there a comment advising against exactly this change?

Note: Code comments ≠ documentation. Documentation (for classes, modules, functions) should express purpose, usage, and behavior.

---

## Style

Does the CL follow the appropriate style guide?

- Style guide points not in the guide are personal preference — prefix with `Nit:`, don't block the CL
- Don't block submission on personal style preferences alone
- If the author mixes major style reformatting with functional changes, ask them to separate: one CL for reformatting, another for the functional change

---

## Consistency

If existing code conflicts with the style guide:
- Style guide is the absolute authority — the CL should follow it
- Where the style guide makes recommendations (not requirements), use judgment: follow the guide unless local consistency would be too confusing
- If no rule applies, maintain consistency with the existing codebase
- Encourage the author to file a bug and add a TODO to clean up existing inconsistencies

---

## Documentation

If the CL changes how users build, test, interact with, or release code — does it also update associated documentation (READMEs, reference docs, etc.)?

If the CL deletes or deprecates code, consider whether related documentation should also be removed. If documentation is missing, ask for it.

---

## Every Line

In general, **look at every line of code you're assigned to review.** Don't skim human-written classes, functions, or blocks.

Data files, generated code, or large data structures can be scanned. But you must at minimum understand what all human-written code is doing.

If code is too hard to read and slowing the review — tell the developer. If *you* can't understand it, future developers won't either. Ask for clarification before continuing.

If you're not qualified for some part of the review (privacy, security, concurrency, accessibility, i18n), make sure a qualified reviewer is on the CL.

### Exceptions
If you're reviewing only certain files or aspects (noted by the CL author or a partial review role):
- Note in a comment which parts you reviewed
- Prefer LGTM with comments rather than silent partial approval

---

## Context

Look at the CL in a broad context — not just the diff lines. Sometimes you need to look at the whole file to assess whether a change makes sense. Four new lines might look fine in isolation but require breaking up a 50-line method when seen in full.

Think about the CL in the context of the whole system: is this improving code health, or adding complexity and reducing test coverage? **Don't accept CLs that degrade code health.** Most complexity accumulates through many small decisions.

---

## Good Things

If you see something great in the CL — tell the developer. Code reviews often focus only on problems, but encouragement and appreciation for good practices are equally valuable. It's sometimes more powerful to tell a developer what they did right than what they did wrong.
