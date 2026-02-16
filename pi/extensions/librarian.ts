/**
 * Librarian Extension — Cross-repository code research subagent
 *
 * Spawns an isolated `pi` process to search and read code across GitHub repositories.
 * Can access all public code on GitHub as well as your private repositories.
 * Provides in-depth, detailed explanations based on cross-repository research.
 *
 * The librarian runs in its own context window so it doesn't pollute the main
 * conversation with search noise. Results are returned as a tool result.
 *
 * Usage:
 *   /librarian <query> - Search and read code across GitHub repos
 *   /librarian          - Opens editor for a detailed query
 *
 * The agent can also invoke the librarian tool directly during conversation.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@mariozechner/pi-tui";
import { Type } from "@mariozechner/pi-ai";

// ── Agent definition (inline — no .md file needed) ──────────────────────────

const LIBRARIAN_SYSTEM_PROMPT = `You are the Librarian — a research subagent specialized in cross-repository code investigation on GitHub.

## Capabilities

You search and read code across GitHub repositories using the \`gh\` CLI. You have access to both public repos and the user's private repos via their authenticated \`gh\` session.

## Search Strategies

Use these approaches to find relevant code:

1. **Search code across GitHub:**
   \`gh search code "<search terms>" --limit 20\`
   Add \`--owner <org>\` or \`--repo <owner/repo>\` to narrow scope.

2. **Search repositories:**
   \`gh search repos "<search terms>" --limit 10\`

3. **Browse repository contents:**
   \`gh api repos/<owner>/<repo>/contents/<path> --jq '.[] | "\\(.type) \\(.path)"'\`

4. **Read a specific file (default branch):**
   \`gh api repos/<owner>/<repo>/contents/<path> --jq '.content' | base64 -d\`

5. **Search within a specific repo:**
   \`gh search code "<terms>" --repo <owner/repo>\`

6. **View recent commits or PRs:**
   \`gh api repos/<owner>/<repo>/commits --jq '.[0:10] | .[] | "\\(.sha[0:7]) \\(.commit.message | split("\\n")[0])"'\`
   \`gh pr list --repo <owner/repo> --state merged --limit 10\`

## Research Protocol

1. Start by searching broadly, then narrow down to specific files.
2. Read the actual source code — don't just rely on search snippets.
3. Follow imports and references to build a complete picture.
4. Only search the default branch of repositories.
5. If you find relevant code, read enough surrounding context to understand it fully.

## Output Format

Provide a thorough, detailed response. Your output will be passed back to the main agent who has NOT seen the code you explored.

Structure your response as:

## Repositories Investigated
List repos you searched with brief descriptions.

## Key Findings
Show the relevant code you found with file paths and repo references.
Explain the logic and architecture, not just surface-level descriptions.
Trace through the code flow when relevant.

## Code
Critical types, interfaces, or functions discovered:
\`\`\`language
// repo: owner/repo path/to/file.ext
actual code
\`\`\`

## Architecture
How the pieces connect, especially across repos.

## Summary
Concise answer to the original question.

Be comprehensive. The caller is relying on you for in-depth cross-repository research they can't easily do themselves.`;

// ── Types ───────────────────────────────────────────────────────────────────

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

interface LibrarianDetails {
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

// ── Formatting helpers ──────────────────────────────────────────────────────

const COLLAPSED_ITEM_COUNT = 10;

function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	return `${(count / 1000000).toFixed(1)}M`;
}

function formatUsageStats(usage: UsageStats, model?: string): string {
	const parts: string[] = [];
	if (usage.turns) parts.push(`${usage.turns} turn${usage.turns > 1 ? "s" : ""}`);
	if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
	if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
	if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
	if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);
	if (usage.cost) parts.push(`$${usage.cost.toFixed(4)}`);
	if (usage.contextTokens && usage.contextTokens > 0) parts.push(`ctx:${formatTokens(usage.contextTokens)}`);
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
			const preview = command.length > 80 ? `${command.slice(0, 80)}...` : command;
			return fg("muted", "$ ") + fg("toolOutput", preview);
		}
		case "read": {
			const rawPath = (args.file_path || args.path || "...") as string;
			return fg("muted", "read ") + fg("accent", shortenPath(rawPath));
		}
		case "grep": {
			const pattern = (args.pattern || "...") as string;
			const rawPath = (args.path || ".") as string;
			return fg("muted", "grep ") + fg("accent", `/${pattern}/`) + fg("muted", " in ") + fg("accent", shortenPath(rawPath));
		}
		default: {
			const argStr = Object.entries(args)
				.filter(([, v]) => v !== undefined)
				.map(([k, v]) => `${k}=${typeof v === "string" && v.length > 30 ? v.slice(0, 30) + "..." : v}`)
				.join(" ");
			return fg("muted", `${name} ${argStr}`.trim());
		}
	}
}

function formatToolCallPlain(name: string, args: Record<string, unknown>): string {
	const shortenPath = (p: string) => {
		const home = os.homedir();
		return p.startsWith(home) ? `~${p.slice(home.length)}` : p;
	};

	switch (name) {
		case "bash": {
			const command = (args.command as string) || "...";
			return command.length > 80 ? `$ ${command.slice(0, 80)}...` : `$ ${command}`;
		}
		case "read":
			return `read ${shortenPath((args.file_path || args.path || "...") as string)}`;
		case "grep":
			return `grep /${args.pattern || "..."}/ in ${shortenPath((args.path || ".") as string)}`;
		default:
			return name;
	}
}

// ── Temp file helpers ───────────────────────────────────────────────────────

function writePromptToTempFile(name: string, content: string): { dir: string; filePath: string } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pi-librarian-${name}-`));
	const filePath = path.join(dir, "prompt.md");
	fs.writeFileSync(filePath, content, { mode: 0o600 });
	return { dir, filePath };
}

// ── Subagent runner ─────────────────────────────────────────────────────────

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

const PREFERRED_PROVIDER = "kimi-coding";
const PREFERRED_MODEL_ID = "k2p5";
const PREFERRED_MODEL = `${PREFERRED_PROVIDER}/${PREFERRED_MODEL_ID}`;

async function runLibrarian(
	task: string,
	cwd: string,
	signal: AbortSignal | undefined,
	onUpdate?: (partial: SubagentResult, messages: any[]) => void,
	model?: string,
): Promise<SubagentResult> {
	const args: string[] = ["--mode", "json", "-p", "--no-session", "--tools", "bash,read"];

	if (model) args.push("--model", model);

	let tmpDir: string | null = null;
	let tmpPath: string | null = null;

	const result: SubagentResult = {
		exitCode: 0,
		output: "",
		toolCalls: [],
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, contextTokens: 0, turns: 0 },
	};

	try {
		const tmp = writePromptToTempFile("librarian", LIBRARIAN_SYSTEM_PROMPT);
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
			const proc = spawn("pi", args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
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
									const call: ToolCallInfo = { name: block.name, args: block.arguments || {} };
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
			result.error = "Librarian was aborted";
		}
		result.output = getFinalOutput(messages);

		return result;
	} finally {
		if (tmpPath) try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
		if (tmpDir) try { fs.rmdirSync(tmpDir); } catch { /* ignore */ }
	}
}

