---
name: implement-and-review
description: "Implement a spec or tickets the user wrote by looping the implementer and reviewer agents until every review comes back clean. Use when the user hands work over to build without them in the room."
---

# Implement and review

Two agents, one loop:

```text
user's spec → implementer ⇄ reviewer → user
```

The spec is a contract. Run it as written; where it turns out to be silent or
wrong, that goes in your report rather than into a decision of your own.

Runs are one-shot and the agents cannot delegate, so every arrow is a turn of
yours: you carry the implementer's changes to the reviewer and the reviewer's
findings to the next implementer run. Each prompt starts from nothing the last
one knew.

The user is out of the room until you report, so nothing an agent surfaces is a
reason to stall.

## Before the loop

Read the spec or tickets yourself. You need enough to brief each run and to
recognize a finding that contradicts what was asked.

More than one ticket: one at a time, blockers first. A single spec with no
tickets: one unit — slicing it is the user's call.

## The loop

Brief the implementer with the ticket or spec path and what earlier tickets
landed. It leaves its work uncommitted in the tree.

Brief the reviewer with that same path and what the implementer reported
changing.

Blocking findings go back to a new implementer run carrying the findings and
your judgement on each, including which you think are wrong and why. Then
re-review with what changed and what is contested.

One implementer at a time in one tree: nothing is committed between runs, so a
second one overwrites the first's edits.

## Leaving the loop

A ticket is done when its review reports zero blocking findings and the tree is
green. Your own reading of the diff is not a substitute for either.

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
