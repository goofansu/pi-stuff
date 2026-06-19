---
name: summarize
description: Use when converting a URL or local document into Markdown, or summarizing extracted document content.
---

# Summarize

Convert URLs or local documents into Markdown so they can be inspected, quoted, summarized, or processed like normal text.

Supported inputs include URLs, PDFs, Word documents, PowerPoints, HTML pages, text files, and similar materials.

## When to use

Use this skill when you need to:
* convert a web page or document into Markdown
* summarize a long URL or local document
* preserve converted Markdown for later inspection or quotation

## Usage

Run from this skill folder.

Convert to Markdown:

```bash
node to-markdown.mjs <url-or-path> --tmp
```

Convert and summarize:

```bash
node to-markdown.mjs <url-or-path> --summary --prompt "<summary focus, audience, or extraction goal>"
```

When summarizing, provide a focused prompt describing what to extract and who the summary is for.

## Output expectations

When converting only, report the saved Markdown path.

When summarizing, provide the summary and include the path to the full converted Markdown.

## Safety

Do not invent content that is not present in the source.

If conversion fails, report the failing command and the error.

If the input is unavailable, private, behind authentication, or too large to process, report the limitation and suggest the closest usable next step.
