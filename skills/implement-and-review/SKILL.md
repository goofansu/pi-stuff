---
name: implement-and-review
description: Implement a spec or tickets by looping the implementer against both reviewers until every review comes back clean.
disable-model-invocation: true
---

# Implement and review

Three agents, one loop:

```text
user's spec → implementer ⇄ spec-reviewer + standards-reviewer → user
```

The spec is a contract, written before this starts. Run it as written; where it
turns out to be silent or wrong, that goes in your report rather than into a
decision of your own.

Runs are one-shot and the agents cannot delegate, so every arrow is a turn of
yours: you carry the implementer's changes to both reviewers and their findings
back to the next implementer run. Each prompt starts from nothing the last one
knew.

The user is out of the room until you report, so nothing an agent surfaces is a
reason to stall.

## Before the loop

Read the spec or tickets yourself. You need enough to brief each run and to
recognize a finding that contradicts what was asked.

More than one ticket: one at a time, blockers first. A single spec with no
tickets: one unit — slicing it is the user's call.

## The loop

Brief the implementer with the ticket or spec — a file path or an issue
reference — and what earlier tickets landed.

Then both reviewers at once, each given the same ticket or spec and what the
implementer reported changing. Each already carries its own axis, so brief
neither on the other's:

- `spec-reviewer` — does the code do what was asked?
- `standards-reviewer` — does the code fit this repo?

They only read, so they are safe to run together; a second implementer is not,
because nothing is committed between runs and it would overwrite the first's
edits.

Keep the two reports apart, unmerged and unranked against each other: code can
pass one axis and fail the other, and merging them lets one mask the other.

Blocking findings from either axis go back to a new implementer run carrying the
findings and your judgement on each, including which you think are wrong and
why. Then re-review both axes with what changed and what is contested.

## Leaving the loop

A ticket is done when both axes come back clean and the tree is green. Your own
reading of the diff is not a substitute for any of it.

When a finding survives two rounds, call it a stalemate: leave the loop and
carry the disagreement to your report. A third round only produces a third
opinion.

The session is done when every ticket has been through a clean review, not when
the last implementer run finishes.

## Your report

The user sees widget lines and collapsed notifications, not reports, and the
work is sitting uncommitted in their tree. Say what is in it: what changed,
which parts of the spec are satisfied, what each round resolved, what is left
contested, and where the spec did not say what the work needed.
