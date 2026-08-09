# Issue tracker: Local Markdown

Issues and specs for this repo live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- Specification: `.scratch/<feature-slug>/spec.md`
- Implementation tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Number tickets from `01`; never use one combined tickets file
- Record state with a `Status:` line near the top
- Append conversation history under `## Comments`

## Publishing and fetching

When a skill says “publish to the issue tracker,” create the appropriate file under `.scratch/<feature-slug>/`.

When a skill says “fetch the relevant ticket,” read the referenced path. The user will normally provide the path or ticket number.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`
- Ticket type: `Type: research|prototype|grilling|task`
- Ticket state: `Status: claimed|resolved`
- Dependencies: `Blocked by: NN, NN`
- Claim before working by setting `Status: claimed`
- Resolve by adding `## Answer`, setting `Status: resolved`, and updating the map’s Decisions-so-far
