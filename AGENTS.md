# AGENTS.md

## Extensions

- Work in the `extensions/` directory when creating or modifying a pi extension.
- Extensions are TypeScript files that follow the pi coding agent extension API.
- Each extension is self-contained — do not extract shared helpers or utilities into separate files. When creating a new extension, copy code from the most similar existing extension rather than abstracting shared logic.
- When updating a specific upstream extension, use the corresponding `curl` command from `extensions/Makefile`.

## Skills

- Work in the `skills/` directory when creating or modifying a pi skill.
- Each SKILL.md must begin (after frontmatter) with a top-level heading using the skill's name in sentence case, e.g. `# Code review`.

## Documentation

- When adding extensions or skills to README.md, sort them alphabetically.
