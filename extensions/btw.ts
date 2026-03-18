/**
 * btw - Ask a question with full access to the current session context.
 *
 * Usage: /btw <question>
 *        /btw  (prompts for input)
 *
 * Unlike /ask (which starts a fresh, context-free conversation), /btw
 * sends your question together with the entire current session history.
 * The model can see everything that's happened so far and answer accordingly.
 *
 * No tools are available — the model can only reason over what's already in
 * context.  The answer is shown in a dismissible overlay and nothing is
 * written back to the current session branch.
 */

import crypto from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, relative } from "path";
import { complete, type UserMessage, type AssistantMessage, type ToolResultMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { BorderedLoader, getMarkdownTheme } from "@mariozechner/pi-coding-agent";
import { Key, Markdown, matchesKey, truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

export default function (pi: ExtensionAPI) {
	pi.registerCommand("btw", {
		description: "Ask a question with full session context (no tools, stays on main branch)",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("btw requires interactive mode", "error");
				return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			// ── 1. Determine the question ─────────────────────────────────────
			let question = args?.trim() ?? "";

			if (!question) {
				const entered = await ctx.ui.input("btw", "Question:");
				if (!entered?.trim()) {
					ctx.ui.notify("No question entered", "info");
					return;
				}
				question = entered.trim();
			}

			// ── 2. Build message list from current session context ────────────
			// buildSessionContext() walks from the current leaf to root and returns
			// the resolved message list — exactly what the LLM sees in normal use.
			const sessionCtx = ctx.sessionManager.buildSessionContext();

			// Filter to only the message roles that the LLM API accepts.
			// AgentMessage includes other roles (bashExecution, custom, etc.)
			// that are not part of the standard provider protocol.
			//
			// Also strip ThinkingContent blocks from assistant messages. If thinking
			// blocks are present in the history, Anthropic requires thinking to be
			// enabled on the current request too — which would cause the btw
			// response itself to contain thinking blocks (or <thinking> delimiters).
			const historyMessages = sessionCtx.messages
				.filter(
					(m): m is UserMessage | AssistantMessage | ToolResultMessage =>
						m.role === "user" || m.role === "assistant" || m.role === "toolResult",
				)
				.map((m): UserMessage | AssistantMessage | ToolResultMessage => {
					if (m.role !== "assistant") return m;
					return {
						...m,
						content: m.content.filter((block) => block.type !== "thinking"),
					} as AssistantMessage;
				});

			// Append the btw question as a fresh user turn.
			const messages: (UserMessage | AssistantMessage | ToolResultMessage)[] = [
				...historyMessages,
				{
					role: "user",
					content: [{ type: "text", text: question }],
					timestamp: Date.now(),
				} satisfies UserMessage,
			];

			// Include the current system prompt so the model retains its persona/rules.
			const systemPrompt = ctx.getSystemPrompt();

			// ── 3. Ask the LLM — no tools, no session writes ─────────────────
			const answer = await ctx.ui.custom<string | null | false>((tui, theme, _kb, done) => {
				const loader = new BorderedLoader(tui, theme, `btw: ${question}`);
				loader.onAbort = () => done(null);

				const doAsk = async () => {
					const apiKey = await ctx.modelRegistry.getApiKey(ctx.model!);

					const response = await complete(
						ctx.model!,
						{ systemPrompt, messages, tools: [] },
						{ apiKey, signal: loader.signal },
					);

					if (response.stopReason === "aborted") return null;

					const answerText = response.content
						.filter((c): c is { type: "text"; text: string } => c.type === "text")
						.map((c) => c.text)
						.join("\n");

					if (!answerText) throw new Error("model returned no text content");
					return answerText;
				};

				doAsk()
					.then((result) => { if (!loader.signal.aborted) done(result); })
					.catch((e: any) => {
						if (loader.signal.aborted) return;
						if (e?.message) ctx.ui.notify(`btw: ${e.message}`, "error");
						done(false);
					});

				return loader;
			});

			if (answer === null || answer === false) return;

			// ── 4. Show the answer in a dismissible overlay ───────────────────
			// Enter inserts the answer into the editor; Escape dismisses.
			await ctx.ui.custom<void>(
				(tui, theme, _kb, done) => {
					const md = new Markdown(answer.trim(), 1, 0, getMarkdownTheme());
					let scrollOffset = 0;
					let viewHeight = 0;
					let totalLines = 0;
					let mdCacheWidth = -1;
					let mdCacheLines: string[] = [];

					function buildTitleLine(width: number): string {
						const titleText = " btw ";
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
						const back = theme.fg("dim", "esc back");
						const insertHint = theme.fg("dim", "enter to insert");
						const noteHint = theme.fg("dim", "ctrl+s to save");
						const nav = theme.fg("dim", "↑/↓: move. ←/→: page.");
						let line = [back, insertHint, noteHint, nav].join(theme.fg("muted", " • "));
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
						if (matchesKey(data, Key.enter)) { ctx.ui.setEditorText(answer.trim()); done(); return; }
						if (matchesKey(data, Key.escape)) { done(); return; }
						if (matchesKey(data, Key.up)) { scrollBy(-1); tui.requestRender(); return; }
						if (matchesKey(data, Key.down)) { scrollBy(1); tui.requestRender(); return; }
						if (matchesKey(data, Key.left)) { scrollBy(-viewHeight || -1); tui.requestRender(); return; }
						if (matchesKey(data, Key.right)) { scrollBy(viewHeight || 1); tui.requestRender(); return; }
						if (matchesKey(data, Key.ctrl("s"))) {
							try {
								const dir = join(ctx.cwd, ".pi", "btw");
								mkdirSync(dir, { recursive: true });
								let id: string | undefined;
								for (let attempt = 0; attempt < 10; attempt += 1) {
									const candidate = crypto.randomBytes(4).toString("hex");
									if (!existsSync(join(dir, `${candidate}.md`))) { id = candidate; break; }
								}
								if (!id) throw new Error("Failed to generate unique btw note id");
								const filePath = join(dir, `${id}.md`);
								const content = `# ${question.trim()}\n\n${answer.trim()}\n`;
								writeFileSync(filePath, content, "utf-8");
								ctx.ui.notify(`Saved note: ${relative(ctx.cwd, filePath)}`, "info");
							} catch (error) {
								const message = error instanceof Error ? error.message : String(error);
								ctx.ui.notify(message, "error");
							}
							return;
						}
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
