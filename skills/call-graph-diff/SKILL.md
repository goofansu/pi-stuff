---
name: call-graph-diff
description: Use when the user wants to compare function call relationships between branches, see what functions were added, removed, or rewired across a diff, or generate a call graph diff visualization.
---

# Call graph diff

Create a self-contained `call-graph-diff.html` from call graph diff data. The audience is the coding agent: proceed directly, ask only for blocking information, and report the generated artifact path when done.

## Steps

1. Determine the base branch to compare against:
   - Run `gh pr view --json baseRefName` in the repo to get the PR's declared base branch.
   - If no PR exists, fall back to the repo's default branch: `git remote show origin | grep 'HEAD branch'`.
   - Never assume `master` or `develop` — always look it up.
   - Prefix the resolved branch with `origin/` (e.g. `origin/develop`) to compare against the remote ref, not a potentially stale local branch.
   - Run `git fetch origin <baseRefName>` before diffing to ensure the remote ref is up to date.

2. If call graph diff output is not available, run the `call-graph-diff` subagent with the given branch and the resolved base branch.
3. Check the subagent output before proceeding:
   - If the subagent returns an error, empty output, or anything that is not parseable call-graph data (e.g. plain prose with no function/edge information), **stop and report the raw output to the user**. Do not attempt to invent or guess nodes and edges.
   - Only continue to normalization if the subagent returned structured data (JSON, a known diff format, or prose that explicitly lists functions and call edges).

4. Normalize the output into this JSON shape:

```js
{
  meta: {
    featureBranch: string,
    baseBranch: string
  },
  summary: {
    files_changed: number,
    added: number,
    removed: number,
    rewired: number,
    unchanged: number
  },
  nodes: [
    { id: string, status: "added" | "removed" | "rewired" | "unchanged", file: string }
  ],
  edges: [
    { src: string, dst: string, status: "added" | "removed" | "both" }
  ]
}
```

5. Check if the JSON indicates no call-graph changes:
   - If `nodes` is empty **and** `edges` is empty (or both arrays contain only `unchanged` entries), **stop here** and tell the user there are no call-graph changes to visualise. Do not create the HTML file.

6. Write the JSON to `/tmp/call-graph-diff-data.json`.
7. Render the HTML:

```bash
bash <skill-dir>/scripts/render.sh /tmp/call-graph-diff-data.json /tmp/call-graph-diff.html
```

The script injects the JSON into `examples/call-graph-diff-template.html` and writes the HTML to `/tmp/call-graph-diff.html`.

## Normalization rules

- `added`: function or call edge exists only in the new version.
- `removed`: function or call edge existed only in the old version.
- `rewired`: function exists in both versions, but incoming or outgoing calls changed.
- `unchanged`: function exists in both versions with no material call-edge change.
- edge `both`: call edge exists in both old and new versions.
- Do not add `group` or `groupLabels`; the template derives groups from each node's `file` value.
- If the subagent returns prose or Markdown that **does** contain explicit function names and call edges, translate it into the JSON schema before rendering.
- If the subagent returns prose or Markdown with **no** function or edge information, stop and report the failure rather than fabricating graph data.

## Final response

Return:

- The path to `call-graph-diff.html`.
- A one-sentence summary of what the graph shows.
- Any caveats, such as inferred nodes or edges, missing diff details, or unusually dense layout.
