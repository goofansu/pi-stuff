/**
 * Snippets Extension
 *
 * Lists all markdown code blocks from the last assistant message for selection.
 * Allows copying snippets or explaining them with custom instructions.
 *
 * Usage:
 *   /snippets - List and interact with code snippets from last assistant message
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
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

export default function snippetsExtension(pi: ExtensionAPI) {
	pi.registerCommand("snippets", {
		description: "List code snippets from last assistant message",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				return;
			}

			// Get last assistant message
			const lastMessage = getLastAssistantMessage(ctx);
			if (!lastMessage) {
				ctx.ui.notify("No assistant message found in conversation", "warning");
				return;
			}

			// Extract code blocks
			const codeBlocks = extractCodeBlocks(lastMessage);
			if (codeBlocks.length === 0) {
				ctx.ui.notify("No snippets found in the last message", "info");
				return;
			}

			// Build selection items
			const items = codeBlocks.map((block) => {
				const description = describeCodeBlock(block);
				return `snippet ${block.index}: ${description}`;
			});

			// Show selection
			const selected = await ctx.ui.select("Select a snippet:", items);
			if (!selected) {
				return; // User cancelled
			}

			// Find the selected block
			const selectedIndex = parseInt(selected.match(/snippet (\d+):/)?.[1] || "0");
			const selectedBlock = codeBlocks.find((b) => b.index === selectedIndex);
			
			if (!selectedBlock) {
				ctx.ui.notify("Could not find selected snippet", "error");
				return;
			}

			// Show action menu
			const action = await ctx.ui.select("What do you want to do?", ["Copy", "Explain"]);
			
			if (!action) {
				return; // User cancelled
			}

			if (action === "Copy") {
				// Copy snippet to clipboard
				await copyToClipboard(selectedBlock.code, ctx);
			} else {
				// Send user message with the snippet and prompt
				const snippetFormatted = `\`\`\`${selectedBlock.language}\n${selectedBlock.code}\n\`\`\``;
				pi.sendUserMessage(`Explain this snippet:\n\n${snippetFormatted}`);
			}
		},
	});
}
