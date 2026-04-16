# Reference: Writing Good CL Descriptions


---

## Purpose

A CL description is a **permanent public record** of a change. It must communicate:
1. **What** change is being made (major changes summarized)
2. **Why** it is being made (context, decisions not visible in code)

Future developers will search for your CL by description. If the only context lives in code, they may never understand *why* the change was made — and may be unable to safely remove or change it (Chesterton's fence problem).

---

## First Line

- Short summary of **what** is being done
- Complete sentence, written as an **imperative** (order-style)
- Followed by a **blank line**

The first line appears alone in version control history summaries. It must stand alone — readers should not need to read the full description to understand what the CL did.

**Imperative style examples:**
- ✅ `Delete the FizzBuzz RPC and replace it with the new system.`
- ❌ `Deleting the FizzBuzz RPC and replacing it with the new system.`

Keep it short, focused, and clear. Clarity to the reader is the top concern.

---

## Body

Fill in details the first line omits:
- Brief description of the **problem being solved**
- Why **this approach** is the best one
- Any **shortcomings** of the approach
- Background: bug numbers, benchmark results, links to design documents

> If you include links to external resources, consider that they may not be visible to future readers. Include enough inline context for reviewers and future readers to understand the CL without the link.

Even small CLs deserve a body. Put the CL in context.

---

## Bad CL Descriptions

These are inadequate — too vague, no context:
- `Fix bug.`
- `Fix build.`
- `Add patch.`
- `Moving code from A to B.`
- `Phase 1.`
- `Add convenience functions.`
- `kill weird URLs.`

---

## Good CL Descriptions — Examples

### Functionality change
```
RPC: Remove size limit on RPC server message freelist.

Servers like FizzBuzz have very large messages and would benefit from reuse.
Make the freelist larger, and add a goroutine that frees the freelist entries
slowly over time, so that idle servers eventually release all freelist entries.
```
First words say what the CL does. Body explains the problem, why this is a good solution, and implementation specifics.

### Refactoring
```
Construct a Task with a TimeKeeper to use its TimeStr and Now methods.

Add a Now method to Task, so the borglet() getter method can be removed (which
was only used by OOMCandidate to call borglet's Now method). This replaces the
methods on Borglet that delegate to a TimeKeeper.

Allowing Tasks to supply Now is a step toward eliminating the dependency on
Borglet. Eventually, collaborators that depend on getting Now from the Task
should be changed to use a TimeKeeper directly, but this has been an
accommodation to refactoring in small steps.

Continuing the long-range goal of refactoring the Borglet Hierarchy.
```
Describes what changed and how it differs from the past. Explains *why*, notes the solution isn't ideal, and points to future direction.

### Small CL that needs context
```
Create a Python3 build rule for status.py.

This allows consumers who are already using this as in Python3 to depend on a
rule that is next to the original status build rule instead of somewhere in
their own tree. It encourages new consumers to use Python3 if they can,
instead of Python2, and significantly simplifies some automated build file
refactoring tools being worked on currently.
```
First sentence says what's done. Rest explains *why* and provides reviewer context.

---

## Tags (Optional)

Tags categorize CLs. Supported by tools or team convention.

Formats: `[tag]`, `[a longer tag]`, `#tag`, `tag:`

**Rules:**
- Tags in the first line are fine if **short**
- Too many or too-long tags in the first line **obscure the content** — move them to the body
- Tags can appear anywhere in the description

```
// OK — short tags in first line
[banana] Peel the banana before eating.

// OK — inline in body
Peel the #banana before eating.

// OK — multiple short tags
#banana #apple: Assemble a fruit basket.

// BAD — tags overwhelm first line
[banana peeler factory factory][apple picking service] Assemble a fruit basket.
```

---

## Before Submitting

Review the CL description before submitting. CLs change significantly during review — the description should still reflect what the CL actually does at submission time.
