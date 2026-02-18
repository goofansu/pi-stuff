/**
 * Snippets Extension
 *
 * Lists all markdown code blocks from the last assistant message for selection.
 * Allows copying snippets or explaining them with custom instructions.
 *
 * Usage:
 *   /snippets - List and interact with code snippets from last assistant message
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, visibleWidth } from "@mariozechner/pi-tui";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";

interface CodeBlock {
	language: string;
	code: string;
	index: number;
}

/**
 * Extract markdown code blocks from text content
 */
function extractCodeBlocks(text: string): CodeBlock[] {
	const blocks: CodeBlock[] = [];
	const regex = /```(\w+)?\n([\s\S]*?)```/g;
	let match;
	let index = 1;

	while ((match = regex.exec(text)) !== null) {
		const language = match[1] || "text";
		const code = match[2].trim();
		blocks.push({ language, code, index: index++ });
	}

	return blocks;
}

/**
 * Generate a short description for a code block
 */
function describeCodeBlock(block: CodeBlock): string {
	const lines = block.code.split("\n");
	const firstLine = lines[0].trim();
	
	// Truncate if too long
	const maxLength = 60;
	let description = firstLine.length > maxLength 
		? firstLine.substring(0, maxLength) + "..." 
		: firstLine;
	
	// If first line is empty or just a comment/bracket, try to find a meaningful line
	if (!description || description.match(/^[{}\[\]()]*$/) || 
	    description.startsWith("//") || description.startsWith("#") || 
	    description.startsWith("/*") || description.startsWith("*")) {
		for (const line of lines.slice(1)) {  // Skip first line since we already checked it
			const trimmed = line.trim();
			// Skip comments and empty lines
			if (trimmed && 
			    !trimmed.startsWith("//") && 
			    !trimmed.startsWith("#") && 
			    !trimmed.startsWith("/*") && 
			    !trimmed.startsWith("*") &&
			    !trimmed.match(/^[{}\[\]()]*$/)) {
				description = trimmed.length > maxLength 
					? trimmed.substring(0, maxLength) + "..." 
					: trimmed;
				break;
			}
		}
	}
	
	return description || `(${block.language} code)`;
}

/**
 * Get the last assistant message from the session
 */
function getLastAssistantMessage(ctx: any): string | null {
	const entries = ctx.sessionManager.getEntries();
	
	// Search backwards for the last assistant message
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type === "message" && entry.message?.role === "assistant") {
			const content = entry.message.content;
			
			// Extract text from content blocks
			if (Array.isArray(content)) {
				const textParts: string[] = [];
				for (const block of content) {
					if (block && typeof block === "object" && block.type === "text" && typeof block.text === "string") {
						textParts.push(block.text);
					}
				}
				if (textParts.length > 0) {
					return textParts.join("\n");
				}
			} else if (typeof content === "string") {
				return content;
			}
		}
	}
	
	return null;
}

/**
 * Copy text to clipboard using OS-specific commands
 */
async function copyToClipboard(text: string, ctx: any): Promise<void> {
	const os = platform();
	
	try {
		if (os === "darwin") {
			// macOS: use pbcopy
			const result = spawnSync("pbcopy", [], {
				input: text,
				encoding: "utf-8",
			});
			
			if (result.status === 0) {
				ctx.ui.notify("Snippet copied to clipboard!", "info");
				return;
			}
		} else if (os === "linux") {
			// Linux: use xclip
			const result = spawnSync("xclip", ["-selection", "clipboard"], {
				input: text,
				encoding: "utf-8",
			});
			
			if (result.status === 0) {
				ctx.ui.notify("Snippet copied to clipboard!", "info");
				return;
			}
		} else if (os === "win32") {
			// Windows: use clip.exe
			const result = spawnSync("clip.exe", [], {
				input: text,
				encoding: "utf-8",
			});
			
			if (result.status === 0) {
				ctx.ui.notify("Snippet copied to clipboard!", "info");
				return;
			}
		}
		
		// Fallback: clipboard not available for this OS
		ctx.ui.notify(`Clipboard not supported on ${os}`, "warning");
	} catch (error) {
		ctx.ui.notify("Could not copy to clipboard", "warning");
	}
}

function padToWidth(str: string, targetWidth: number): string {
	const currentWidth = visibleWidth(str);
	if (currentWidth >= targetWidth) return str;
	return str + " ".repeat(targetWidth - currentWidth);
}

