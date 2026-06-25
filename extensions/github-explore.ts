import { StringEnum, Type } from "@earendil-works/pi-ai";
import { type ExtensionAPI, keyHint } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

const READ_ONLY_COMMANDS = [
  "api",
  "search code",
  "search commits",
  "search issues",
  "search prs",
  "search repos",
  "repo list",
  "repo read-dir",
  "repo read-file",
  "repo view",
] as const;

const READ_ONLY_COMMAND_SET = new Set<string>(READ_ONLY_COMMANDS);
const READ_ONLY_API_METHODS = new Set(["GET", "HEAD"]);
const API_BODY_FLAGS = new Set([
  "--field",
  "--raw-field",
  "--input",
  "-f",
  "-F",
]);
const API_BODY_FLAG_PREFIXES = [
  "--field=",
  "--raw-field=",
  "--input=",
  "-f",
  "-F",
];
const API_CACHE_FLAGS = new Set(["--cache"]);
const API_CACHE_FLAG_PREFIXES = ["--cache="];
const READ_FILE_LOCAL_WRITE_FLAGS = new Set(["--clobber", "--output", "-o"]);
const READ_FILE_TERMINAL_ESCAPE_FLAGS = new Set(["--allow-escape-sequences"]);
const READ_FILE_LOCAL_WRITE_FLAG_PREFIXES = ["--clobber=", "--output=", "-o"];
const READ_FILE_TERMINAL_ESCAPE_FLAG_PREFIXES = ["--allow-escape-sequences="];
const GLOBAL_BLOCKED_FLAGS = new Set(["--web", "-w"]);
const GLOBAL_BLOCKED_FLAG_PREFIXES = ["--web="];

export type GhCommand = (typeof READ_ONLY_COMMANDS)[number];

export interface GhToolParams {
  command: GhCommand | string;
  args?: string[];
}

export type GhValidationResult =
  | { ok: true; argv: string[] }
  | { ok: false; reason: string };

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

const API_VALUE_FLAGS = new Set([
  "--cache",
  "--field",
  "--header",
  "--hostname",
  "--input",
  "--jq",
  "--method",
  "--preview",
  "--raw-field",
  "--template",
  "-F",
  "-H",
  "-X",
  "-f",
  "-p",
  "-q",
  "-t",
]);

function findApiMethods(args: string[]): string[] {
  const methods: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--method" || arg === "-X") {
      methods.push((args[i + 1] ?? "").toUpperCase());
      i += 1;
      continue;
    }
    if (arg.startsWith("--method=")) {
      methods.push(arg.slice("--method=".length).toUpperCase());
      continue;
    }
    if (arg.startsWith("-X") && arg.length > 2) {
      methods.push(arg.slice(2).toUpperCase());
    }
  }
  return methods.length > 0 ? methods : ["GET"];
}

function findApiEndpoint(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--") && arg.includes("=")) continue;
    if (arg.startsWith("-")) {
      if (API_VALUE_FLAGS.has(arg)) i += 1;
      continue;
    }
    return arg;
  }

  return undefined;
}

function validateApiArgs(args: string[]): GhValidationResult | null {
  const invalidMethod = findApiMethods(args).find(
    (method) => !READ_ONLY_API_METHODS.has(method),
  );
  if (invalidMethod !== undefined) {
    return {
      ok: false,
      reason: `gh api only allows GET or HEAD, not ${invalidMethod || "an empty method"}`,
    };
  }

  const endpoint = findApiEndpoint(args);
  if (endpoint === "graphql") {
    return {
      ok: false,
      reason:
        "gh api graphql is blocked because GraphQL mutations are hard to validate safely",
    };
  }

  for (const arg of args) {
    if (
      API_BODY_FLAGS.has(arg) ||
      API_BODY_FLAG_PREFIXES.some(
        (prefix) => arg.startsWith(prefix) && arg !== prefix,
      )
    ) {
      return {
        ok: false,
        reason: `gh api argument ${arg} is blocked because request body fields can mutate data`,
      };
    }
  }

  for (const arg of args) {
    if (
      API_CACHE_FLAGS.has(arg) ||
      API_CACHE_FLAG_PREFIXES.some((prefix) => arg.startsWith(prefix))
    ) {
      return {
        ok: false,
        reason: `gh api argument ${arg} is blocked because it writes a local cache`,
      };
    }
  }

  return null;
}

function validateReadFileArgs(args: string[]): GhValidationResult | null {
  for (const arg of args) {
    if (
      READ_FILE_LOCAL_WRITE_FLAGS.has(arg) ||
      READ_FILE_LOCAL_WRITE_FLAG_PREFIXES.some(
        (prefix) => arg.startsWith(prefix) && arg !== prefix,
      )
    ) {
      return {
        ok: false,
        reason: `gh repo read-file argument ${arg} is blocked because it writes local files`,
      };
    }

    if (
      READ_FILE_TERMINAL_ESCAPE_FLAGS.has(arg) ||
      READ_FILE_TERMINAL_ESCAPE_FLAG_PREFIXES.some((prefix) =>
        arg.startsWith(prefix),
      )
    ) {
      return {
        ok: false,
        reason: `gh repo read-file argument ${arg} is blocked because it allows terminal escape side effects`,
      };
    }
  }

  return null;
}

