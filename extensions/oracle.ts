/**
 * Oracle Extension — Second opinion subagent using a powerful reasoning model
 *
 * Spawns an isolated `pi` process with a strong reasoning model
 * for complex analysis, debugging, and review tasks. The oracle runs in its own
 * context window with access to bash and read tools, so it can independently
 * investigate code while reasoning about the problem.
 *
 * The oracle is slower and more expensive than the main agent's model, but excels
 * at deep reasoning. The main agent can autonomously decide to ask the oracle for
 * help, or the user can explicitly request it.
 *
 * Usage:
 *   /oracle <question>  - Ask the oracle directly
 *   /oracle              - Opens editor for a detailed question
 *
 * The agent can also invoke the oracle tool during conversation when it
 * encounters complex reasoning tasks.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui";
import { Type } from "@mariozechner/pi-ai";

// ── Agent definition ─────────────────────────────────────────────────────────

const ORACLE_SYSTEM_PROMPT = `You are the Oracle — a second-opinion reasoning subagent consulted for complex analysis, debugging, and review tasks.

## Role

You provide deep, careful analysis when the main coding agent encounters something that benefits from a second perspective. You have access to bash and read tools to investigate code independently. You excel at:

- Complex debugging: tracing subtle bugs through multiple layers of code
- Code review: identifying correctness issues, edge cases, and architectural problems
- Algorithm analysis: evaluating complexity, correctness, and alternative approaches
- Refactoring guidance: finding the right abstraction level and backwards-compatible changes
- Architecture decisions: weighing trade-offs between different approaches

## Guidelines

1. **Be thorough but focused.** Analyze deeply but stay on-topic. Don't pad your response.
2. **Read the code.** Use your tools to read relevant files and trace through the code. Don't guess about implementation details — look at them.
3. **Show your reasoning.** Walk through your analysis step by step so the caller can verify your logic.
4. **Be concrete.** Reference specific code, line numbers, and variable names. Provide code snippets when helpful.
5. **Flag uncertainty.** If you're not sure about something, say so explicitly rather than guessing.
6. **Prioritize correctness.** Better to be right and slow than fast and wrong — that's why you were consulted.
7. **Consider edge cases.** Think about what could go wrong, not just the happy path.
8. **Provide actionable conclusions.** End with a clear recommendation or answer, not just analysis.

## Output Format

Structure your response clearly:

## Analysis
Walk through your investigation and reasoning.

## Findings
Concrete findings with code references.

## Recommendation
Clear, actionable conclusion.`;

// ── Types ────────────────────────────────────────────────────────────────────

interface UsageStats {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  contextTokens: number;
  turns: number;
}

interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
}

interface OracleDetails {
  query: string;
  toolCalls: ToolCallInfo[];
  usage: UsageStats;
  model?: string;
  output: string;
  error?: string;
  exitCode: number;
}

interface SubagentResult {
  exitCode: number;
  output: string;
  toolCalls: ToolCallInfo[];
  usage: UsageStats;
  model?: string;
  error?: string;
}

// ── Formatting helpers ───────────────────────────────────────────────────────

const COLLAPSED_ITEM_COUNT = 10;

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  return `${(count / 1000000).toFixed(1)}M`;
}

function formatUsageStats(usage: UsageStats, model?: string): string {
  const parts: string[] = [];
  if (usage.turns)
    parts.push(`${usage.turns} turn${usage.turns > 1 ? "s" : ""}`);
  if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
  if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
  if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
  if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);
  if (usage.cost) parts.push(`$${usage.cost.toFixed(4)}`);
  if (usage.contextTokens && usage.contextTokens > 0)
    parts.push(`ctx:${formatTokens(usage.contextTokens)}`);
  if (model) parts.push(model);
  return parts.join(" ");
}

function formatToolCallThemed(
  name: string,
  args: Record<string, unknown>,
  fg: (color: string, text: string) => string,
): string {
  const shortenPath = (p: string) => {
    const home = os.homedir();
    return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
  };

  switch (name) {
    case "bash": {
      const command = (args.command as string) || "...";
      const preview =
        command.length > 80 ? `${command.slice(0, 80)}...` : command;
      return fg("muted", "$ ") + fg("toolOutput", preview);
    }
    case "read": {
      const rawPath = (args.file_path || args.path || "...") as string;
      return fg("muted", "read ") + fg("accent", shortenPath(rawPath));
    }
    case "grep": {
      const pattern = (args.pattern || "...") as string;
      const rawPath = (args.path || ".") as string;
      return (
        fg("muted", "grep ") +
        fg("accent", `/${pattern}/`) +
        fg("muted", " in ") +
        fg("accent", shortenPath(rawPath))
      );
    }
    default: {
      const argStr = Object.entries(args)
        .filter(([, v]) => v !== undefined)
        .map(
          ([k, v]) =>
            `${k}=${typeof v === "string" && v.length > 30 ? v.slice(0, 30) + "..." : v}`,
        )
        .join(" ");
      return fg("muted", `${name} ${argStr}`.trim());
    }
  }
}

// ── Temp file helpers ────────────────────────────────────────────────────────

function writePromptToTempFile(
  name: string,
  content: string,
): { dir: string; filePath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pi-oracle-${name}-`));
  const filePath = path.join(dir, "prompt.md");
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  return { dir, filePath };
}

// ── Subagent runner ──────────────────────────────────────────────────────────

function getFinalOutput(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    if (Array.isArray(msg.content)) {
      const text = msg.content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n")
        .trim();
      if (text) return text;
    }
  }
  return "";
}

const PREFERRED_PROVIDER = "openai-codex";
const PREFERRED_MODEL_ID = "gpt-5.2";
const PREFERRED_MODEL = `${PREFERRED_PROVIDER}/${PREFERRED_MODEL_ID}`;

async function runOracle(
  task: string,
  cwd: string,
  signal: AbortSignal | undefined,
  onUpdate?: (partial: SubagentResult, messages: any[]) => void,
  model?: string,
): Promise<SubagentResult> {
  const args: string[] = [
    "--mode",
    "json",
    "-p",
    "--no-session",
    "--no-extensions",
    "--no-skills",
    "--no-prompt-templates",
    "--no-themes",
    "--tools",
    "bash,read,grep,glob",
  ];

  if (model) args.push("--model", model);

  let tmpDir: string | null = null;
  let tmpPath: string | null = null;

  const result: SubagentResult = {
    exitCode: 0,
    output: "",
    toolCalls: [],
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      cost: 0,
      contextTokens: 0,
      turns: 0,
    },
  };

  try {
    const tmp = writePromptToTempFile("oracle", ORACLE_SYSTEM_PROMPT);
    tmpDir = tmp.dir;
    tmpPath = tmp.filePath;
    args.push("--append-system-prompt", tmpPath);
    args.push(`Task: ${task}`);

    const messages: any[] = [];
    let wasAborted = false;

    const emitUpdate = () => {
      result.output = getFinalOutput(messages);
      onUpdate?.(result, messages);
    };

    const exitCode = await new Promise<number>((resolve) => {
      const proc = spawn("pi", args, {
        cwd,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let buffer = "";

      const processLine = (line: string) => {
        if (!line.trim()) return;
        let event: any;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }

        if (event.type === "message_end" && event.message) {
          const msg = event.message;
          messages.push(msg);

          if (msg.role === "assistant") {
            result.usage.turns++;
            const usage = msg.usage;
            if (usage) {
              result.usage.input += usage.input || 0;
              result.usage.output += usage.output || 0;
              result.usage.cacheRead += usage.cacheRead || 0;
              result.usage.cacheWrite += usage.cacheWrite || 0;
              result.usage.cost += usage.cost?.total || 0;
              result.usage.contextTokens = usage.totalTokens || 0;
            }
            if (!result.model && msg.model) result.model = msg.model;

            if (Array.isArray(msg.content)) {
              for (const block of msg.content) {
                if (block.type === "toolCall") {
                  const call: ToolCallInfo = {
                    name: block.name,
                    args: block.arguments || {},
                  };
                  result.toolCalls.push(call);
                }
              }
            }
          }
          emitUpdate();
        }

        if (event.type === "tool_execution_end" && event.message) {
          messages.push(event.message);
          emitUpdate();
        }
      };

      proc.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) processLine(line);
      });

      proc.stderr.on("data", (data: Buffer) => {
        result.error = (result.error || "") + data.toString();
      });

      proc.on("close", (code: number | null) => {
        if (buffer.trim()) processLine(buffer);
        resolve(code ?? 0);
      });

      proc.on("error", () => resolve(1));

      if (signal) {
        const killProc = () => {
          wasAborted = true;
          proc.kill("SIGTERM");
          setTimeout(() => {
            if (!proc.killed) proc.kill("SIGKILL");
          }, 5000);
        };

        if (signal.aborted) killProc();
        else signal.addEventListener("abort", killProc, { once: true });
      }
    });

    result.exitCode = exitCode;
    if (wasAborted) {
      result.error = "Oracle was aborted";
    }
    result.output = getFinalOutput(messages);

    return result;
  } finally {
    if (tmpPath)
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
    if (tmpDir)
      try {
        fs.rmdirSync(tmpDir);
      } catch {
        /* ignore */
      }
  }
}

