import { StringEnum, Type } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

const READ_ONLY_COMMANDS = [
  "api",
  "search code",
  "search commits",
  "search issues",
  "search prs",
  "search repos",
  "repo list",
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
const API_BODY_FLAG_PREFIXES = ["--field=", "--raw-field=", "--input="];
const GLOBAL_BLOCKED_FLAGS = new Set(["--web"]);

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

function findApiMethod(args: string[]): string {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--method" || arg === "-X") {
      return (args[i + 1] ?? "").toUpperCase();
    }
    if (arg.startsWith("--method=")) {
      return arg.slice("--method=".length).toUpperCase();
    }
    if (arg.startsWith("-X") && arg.length > 2) {
      return arg.slice(2).toUpperCase();
    }
  }
  return "GET";
}

function validateApiArgs(args: string[]): GhValidationResult | null {
  const method = findApiMethod(args);
  if (!READ_ONLY_API_METHODS.has(method)) {
    return {
      ok: false,
      reason: `gh api only allows GET or HEAD, not ${method || "an empty method"}`,
    };
  }

  const endpoint = args.find((arg) => !arg.startsWith("-"));
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
      API_BODY_FLAG_PREFIXES.some((prefix) => arg.startsWith(prefix))
    ) {
      return {
        ok: false,
        reason: `gh api argument ${arg} is blocked because request body fields can mutate data`,
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

  const blockedFlag = args.find((arg) => GLOBAL_BLOCKED_FLAGS.has(arg));
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

export default function (pi: ExtensionAPI): void {
  pi.registerTool({
    name: "github-search",
    label: "GitHub Search",
    description:
      "Search and read GitHub code/repository data with allowlisted read-only gh commands. Use structured input: command plus args array. Mutating and unavailable gh commands are blocked.",
    promptSnippet:
      "Search GitHub code/repositories and read repository data with structured read-only gh commands",
    promptGuidelines: [
      "Use github-search for GitHub code search, repository discovery, and read-only GitHub CLI/API lookups when local gh authentication is useful.",
      "The github-search tool only accepts structured input: set command to an allowed search/read subcommand and put every remaining CLI token in args.",
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
        `${theme.fg("toolTitle", theme.bold("github-search "))}${theme.fg("dim", suffix)}`,
        0,
        0,
      );
    },
  });
}
