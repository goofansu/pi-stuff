# Reference: Navigating a CL in Review


---

## The Three-Step Sequence

### Step 1: Broad view — does the change make sense?

Read the CL description. Does this change make sense at all? Does it have a good description?

If the change should not have happened in the first place, respond immediately with a clear explanation of why — and suggest what the developer should have done instead. Do this **courteously**: acknowledge their work, then redirect.

> Example: "Looks like you put some good work into this, thanks! However, we're actually going in the direction of removing the FooWidget system that you're modifying here, and so we don't want to make any new modifications to it right now. How about instead you refactor our new BarWidget class?"

If you repeatedly receive CLs representing changes you don't want, reconsider the team's development process or contribution guidelines — it's better to say "no" before a lot of work is done.

---

### Step 2: Find and review the main parts first

Find the file(s) that are the core of the CL — usually the file with the largest number of logical changes.

**Why review main parts first:**
- Gives context to the smaller parts
- If there are major design problems, a lot of other code under review may disappear anyway
- Developers often start new work immediately after sending a CL for review — catching design problems early prevents wasted work on top of a broken foundation
- Major redesigns take time; developers need to know early to meet deadlines

**Send major design comments immediately**, even if you haven't finished the rest of the review.

If the CL is so large you can't identify the main parts, ask the developer:
- What should I look at first?
- Or: ask them to split the CL into smaller CLs

---

### Step 3: Review the rest in a logical sequence

Once there are no major design problems, go through remaining files in a logical order. Options:
- Follow the order the code review tool presents them
- Read tests first before main code — tests clarify what the change is supposed to do
