/**
 * ask - Ask a quick question in a fresh, context-free conversation.
 *
 * Usage: /ask <question>
 *        /ask  (prompts for input)
 *
 * The question is sent to the LLM with a minimal system prompt (conciseness
 * + Markdown + search policy) and no session history.  The answer is shown
 * in a dismissible overlay panel and is never injected into the current
 * conversation context.
 */

import { complete, Type, type Tool, type UserMessage, type AssistantMessage, type ToolResultMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { BorderedLoader, getMarkdownTheme, keyHint } from "@mariozechner/pi-coding-agent";
import { Markdown, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

const ASK_MODEL = "opencode/claude-haiku-4-5";
const ASK_MAX_ITERATIONS = 5;
const ASK_SEARCH_COUNT = 5;

// ── Web search via Brave API ─────────────────────────────────────────────────

const webSearchTool: Tool = {
	name: "web_search",
	description: "Search the web for current or specific information. Use when the question requires up-to-date facts, recent events, or specific details not reliably known from training data.",
	parameters: Type.Object({
		query: Type.String({ description: "The search query" }),
	}),
};

interface SearchSource { title: string; url: string; }
interface SearchResponse { text: string; sources: SearchSource[]; }

async function braveSearch(query: string): Promise<SearchResponse> {
	const apiKey = process.env.BRAVE_SEARCH_API_KEY;
	if (!apiKey) throw new Error("BRAVE_SEARCH_API_KEY is not set");

	const url = "https://api.search.brave.com/res/v1/web/search?" +
		new URLSearchParams({ q: query, count: ASK_SEARCH_COUNT.toString(), extra_snippets: "true" });

	const res = await fetch(url, {
		headers: { "Accept": "application/json", "X-Subscription-Token": apiKey },
	});

	if (!res.ok) {
		const detail = await res.json().then((d: any) => d?.error?.detail ?? d?.error?.code).catch(() => null);
		throw new Error(`Brave search failed: ${res.status}${detail ? ` — ${detail}` : ""}`);
	}

	const data = await res.json() as any;
	const results: any[] = data.web?.results ?? [];

	if (results.length === 0) return { text: "No results found.", sources: [] };

	const sources: SearchSource[] = results.map((r: any) => ({ title: r.title, url: r.url }));
	const text = results.map((r: any, i: number) => {
		const snippets = [r.description, ...(r.extra_snippets ?? [])].filter(Boolean).join(" ");
		return `${i + 1}. **${r.title}**\n   ${r.url}\n   ${snippets}`;
	}).join("\n\n");

	return { text, sources };
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("ask", {
		description: "Ask a quick context-free question in a fresh conversation",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("ask requires interactive mode", "error");
				return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			// ── 1. Determine the question ─────────────────────────────────────
			let question = args?.trim() ?? "";

			if (!question) {
				const entered = await ctx.ui.input("ask", "Question:");
				if (!entered?.trim()) {
					ctx.ui.notify("No question entered", "info");
					return;
				}
				question = entered.trim();
			}

			// ── 2. Resolve model — prefer ASK_MODEL, fall back to active model ──
			const [provider, modelId] = ASK_MODEL.split("/");
			const askModel = ctx.modelRegistry.find(provider, modelId) ?? ctx.model!;

			// Only offer web search if the API key is present
			const hasWebSearch = Boolean(process.env.BRAVE_SEARCH_API_KEY);
			const tools = hasWebSearch ? [webSearchTool] : [];

			// ── 3. Ask the LLM in a fresh, context-free session ──────────────
			// null = user cancelled, false = error (already notified), string = answer
			const SYSTEM_PROMPT =
				"You are a concise assistant. Answer questions directly and use Markdown formatting.\n" +
				"Only call web_search for time-sensitive facts or information you are not confident about.\n" +
				"Keep answers short unless depth is clearly needed.";
			const answer = await ctx.ui.custom<string | null | false>((tui, theme, _kb, done) => {
				const loader = new BorderedLoader(tui, theme, `ask: ${question}`);
				loader.onAbort = () => done(null);

				const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
				const searchFrames  = ["◐", "◓", "◑", "◒", "◐", "◓", "◑", "◒", "◐", "◓"];
				// setLoaderFrames accesses the private `loader` field of BorderedLoader
				// to swap the spinner animation during web search. If BorderedLoader
				// ever exposes a public API for this, switch to that instead.
				const innerLoader = (loader as any).loader;

				function setLoaderFrames(frames: string[]) {
					if (innerLoader?.frames) innerLoader.frames = frames;
				}

				const doAsk = async () => {
					const apiKey = await ctx.modelRegistry.getApiKey(askModel);
					const messages: (UserMessage | AssistantMessage | ToolResultMessage)[] = [{
						role: "user",
						content: [{ type: "text", text: question }],
						timestamp: Date.now(),
					}];
					const allSources: SearchSource[] = [];

					// Tool-calling loop — model decides whether to search or answer directly
					for (let i = 0; i < ASK_MAX_ITERATIONS; i++) {
						const response = await complete(
							askModel,
							{ messages, tools, systemPrompt: SYSTEM_PROMPT },
							{ apiKey, signal: loader.signal },
						);

						if (response.stopReason === "aborted") return null;

						const toolCalls = response.content.filter(c => c.type === "toolCall");

						// No tool calls → final answer
						if (toolCalls.length === 0) {
							let answerText = response.content
								.filter((c): c is { type: "text"; text: string } => c.type === "text")
								.map((c) => c.text)
								.join("\n");
							if (!answerText) throw new Error("model returned no text content");
							if (allSources.length > 0) {
								const seen = new Set<string>();
								const uniqueSources = allSources.filter(s => !seen.has(s.url) && seen.add(s.url));
								const sourcesMd = uniqueSources
									.map((s, i) => `${i + 1}. [${s.title}](${s.url})`)
									.join("\n");
								answerText += `\n\n---\n**Sources**\n${sourcesMd}`;
							}
							return answerText;
						}

						// Feed assistant response back, then execute tool calls
						setLoaderFrames(searchFrames);
						messages.push(response);
						for (const block of toolCalls) {
							const query = block.arguments.query;
							let text: string;
							let isError = false;
							try {
								if (typeof query !== "string") throw new Error("missing query argument");
								const result = await braveSearch(query);
								text = result.text;
								allSources.push(...result.sources);
							} catch (e: any) {
								text = `Search error: ${e.message}`;
								isError = true;
								ctx.ui.notify(`ask: search failed — ${e.message}`, "warning");
							}
							messages.push({
								role: "toolResult",
								toolCallId: block.id,
								toolName: block.name,
								content: [{ type: "text", text }],
								isError,
								timestamp: Date.now(),
							} as ToolResultMessage);
						}
						setLoaderFrames(spinnerFrames);
					}

					throw new Error("reached maximum search iterations");
				};

				doAsk().then((result) => { if (!loader.signal.aborted) done(result); }).catch((e: any) => {
					if (loader.signal.aborted) return; // abort already handled via onAbort
					if (e?.message) ctx.ui.notify(`ask: ${e.message}`, "error");
					done(false);
				});
				return loader;
			});

			if (answer === null || answer === false) return;

			// ── 4. Show the answer in a dismissible overlay ───────────────────
			// Enter inserts the answer into the editor; Escape dismisses.
			await ctx.ui.custom<void>(
				(tui, theme, kb, done) => {
					const md = new Markdown(answer.trim(), 1, 0, getMarkdownTheme());
					let scrollOffset = 0;
					let viewHeight = 0;
					let totalLines = 0;
					let mdCacheWidth = -1;
					let mdCacheLines: string[] = [];

					function buildTitleLine(width: number): string {
						const titleText = " ask ";
						const titleWidth = visibleWidth(titleText);
						if (titleWidth >= width) return truncateToWidth(theme.fg("accent", titleText.trim()), width);
						const leftWidth = Math.max(0, Math.floor((width - titleWidth) / 2));
						const rightWidth = Math.max(0, width - titleWidth - leftWidth);
						return (
							theme.fg("borderMuted", "─".repeat(leftWidth)) +
							theme.fg("accent", titleText) +
							theme.fg("borderMuted", "─".repeat(rightWidth))
						);
					}

					function buildActionLine(width: number, total: number, view: number, offset: number): string {
						const back = keyHint("tui.select.cancel", "back");
						const insertHint = keyHint("tui.select.confirm", "insert");
						const nav = theme.fg("dim", "↑/↓: move. ←/→: page.");
						let line = [back, insertHint, nav].join(theme.fg("muted", " • "));
						if (total > view) {
							const start = Math.min(total, offset + 1);
							const end = Math.min(total, offset + view);
							line += theme.fg("dim", ` ${start}-${end}/${total}`);
						}
						return truncateToWidth(line, width);
					}

					function scrollBy(delta: number): void {
						const maxScroll = Math.max(0, totalLines - viewHeight);
						scrollOffset = Math.max(0, Math.min(scrollOffset + delta, maxScroll));
					}

					function render(width: number): string[] {
						const headerLines = 2; // title + blank
						const footerLines = 2; // blank + action
						const borderLines = 2;
						const innerWidth = Math.max(10, width - 2);
						const maxHeight = Math.max(10, Math.floor((process.stdout.rows || 24) * 0.8));
						const contentHeight = Math.max(1, maxHeight - headerLines - footerLines - borderLines);

						if (innerWidth !== mdCacheWidth) {
							mdCacheLines = md.render(innerWidth);
							mdCacheWidth = innerWidth;
						}
						totalLines = mdCacheLines.length;
						viewHeight = contentHeight;
						const maxScroll = Math.max(0, totalLines - contentHeight);
						scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));

						const visibleContent = mdCacheLines.slice(scrollOffset, scrollOffset + contentHeight);
						const lines: string[] = [];

						lines.push(buildTitleLine(innerWidth));
						lines.push("");

						for (const line of visibleContent) {
							lines.push(truncateToWidth(line, innerWidth));
						}
						while (lines.length < headerLines + contentHeight) {
							lines.push("");
						}

						lines.push("");
						lines.push(buildActionLine(innerWidth, totalLines, contentHeight, scrollOffset));

						const borderColor = (text: string) => theme.fg("borderMuted", text);
						const top = borderColor(`┌${"─".repeat(innerWidth)}┐`);
						const bottom = borderColor(`└${"─".repeat(innerWidth)}┘`);
						const framedLines = lines.map((line) => {
							const truncated = truncateToWidth(line, innerWidth);
							const padding = Math.max(0, innerWidth - visibleWidth(truncated));
							return borderColor("│") + truncated + " ".repeat(padding) + borderColor("│");
						});

						return [top, ...framedLines, bottom].map((line) => truncateToWidth(line, width));
					}

					function handleInput(data: string) {
						if (kb.matches(data, "tui.select.confirm")) { ctx.ui.setEditorText(answer.trim()); done(); return; }
						if (kb.matches(data, "tui.select.cancel")) { done(); return; }
						if (kb.matches(data, "tui.select.up")) { scrollBy(-1); tui.requestRender(); return; }
						if (kb.matches(data, "tui.select.down")) { scrollBy(1); tui.requestRender(); return; }
						if (kb.matches(data, "tui.editor.cursorLeft")) { scrollBy(-viewHeight || -1); tui.requestRender(); return; }
						if (kb.matches(data, "tui.editor.cursorRight")) { scrollBy(viewHeight || 1); tui.requestRender(); return; }
					}

					return { render, invalidate: () => {}, handleInput };
				},
				{
					overlay: true,
					overlayOptions: { width: "80%", maxHeight: "80%", anchor: "center" },
				},
			);


		},
	});

}
