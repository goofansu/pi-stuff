# AGENTS.md

## Extensions

- Work in the `extensions/` directory when creating or modifying a pi extension.
- Extensions are TypeScript files that follow the pi coding agent extension API.
- Each extension is self-contained — do not extract shared helpers or utilities into separate files. When creating a new extension, copy code from the most similar existing extension rather than abstracting shared logic.
- If an extension requires env variables, declare them in the header comment and warn via `ctx.ui.notify` in a `session_start` handler — see `slack.ts` for the pattern.
- For extensions that use `pi.registerTool()`:
  - `description` = what the tool is; keep it concise and focused on the tool's identity/capability.
  - `promptSnippet` = how it appears in the tool list; write a short action phrase, not detailed usage instructions.
  - `promptGuidelines` = how the agent should behave around it:
    - Start usage guidance with `Use <tool_name> ...`.
    - Include structured-input rules when the tool expects a specific command/parameter shape.
    - Include explicit `Do NOT ...` guardrails for unsupported or risky uses.

## Skills

- Work in the `skills/` directory when creating or modifying a pi skill.
- Each SKILL.md must begin (after frontmatter) with a top-level heading using the skill's name in sentence case, e.g. `# Code review`.
