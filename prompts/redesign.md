---
description: Redesign a PR implementation from scratch and compare with the original
---
Requirements: $@

If the requirements above is a URL, fetch it first to extract the feature requirements. If it is a Jira URL, use the jira skill to retrieve the ticket details.

There is an existing PR implementing those requirements. Treat it as a rough prototype — the feature intent is correct, but the implementation is not final.

Step 1 — Understand the PR
Read the changed files and understand what the feature is trying to do.

Based on what you've read, identify the key design tradeoffs this feature involves and ask the user which outcomes matter most for this specific case. Wait for their response before continuing.

Step 2 — Redesign
Treat every decision in the PR as up for debate. For each part of the implementation, ask: "is this the best way to do it?" Design the cleanest solution you can, guided by the priorities the user provided.

Write your proposed implementation to new or modified files.

Step 3 — Compare
Produce a clear side-by-side comparison of the PR's approach vs your redesign. For each difference, explain:
- What the PR does
- What your design does instead
- Why the change matters