export function validateGhInvocation(params: GhToolParams): GhValidationResult {
  const command =
    typeof params.command === "string" ? params.command.trim() : "";
  if (!READ_ONLY_COMMAND_SET.has(command)) {
    return {
      ok: false,
      reason: `${command || "<empty>"} is not an allowed read-only gh command`,
    };
  }

  const args = params.args ?? [];
  if (!isStringArray(args)) {
    return { ok: false, reason: "args must be an array of strings" };
  }

  const blockedFlag = args.find(
    (arg) =>
      GLOBAL_BLOCKED_FLAGS.has(arg) ||
      GLOBAL_BLOCKED_FLAG_PREFIXES.some((prefix) => arg.startsWith(prefix)),
  );
  if (blockedFlag) {
    return {
      ok: false,
      reason: `${blockedFlag} is blocked because it has side effects outside stdout`,
    };
  }

  if (command === "api") {
    const apiError = validateApiArgs(args);
    if (apiError) return apiError;
  }

  if (command === "repo read-file") {
    const readFileError = validateReadFileArgs(args);
    if (readFileError) return readFileError;
  }

  return { ok: true, argv: [...command.split(" "), ...args] };
}

function formatOutput(stdout: string, stderr: string, code: number): string {
  const parts: string[] = [];
  if (stdout.trim()) parts.push(stdout.trimEnd());
  if (stderr.trim()) parts.push(`stderr:\n${stderr.trimEnd()}`);
  if (parts.length === 0)
    parts.push(`gh exited with code ${code} and no output.`);
  return parts.join("\n\n");
}

function expandHint(): string {
  try {
    return keyHint("app.tools.expand", "to expand");
  } catch {
    return "Ctrl+O to expand";
  }
}

export default function (pi: ExtensionAPI): void {
  pi.registerTool({
    name: "github_explore",
    label: "GitHub Explore",
    description:
      "Explore GitHub repositories you can access to gather ideas, examples, and inspiration. Search for code patterns, inspect files and directories, or browse repositories for reference.",
    promptSnippet:
      "Explore accessible GitHub repos, search code, and read remote files or directories",
    promptGuidelines: [
      "Use github_explore to research how public or private GitHub repositories you can access implement a feature or pattern — e.g. `search code 'streaming parser language:ts'` to find examples.",
      "Use github_explore with `repo read-file` to read an individual file and `repo read-dir` to browse a directory; prefer these over `api` for repository contents.",
      "The github_explore tool only accepts structured input: set command to an allowed search/read subcommand and put every remaining CLI token in args.",
      "Do NOT use github_explore for the current project (CI, workflow runs, PRs, issues, commits) or write operations — use the bash tool with `gh` instead.",
    ],
    parameters: Type.Object({
      command: StringEnum(READ_ONLY_COMMANDS, {
        description:
          "Allowed read-only gh command. Do not include the leading 'gh'. Put additional flags and values in args.",
      }),
      args: Type.Optional(
        Type.Array(
          Type.String({
            description:
              "One CLI token per array entry, passed directly to gh without a shell. Example: ['123', '--json', 'title,url,state'].",
          }),
          {
            description:
              "Arguments and flags after the read-only command. Defaults to an empty array.",
          },
        ),
      ),
    }),

    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const validation = validateGhInvocation(params as GhToolParams);
      if (!validation.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: validation.reason }],
          details: { error: validation.reason },
        };
      }

      const result = await pi.exec("gh", validation.argv, {
        cwd: ctx.cwd,
        signal,
        timeout: 30_000,
      });

      return {
        isError: result.code !== 0,
        content: [
          {
            type: "text",
            text: formatOutput(result.stdout, result.stderr, result.code),
          },
        ],
        details: {
          command: ["gh", ...validation.argv].join(" "),
          code: result.code,
          stdout: result.stdout,
          stderr: result.stderr,
        },
      };
    },

    renderCall(args, theme) {
      const params = args as GhToolParams;
      const suffix = [params.command, ...(params.args ?? [])].join(" ");
      return new Text(
        `${theme.fg("toolTitle", theme.bold("github_explore "))}${theme.fg("dim", suffix)}`,
        0,
        0,
      );
    },

    renderResult(result, { expanded }, theme, context) {
      const details = result.details as
        | {
            command?: string;
            code?: number;
            stdout?: string;
            stderr?: string;
            error?: string;
          }
        | undefined;
      const isError =
        context.isError || (result as { isError?: boolean }).isError === true;
      const icon = isError ? theme.fg("error", "✗") : theme.fg("success", "✓");
      const title = `${icon} ${theme.fg("toolTitle", theme.bold("github_explore"))}`;

      if (details?.error) {
        return new Text(`${title}\n${theme.fg("error", details.error)}`, 0, 0);
      }

      const command = details?.command ?? "gh";
      const code = details?.code ?? (isError ? 1 : 0);
      const output = formatOutput(
        details?.stdout ?? "",
        details?.stderr ?? "",
        code,
      );

      if (!expanded) {
        return new Text(
          `${title} ${theme.fg("dim", command)}\n${theme.fg("dim", `(${expandHint()})`)}`,
          0,
          0,
        );
      }

      return new Text(
        `${title}\n${theme.fg("dim", `Command: ${command}`)}\n${theme.fg("dim", `Exit code: ${code}`)}\n\n${output}`,
        0,
        0,
      );
    },
  });
}
