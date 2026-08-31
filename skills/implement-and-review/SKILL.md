---
name: implement-and-review
description: Implement-and-review loop — stable implementers by context thread plus fresh spec and standards reviews. Use when a prompt says "implement-and-review", or asks to implement a spec, tickets, or issues with the work reviewed.
---

# Implement and review

The spec is the contract. Run it as written. Carry spec gaps, contradictions,
and stalemates to the final report rather than deciding them for the user.

You drive the loop through reports alone: the implementer's report and the two
verdicts are your entire view of the code. While a Run is active, waiting on
it is the whole job — the subagents own all reading of the tree.

Run the loop unattended until the work is clean or reaches a stop condition
below.

## Prepare

Read the spec or tickets. Preparation is complete when you can name the work
units in dependency order, assign each unit to a context thread, and account
for every acceptance criterion in the current unit.

A **context thread** is a consecutive sequence of units that deepens or revises
the same provider, subsystem, module seam, or implementation. Dependency
through an already committed contract does not by itself join two units into
one context thread. A different provider, subsystem, or self-contained
implementation surface begins a fresh context thread.

Require a clean working tree before the first unit: reviewers scope to
`git diff HEAD`, so anything already uncommitted would be reviewed as the
unit's own work. A dirty tree at the start is a stop condition; carry it to
the final report.

Process multiple tickets one at a time in dependency order. Treat a single
unsliced spec as one unit.

## Run each unit

Select the unit's implementer before entering the loop. The committed tree is
the handoff source of truth; retained conversation is an optimization for a
continuous implementation context.

```text
current_thread = none
current_implementer = none

for each unit in dependency order
  thread = context_thread(unit)

  if thread == current_thread
    run = agent_resume(current_implementer, unit)
  else
    current_implementer, run = agent_start(
      "implementer",
      spec + unit + prerequisite_commits + relevant_prior_decisions,
    )
    current_thread = thread

  run the implementation-review loop below
```

1. **Implement.** Use the selected implementation Run. Save the stable Subagent
   ID returned by `agent_start` as `current_implementer`; use that ID with
   `agent_resume` for every review revision and later unit in the same context
   thread. Use each Run ID for that Run's lifecycle and result calls.

   Keep one implementation Run active at a time because every Run shares the
   same uncommitted tree. This step is complete when the Run reports its
   changes, verification results, and gaps. A spec gap that prevents
   implementation is a stop condition; carry it to the final report.

2. **Review.** Start fresh Runs of `spec-reviewer` and `standards-reviewer` in
   parallel. Give both the current spec or ticket and the implementer's report.
   On a re-review, give each reviewer its own prior findings plus the
   implementer's response to them. Each reviewer already owns its axis:

   - `spec-reviewer` — does the code do what was asked?
   - `standards-reviewer` — does the code fit this repo?

   Keep their reports separate and collect both before deciding the round. This
   step is complete only when both verdicts arrive.

3. **Decide.** The unit is clean when both verdicts are `clean` and the required
   repository checks pass. Require both reviews even when the implementer's
   report looks clean.

   Commit each clean unit before starting the next: one commit per unit,
   following the repo's commit conventions and identifying the unit. The
   implementer leaves its work uncommitted; the commit is yours. Committing is
   what keeps the next unit's reviews scoped to `git diff HEAD` alone, so a
   later reviewer never mistakes an earlier unit's work for scope creep.

   If either axis has blocking findings, resume `current_implementer` with the
   review delta: each blocking finding, its axis, and your judgement and
   rationale where it is disputed. Its retained conversation supplies the
   original brief and implementation history. If a required check or commit
   hook fails, resume it with the exact failure. Return to review after either
   revision; commit hooks remain enabled.

   If the same finding is blocking in two consecutive review rounds, declare a
   stalemate and stop the loop. Carry the disagreement to the final report.

## Complete the session

The session is clean only when every unit has completed both review axes and the
required checks pass. A spec gap the implementer cannot cross or a stalemate is
a stop condition, not clean completion.

Every finished unit is committed once; work halted by a stop condition remains
uncommitted in the tree. Report:

- what changed, which acceptance criteria are met, and the commit for each
  finished unit;
- the checks run and their results;
- what each review round resolved;
- unmet criteria, spec gaps, risks, and stalemates.
