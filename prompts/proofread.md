---
description: Proofread a document for spelling, grammar, repeated terms, logical errors, weak arguments, and broken links
argument-hint: "<file>"
---

Proofread the document provided in the arguments: $@

## Desired outcome

The document is ready for publication, with spelling, grammar, clarity, and obvious quality issues fixed or reported.

## Scope

Review the provided file only unless the user explicitly asks otherwise.

Preserve the author's voice, structure, meaning, and formatting. Do not rewrite more than necessary.

## What to check

Fix clear issues directly:

- spelling mistakes and typos
- grammar and punctuation mistakes
- repeated or awkward phrasing
- duplicated words or repeated terms
- empty, placeholder, malformed, or obviously broken links
- formatting mistakes that are clearly accidental

Flag issues instead of silently changing them when they involve judgment:

- possible logical errors
- factual claims that may be wrong
- weak arguments that could be strengthened
- unclear claims where the intended meaning is ambiguous
- links that require external verification

## Link handling

Check for empty or placeholder links such as:

- `[]()`
- `[text]()`
- `[text](TODO)`
- `[text](#)`
- `[text](...)`
- bare placeholder URLs

Do not claim that an external URL works unless you actually checked it.

## Final response

After proofreading, summarize:

- what was fixed
- what was flagged for the user to review
- any files changed

If no changes were needed, say the document already looked publication-ready.