// ── Extension ────────────────────────────────────────────────────────────────

export default function oracleExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "oracle",
    label: "Oracle",
    description: [
      "Get a second opinion from a powerful reasoning subagent on complex problems.",
      "The Oracle runs in its own context with access to bash, read, grep, and glob tools,",
      "so it can independently investigate code while reasoning about the problem.",
      "Use for difficult debugging, subtle code review, algorithm analysis,",
      "refactoring decisions, or any task requiring deep reasoning.",
      "The oracle is slower and more expensive, so use it selectively when the problem",
      "genuinely benefits from deeper analysis.",
    ].join(" "),
    parameters: Type.Object({
      query: Type.String({
        description:
          "The question or analysis task for the Oracle. Be specific and include relevant file paths, function names, or context.",
      }),
    }),

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const { query } = params as { query: string };

      // Use modelRegistry API to detect preferred model
      const preferredModel = ctx.modelRegistry.find(
        PREFERRED_PROVIDER,
        PREFERRED_MODEL_ID,
      )
        ? PREFERRED_MODEL
        : undefined;

      const makeDetails = (partial: SubagentResult): OracleDetails => ({
        query,
        toolCalls: partial.toolCalls,
        usage: { ...partial.usage },
        model: partial.model,
        output: partial.output,
        exitCode: partial.exitCode,
      });

      const result = await runOracle(
        query,
        ctx.cwd,
        signal,
        (partial) => {
          if (onUpdate) {
            onUpdate({
              content: [
                { type: "text", text: partial.output || "(thinking...)" },
              ],
              details: makeDetails(partial),
            });
          }
        },
        preferredModel,
      );

      if (result.exitCode !== 0 || !result.output) {
        const errorMsg =
          result.error || result.output || "Oracle failed with no output";
        return {
          content: [{ type: "text", text: `Oracle error: ${errorMsg}` }],
          details: { ...makeDetails(result), error: errorMsg },
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: result.output }],
        details: makeDetails(result),
      };
    },

    renderCall(args, theme) {
      const query = (args as { query: string }).query;
      const preview = query.length > 70 ? `${query.slice(0, 67)}...` : query;
      const text =
        theme.fg("toolTitle", theme.bold("oracle ")) + theme.fg("dim", preview);
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      const details = result.details as OracleDetails | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(
          text?.type === "text" ? text.text : "(no output)",
          0,
          0,
        );
      }

      const isError = !isPartial && (details.exitCode !== 0 || !!details.error);
      const icon = isPartial
        ? theme.fg("warning", "⏳")
        : isError
          ? theme.fg("error", "✗")
          : theme.fg("success", "✓");

      const fg = theme.fg.bind(theme);

      const renderToolCalls = (calls: ToolCallInfo[], limit?: number) => {
        const toShow = limit ? calls.slice(-limit) : calls;
        const skipped = calls.length - toShow.length;
        let text = "";
        if (skipped > 0)
          text += theme.fg("muted", `... ${skipped} earlier calls\n`);
        for (const call of toShow) {
          text += `${theme.fg("muted", "→ ") + formatToolCallThemed(call.name, call.args, fg)}\n`;
        }
        return text.trimEnd();
      };

      // ── Expanded view ──
      if (expanded) {
        const container = new Container();

        // Header
        let header = `${icon} ${theme.fg("toolTitle", theme.bold("oracle"))}`;
        if (isPartial) header += ` ${theme.fg("warning", "(running)")}`;
        else if (isError) header += ` ${theme.fg("error", "[error]")}`;
        container.addChild(new Text(header, 0, 0));

        if (isError && details.error) {
          container.addChild(
            new Text(theme.fg("error", `Error: ${details.error}`), 0, 0),
          );
        }

        // Query
        container.addChild(new Spacer(1));
        container.addChild(new Text(theme.fg("muted", "─── Query ───"), 0, 0));
        container.addChild(new Text(theme.fg("dim", details.query), 0, 0));

        // Tool calls
        container.addChild(new Spacer(1));
        if (details.toolCalls.length > 0) {
          container.addChild(
            new Text(theme.fg("muted", "─── Tool Calls ───"), 0, 0),
          );
          for (const call of details.toolCalls) {
            container.addChild(
              new Text(
                theme.fg("muted", "→ ") +
                  formatToolCallThemed(call.name, call.args, fg),
                0,
                0,
              ),
            );
          }
        } else if (isPartial) {
          container.addChild(
            new Text(theme.fg("dim", "(waiting for tool calls...)"), 0, 0),
          );
        }

        // While running, show latest assistant text as a status hint
        if (isPartial && details.output) {
          container.addChild(new Spacer(1));
          const firstLine = details.output.split("\n")[0];
          const preview =
            firstLine.length > 100 ? firstLine.slice(0, 97) + "..." : firstLine;
          container.addChild(new Text(theme.fg("dim", preview), 0, 0));
        }

        // Output as markdown — only show when complete
        if (!isPartial && details.output) {
          container.addChild(new Spacer(1));
          container.addChild(
            new Text(theme.fg("muted", "─── Output ───"), 0, 0),
          );
          const mdTheme = getMarkdownTheme();
          container.addChild(
            new Markdown(details.output.trim(), 0, 0, mdTheme),
          );
        }

        // Usage stats
        const usageStr = formatUsageStats(details.usage, details.model);
        if (usageStr) {
          container.addChild(new Spacer(1));
          container.addChild(new Text(theme.fg("dim", usageStr), 0, 0));
        }

        return container;
      }

      // ── Collapsed view ──
      let text = `${icon} ${theme.fg("toolTitle", theme.bold("oracle"))}`;

      if (isPartial) {
        // While running: show status + live tool call feed
        text += ` ${theme.fg("warning", `(${details.usage.turns} turn${details.usage.turns !== 1 ? "s" : ""}, ${details.toolCalls.length} calls)`)}`;
        if (details.toolCalls.length > 0) {
          text += `\n${renderToolCalls(details.toolCalls, COLLAPSED_ITEM_COUNT)}`;
        } else if (details.output) {
          const firstLine = details.output.split("\n")[0];
          const preview =
            firstLine.length > 100 ? firstLine.slice(0, 97) + "..." : firstLine;
          text += `\n${theme.fg("dim", preview)}`;
        } else {
          text += `\n${theme.fg("muted", "(thinking...)")}`;
        }
      } else if (isError) {
        text += ` ${theme.fg("error", "[error]")}`;
        if (details.error)
          text += `\n${theme.fg("error", `Error: ${details.error}`)}`;
      } else {
        // Completed: show tool calls summary + hint to expand for full output
        if (details.toolCalls.length === 0) {
          text += `\n${theme.fg("muted", "(no tool calls)")}`;
        } else {
          text += `\n${renderToolCalls(details.toolCalls, COLLAPSED_ITEM_COUNT)}`;
        }
      }

      const usageStr = formatUsageStats(details.usage, details.model);
      if (usageStr) text += `\n${theme.fg("dim", usageStr)}`;
      if (!isPartial && details.output)
        text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;

      return new Text(text, 0, 0);
    },
  });

  // Register /oracle command for direct user invocation
  pi.registerCommand("oracle", {
    description:
      "Ask the Oracle (a powerful reasoning subagent) for a second opinion",
    handler: async (args, ctx: ExtensionContext) => {
      let query = args?.trim() || "";

      if (!query) {
        if (!ctx.hasUI) {
          ctx.ui.notify("Usage: /oracle <question>", "error");
          return;
        }

        const input = await ctx.ui.editor(
          "What should the Oracle analyze?",
          "e.g. Is there a subtle bug in this function? Check src/auth.ts",
        );

        if (!input?.trim()) {
          ctx.ui.notify("Oracle cancelled", "info");
          return;
        }
        query = input.trim();
      }

      ctx.ui.notify(
        `Oracle analyzing: ${query.length > 60 ? query.slice(0, 57) + "..." : query}`,
        "info",
      );

      pi.sendUserMessage(`Use the oracle tool to analyze: ${query}`);
    },
  });
}