// ── Extension ───────────────────────────────────────────────────────────────

export default function librarianExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "librarian",
		label: "Librarian",
		description: [
			"Search and read code across GitHub repositories using an isolated subagent.",
			"The Librarian can search all public code on GitHub and your private repos.",
			"Use for cross-repository research, investigating library internals, or finding how dependencies work.",
			"Only searches default branches. Provides detailed, in-depth explanations.",
		].join(" "),
		parameters: Type.Object({
			query: Type.String({ description: "The research question or investigation task for the Librarian" }),
		}),

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const { query } = params as { query: string };

			// Use modelRegistry API to detect preferred model
			const preferredModel = ctx.modelRegistry.find(PREFERRED_PROVIDER, PREFERRED_MODEL_ID)
				? PREFERRED_MODEL
				: undefined;

			const makeDetails = (partial: SubagentResult): LibrarianDetails => ({
				query,
				toolCalls: partial.toolCalls,
				usage: { ...partial.usage },
				model: partial.model,
				output: partial.output,
				exitCode: partial.exitCode,
			});

			const result = await runLibrarian(query, ctx.cwd, signal, (partial) => {
				if (onUpdate) {
					onUpdate({
						content: [{ type: "text", text: partial.output || "(running...)" }],
						details: makeDetails(partial),
					});
				}
			}, preferredModel);

			if (result.exitCode !== 0 || !result.output) {
				const errorMsg = result.error || result.output || "Librarian failed with no output";
				return {
					content: [{ type: "text", text: `Librarian error: ${errorMsg}` }],
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
				theme.fg("toolTitle", theme.bold("librarian ")) +
				theme.fg("dim", preview);
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded, isPartial }, theme) {
			const details = result.details as LibrarianDetails | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "(no output)", 0, 0);
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
				if (skipped > 0) text += theme.fg("muted", `... ${skipped} earlier calls\n`);
				for (const call of toShow) {
					text += `${theme.fg("muted", "→ ") + formatToolCallThemed(call.name, call.args, fg)}\n`;
				}
				return text.trimEnd();
			};

			// ── Expanded view ──
			if (expanded) {
				const container = new Container();

				// Header
				let header = `${icon} ${theme.fg("toolTitle", theme.bold("librarian"))}`;
				if (isPartial) header += ` ${theme.fg("warning", "(running)")}`;
				else if (isError) header += ` ${theme.fg("error", "[error]")}`;
				container.addChild(new Text(header, 0, 0));

				if (isError && details.error) {
					container.addChild(new Text(theme.fg("error", `Error: ${details.error}`), 0, 0));
				}

				// Query
				container.addChild(new Spacer(1));
				container.addChild(new Text(theme.fg("muted", "─── Query ───"), 0, 0));
				container.addChild(new Text(theme.fg("dim", details.query), 0, 0));

				// Tool calls
				container.addChild(new Spacer(1));
				if (details.toolCalls.length > 0) {
					container.addChild(new Text(theme.fg("muted", "─── Tool Calls ───"), 0, 0));
					for (const call of details.toolCalls) {
						container.addChild(
							new Text(
								theme.fg("muted", "→ ") + formatToolCallThemed(call.name, call.args, fg),
								0,
								0,
							),
						);
					}
				} else if (isPartial) {
					container.addChild(new Text(theme.fg("dim", "(waiting for tool calls...)"), 0, 0));
				}

				// While running, show latest assistant text as a status hint
				if (isPartial && details.output) {
					container.addChild(new Spacer(1));
					// Truncate to first line as a brief status indicator
					const firstLine = details.output.split("\n")[0];
					const preview = firstLine.length > 100 ? firstLine.slice(0, 97) + "..." : firstLine;
					container.addChild(new Text(theme.fg("dim", preview), 0, 0));
				}

				// Output as markdown — only show when complete
				if (!isPartial && details.output) {
					container.addChild(new Spacer(1));
					container.addChild(new Text(theme.fg("muted", "─── Output ───"), 0, 0));
					const mdTheme = getMarkdownTheme();
					container.addChild(new Markdown(details.output.trim(), 0, 0, mdTheme));
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
			let text = `${icon} ${theme.fg("toolTitle", theme.bold("librarian"))}`;

			if (isPartial) {
				// While running: show status + live tool call feed
				text += ` ${theme.fg("warning", `(${details.usage.turns} turn${details.usage.turns !== 1 ? "s" : ""}, ${details.toolCalls.length} calls)`)}`;
				if (details.toolCalls.length > 0) {
					text += `\n${renderToolCalls(details.toolCalls, COLLAPSED_ITEM_COUNT)}`;
				} else if (details.output) {
					// No tool calls yet — show what the assistant is saying
					const firstLine = details.output.split("\n")[0];
					const preview = firstLine.length > 100 ? firstLine.slice(0, 97) + "..." : firstLine;
					text += `\n${theme.fg("dim", preview)}`;
				} else {
					text += `\n${theme.fg("muted", "(starting...)")}`;
				}
			} else if (isError) {
				text += ` ${theme.fg("error", "[error]")}`;
				if (details.error) text += `\n${theme.fg("error", `Error: ${details.error}`)}`;
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
			if (!isPartial && details.output) text += `\n${theme.fg("muted", "(Ctrl+O to expand)")}`;

			return new Text(text, 0, 0);
		},
	});

	// Register /librarian command for direct user invocation
	pi.registerCommand("librarian", {
		description: "Search and read code across GitHub repositories",
		handler: async (args, ctx: ExtensionContext) => {
			let query = args?.trim() || "";

			if (!query) {
				if (!ctx.hasUI) {
					ctx.ui.notify("Usage: /librarian <query>", "error");
					return;
				}

				const input = await ctx.ui.editor(
					"What should the Librarian research?",
					"e.g. How does Next.js handle server components internally?",
				);

				if (!input?.trim()) {
					ctx.ui.notify("Librarian cancelled", "info");
					return;
				}
				query = input.trim();
			}

			ctx.ui.notify(`Librarian researching: ${query.length > 60 ? query.slice(0, 57) + "..." : query}`, "info");

			pi.sendUserMessage(
				`Use the librarian tool to research: ${query}`,
			);
		},
	});
}