export default function snippetsExtension(pi: ExtensionAPI) {
	pi.registerCommand("snippets", {
		description: "List code snippets from last assistant message",
		handler: async (_args, ctx: ExtensionContext) => {
			if (!ctx.hasUI) {
				return;
			}

			// Get last assistant message
			const lastMessage = getLastAssistantMessage(ctx);
			if (!lastMessage) {
				ctx.ui.notify("No assistant message found in conversation", "info");
				return;
			}

			// Extract code blocks
			const codeBlocks = extractCodeBlocks(lastMessage);
			if (codeBlocks.length === 0) {
				ctx.ui.notify("No snippets found in the last message", "info");
				return;
			}

			const result = await ctx.ui.custom<{ action: string; block: CodeBlock } | null>((tui, theme, _kb, done) => {
				let cursor = 0;
				let scrollOffset = 0;
				let previewScrollOffset = 0;
				const LIST_WIDTH = 45;
				const VISIBLE_ITEMS = 12;
				const PREVIEW_LINES = VISIBLE_ITEMS + 3; // header + source label + blank

				return {
					render(width: number) {
						const lines: string[] = [];
						const border = theme.fg("accent", "\u2500".repeat(width));
						const previewWidth = Math.max(20, width - LIST_WIDTH - 3);

						// Header
						lines.push(border);

						// Title row
						const countInfo = codeBlocks.length > VISIBLE_ITEMS ? ` (${cursor + 1}/${codeBlocks.length})` : "";
						const titleLeft = " " + theme.fg("accent", theme.bold("Snippets")) + theme.fg("dim", countInfo);
						const currentBlock = codeBlocks[cursor];
						lines.push(padToWidth(titleLeft, LIST_WIDTH) + theme.fg("borderMuted", "\u2502"));

						// Blank separator
						lines.push(padToWidth("", LIST_WIDTH) + theme.fg("borderMuted", "\u2502"));

						// Prepare preview lines for current snippet
						const previewCodeLines: string[] = [];
						if (currentBlock) {
							const codeLines = currentBlock.code.split("\n");
							for (let i = previewScrollOffset; i < codeLines.length && previewCodeLines.length < PREVIEW_LINES - 3; i++) {
								const line = codeLines[i];
								const truncated = line.length > previewWidth - 4
									? line.substring(0, previewWidth - 7) + "..."
									: line;
								previewCodeLines.push("  " + truncated);
							}
						}

						// Content area: list on left, preview on right
						for (let i = 0; i < VISIBLE_ITEMS; i++) {
							const itemIndex = scrollOffset + i;
							let listLine = "";

							if (itemIndex < codeBlocks.length) {
								const block = codeBlocks[itemIndex];
								const isCursor = itemIndex === cursor;

								const cursorIndicator = isCursor ? "\u25B8" : " ";
								const lineCount = block.code.split("\n").length;

								listLine = ` ${cursorIndicator} #${block.index} [${lineCount} lines]`;

								// Truncate if too long for list width
								if (visibleWidth(listLine) > LIST_WIDTH - 1) {
									listLine = listLine.substring(0, LIST_WIDTH - 4) + "...";
								}

								if (isCursor) {
									listLine = theme.fg("accent", listLine);
								} else {
									listLine = theme.fg("text", listLine);
								}
							}

							const paddedLine = padToWidth(listLine, LIST_WIDTH);
							const previewLine = previewCodeLines[i] || "";
							lines.push(paddedLine + theme.fg("borderMuted", "\u2502") + theme.fg("text", previewLine));
						}

						// Footer
						lines.push("");
						lines.push(" " + theme.fg("dim", "\u2191\u2193 navigate \u2022 enter to copy \u2022 e explain \u2022 esc to cancel"));
						const totalCodeLines = currentBlock ? currentBlock.code.split("\n").length : 0;
						if (totalCodeLines > PREVIEW_LINES - 3) {
							lines.push(" " + theme.fg("dim", `\u2190\u2192 scroll preview (${previewScrollOffset + 1}-${Math.min(previewScrollOffset + PREVIEW_LINES - 3, totalCodeLines)}/${totalCodeLines})`));
						}
						lines.push(border);

						return lines;
					},
					invalidate() {},
					handleInput(data: string) {
						const currentBlock = codeBlocks[cursor];

						if (matchesKey(data, Key.up)) {
							cursor = Math.max(0, cursor - 1);
							previewScrollOffset = 0;
							if (cursor < scrollOffset) {
								scrollOffset = cursor;
							}
							tui.requestRender();
						} else if (matchesKey(data, Key.down)) {
							cursor = Math.min(codeBlocks.length - 1, cursor + 1);
							previewScrollOffset = 0;
							if (cursor >= scrollOffset + VISIBLE_ITEMS) {
								scrollOffset = cursor - VISIBLE_ITEMS + 1;
							}
							tui.requestRender();
						} else if (matchesKey(data, Key.left)) {
							// Scroll preview up
							previewScrollOffset = Math.max(0, previewScrollOffset - 3);
							tui.requestRender();
						} else if (matchesKey(data, Key.right)) {
							// Scroll preview down
							if (currentBlock) {
								const maxScroll = Math.max(0, currentBlock.code.split("\n").length - (PREVIEW_LINES - 3));
								previewScrollOffset = Math.min(maxScroll, previewScrollOffset + 3);
								tui.requestRender();
							}
						} else if (matchesKey(data, Key.enter)) {
							if (currentBlock) {
								done({ action: "copy", block: currentBlock });
							}
						} else if (data === "e" || data === "E") {
							if (currentBlock) {
								done({ action: "explain", block: currentBlock });
							}
						} else if (matchesKey(data, Key.escape)) {
							done(null);
						}
					},
				};
			});

			if (!result) {
				ctx.ui.notify("Snippets cancelled", "info");
				return;
			}

			if (result.action === "copy") {
				await copyToClipboard(result.block.code, ctx);
			} else if (result.action === "explain") {
				const snippetFormatted = `\`\`\`${result.block.language}\n${result.block.code}\n\`\`\``;
				pi.sendUserMessage(`Explain this snippet:\n\n${snippetFormatted}`);
			}
		},
	});
}
