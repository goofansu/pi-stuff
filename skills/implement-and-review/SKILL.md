---
name: implement-and-review
description: Implement a spec or tickets with one resumable implementer and fresh spec and standards reviews.
disable-model-invocation: true
---

# Implement and review

Three roles, one loop:

```text
user's spec → persistent implementer ⇄ fresh spec-reviewer + standards-reviewer → user
```

The spec is the contract. Run it as written. Carry spec gaps, contradictions,
and stalemates to the final report rather than deciding them for the user.

Run the loop unattended until the work is clean or reaches a stop condition
below.

## Prepare

Read the spec or tickets. Preparation is complete when you can name the work
units in dependency order and account for every acceptance criterion in the
current unit.

Process multiple tickets one at a time in dependency order. Treat a single
unsliced spec as one unit.

## Run each unit

1. **Implement.** For the first unit, start `implementer` with the inline spec,
   file path, or issue reference. Save the stable Subagent ID returned by
   `agent_start`; use that ID with `agent_resume` for every revision and later
   unit. Use each Run ID for that Run's lifecycle and result calls. Keep one
   implementation Run active at a time because every Run shares the same
   uncommitted tree.

   Resume later units with the new ticket. This step is complete when the Run
   reports its changes, verification results, and gaps. A spec gap that prevents
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
   repository checks pass. Require both reviews regardless of your own reading
   of the diff.

   If either axis has blocking findings, resume the saved implementer with the
   review delta: each blocking finding, its axis, and your judgement and
   rationale where it is disputed. Its retained conversation supplies the
   original brief and implementation history. Then return to review.

   If the same finding is blocking in two consecutive review rounds, declare a
   stalemate and stop the loop. Carry the disagreement to the final report.

## Complete the session

The session is clean only when every unit has completed both review axes and the
required checks pass. A spec gap the implementer cannot cross or a stalemate is
a stop condition, not clean completion.

The work remains uncommitted. Report:

- what changed and which acceptance criteria are met;
- the checks run and their results;
- what each review round resolved;
- unmet criteria, spec gaps, risks, and stalemates.
