---
name: how
description: Explain subsystem architecture, runtime flow, and code placement.
disable-model-invocation: true
---

# How

Explore the codebase and produce an architectural explanation that gives a senior engineer a working mental model without becoming annotated source code.

## Step 1. Assess complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple:** A single module, small utility, or narrow question. Use one agent to investigate and explain; go to Step 2b.
- **Complex:** A subsystem spanning multiple files or services, a cross-cutting feature, or a full architectural overview. Use parallel exploration; go to Step 2a.

When in doubt, take the simple path.

## Step 2a. Explore

Split the question into 2 to 4 distinct exploration angles. Spawn one general-purpose agent per angle in parallel, building each prompt from `references/explorer-prompt.md`.

Continue when every agent has traced its assigned flow, boundaries, and open questions.

## Step 2b. Directly explain

Spawn one general-purpose agent using `references/explainer-prompt.md`. Fill in the question and omit the optional explorer-findings section. Go to Step 4 when it returns.

## Step 3. Synthesize

After every explorer returns, spawn one general-purpose agent using `references/explainer-prompt.md`. Fill in the question and include all explorer findings. Go to Step 4 when it has reconciled every finding or identified the remaining gaps.

## Step 4. Present

Present the explainer's output. Light edits for clarity or conversational context are fine; preserve its substance.
