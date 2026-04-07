/**
 * Status Line Extension
 *
 * Displays information in the footer status line:
 * - #ID — current branch's GitHub PR number as a clickable hyperlink (OSC 8)
 *
 * PR info is fetched once at session_start. The fetch is fire-and-forget so it
 * does not block session startup — the status appears as soon as `gh` responds.
 *
 * Color: accent — matches ~/code/pi-remote-control.
 *
 * Commands:
 * - /statusline:pr — show full PR details in the editor area
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder, keyHint } from "@mariozechner/pi-coding-agent";
import { Container, Spacer, Text } from "@mariozechner/pi-tui";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const STATUS_KEY = "pr-status";

interface PrInfo {
	number: number;
	url: string;
}

interface PrDetail {
	number: number;
	title: string;
	url: string;
	state: string;
	isDraft: boolean;
	author: { login: string };
	baseRefName: string;
	headRefName: string;
	additions: number;
	deletions: number;
	changedFiles: number;
	labels: { name: string }[];
	reviewDecision: string | null;
	statusCheckRollup: { state: string; name?: string; context?: string }[] | null;
	latestReviews: { author: { login: string }; state: string }[];
}

/** Run `gh pr view` and return minimal PR info, or null if none found. */
async function fetchPrInfo(cwd: string): Promise<PrInfo | null> {
	try {
		const { stdout } = await execAsync("gh pr view --json number,url", { cwd });
		const data = JSON.parse(stdout.trim());
		if (typeof data.number === "number" && typeof data.url === "string") {
			return { number: data.number, url: data.url };
		}
		return null;
	} catch {
		return null;
	}
}

/** Run `gh pr view` and return full PR details, or null if none found. */
async function fetchPrDetail(cwd: string): Promise<PrDetail | null> {
	const fields = [
		"number", "title", "url", "state", "isDraft",
		"author", "baseRefName", "headRefName",
		"additions", "deletions", "changedFiles",
		"labels", "reviewDecision", "statusCheckRollup",
		"latestReviews",
	].join(",");
	try {
		const { stdout } = await execAsync(`gh pr view --json ${fields}`, { cwd });
		return JSON.parse(stdout.trim()) as PrDetail;
	} catch {
		return null;
	}
}

/** Build an OSC 8 terminal hyperlink: clicking opens the URL in the browser. */
function hyperlink(url: string, text: string): string {
	return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

function updateStatus(ctx: ExtensionContext, pr: PrInfo | null): void {
	if (!ctx.hasUI) return;
	if (!pr) {
		ctx.ui.setStatus(STATUS_KEY, undefined);
		return;
	}
	const label = `#${pr.number}`;
	const linked = hyperlink(pr.url, label);
	ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("accent", linked));
}

/** Summarise the CI check rollup into a single symbol + label. */
function formatChecks(
	rollup: PrDetail["statusCheckRollup"],
	theme: ExtensionContext["ui"]["theme"],
): string {
	if (!rollup || rollup.length === 0) return theme.fg("dim", "checks: none");
	const counts = { SUCCESS: 0, FAILURE: 0, PENDING: 0, OTHER: 0 };
	for (const c of rollup) {
		const s = c.state?.toUpperCase();
		if (s === "SUCCESS") counts.SUCCESS++;
		else if (s === "FAILURE" || s === "ERROR") counts.FAILURE++;
		else if (s === "PENDING" || s === "IN_PROGRESS" || s === "QUEUED") counts.PENDING++;
		else counts.OTHER++;
	}
	const parts: string[] = [];
	if (counts.FAILURE > 0) parts.push(theme.fg("error", `✗ ${counts.FAILURE} failing`));
	if (counts.PENDING > 0) parts.push(theme.fg("warning", `◌ ${counts.PENDING} pending`));
	if (counts.SUCCESS > 0) parts.push(theme.fg("success", `✓ ${counts.SUCCESS} passing`));
	if (counts.OTHER > 0) parts.push(theme.fg("dim", `? ${counts.OTHER} other`));
	return parts.join(theme.fg("dim", "  "));
}

/** Format each reviewer as an indented sub-row string. */
function formatReviewerRows(
	decision: string | null,
	reviews: PrDetail["latestReviews"],
	theme: ExtensionContext["ui"]["theme"],
	indent: string,
): string[] {
	const decisionLabel =
		decision === "APPROVED" ? theme.fg("success", "approved") :
		decision === "CHANGES_REQUESTED" ? theme.fg("error", "changes requested") :
		decision === "REVIEW_REQUIRED" ? theme.fg("warning", "review required") :
		theme.fg("dim", "—");

	const rows = [decisionLabel];
	for (const r of reviews) {
		const icon =
			r.state === "APPROVED" ? theme.fg("success", "✓") :
			r.state === "CHANGES_REQUESTED" ? theme.fg("error", "✗") :
			theme.fg("dim", "○");
		rows.push(`${indent}${icon} ${r.author.login}`);
	}
	return rows;
}

export default function statusLine(pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		// Fire-and-forget: don't block session startup waiting for `gh`
		fetchPrInfo(ctx.cwd).then((pr) => updateStatus(ctx, pr));
	});

	// ── /statusline:pr command ────────────────────────────────────────────────

	pi.registerCommand("statusline:pr", {
		description: "Show full PR details for the current branch",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) return;

			const pr = await fetchPrDetail(ctx.cwd);

			if (!pr) {
				ctx.ui.notify("No pull request found for the current branch.", "warning");
				return;
			}

			const theme = ctx.ui.theme;

			// ── State badge ──────────────────────────────────────────────────
			const stateBadge =
				pr.isDraft ? theme.fg("dim", "DRAFT") :
				pr.state === "OPEN" ? theme.fg("success", "OPEN") :
				pr.state === "MERGED" ? theme.fg("accent", "MERGED") :
				theme.fg("error", pr.state);

			// ── Diff stats ───────────────────────────────────────────────────
			const diffStats =
				theme.fg("success", `+${pr.additions}`) +
				theme.fg("dim", " / ") +
				theme.fg("error", `-${pr.deletions}`) +
				theme.fg("dim", `  ${pr.changedFiles} file${pr.changedFiles !== 1 ? "s" : ""}`);

			// ── Layout helpers ───────────────────────────────────────────────
			// Fixed label column so all values start at the same column
			const LABEL_W = 9; // "reviews  " = 9 chars
			const pad = (s: string) => s.padEnd(LABEL_W);
			const indent = " ".repeat(1 + LABEL_W); // leading space + label width
			const field = (label: string, value: string) =>
				` ${theme.fg("dim", pad(label))}${value}`;

			// ── Render ───────────────────────────────────────────────────────
			await ctx.ui.custom<void>((_tui, _theme, kb, done) => {
				const container = new Container();
				container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

				// Title + state
				container.addChild(new Text(
					theme.bold(theme.fg("accent", ` #${pr.number}`)) +
						"  " + theme.bold(pr.title) +
						"  " + stateBadge,
					1, 0,
				));
				// URL
				container.addChild(new Text(
					field("url", theme.fg("dim", hyperlink(pr.url, pr.url))),
					1, 0,
				));

				container.addChild(new Spacer(1));

				// Author
				container.addChild(new Text(field("author", theme.fg("accent", pr.author.login)), 1, 0));
				// Branch
				container.addChild(new Text(
					field("branch", pr.headRefName + theme.fg("dim", " → ") + pr.baseRefName),
					1, 0,
				));

				// Diff
				container.addChild(new Text(field("diff", diffStats), 1, 0));

				// Labels
				if (pr.labels.length > 0) {
					container.addChild(new Text(field("labels", theme.fg("accent", pr.labels[0].name)), 1, 0));
					for (const lbl of pr.labels.slice(1)) {
						container.addChild(new Text(`${indent}${theme.fg("accent", lbl.name)}`, 1, 0));
					}
				}

				// Reviews: decision first, each reviewer as sub-item
				const reviewRows = formatReviewerRows(pr.reviewDecision, pr.latestReviews, theme, indent);
				container.addChild(new Text(field("reviews", reviewRows[0]), 1, 0));
				for (const row of reviewRows.slice(1)) {
					container.addChild(new Text(` ${row}`, 1, 0));
				}

				// Checks (related to reviews: CI status)
				container.addChild(new Text(field("checks", formatChecks(pr.statusCheckRollup, theme)), 1, 0));

				// Action bar
				container.addChild(new Spacer(1));
				container.addChild(new Text(
					` ${keyHint("tui.select.confirm", "close")}` +
						theme.fg("dim", "  ·  ") +
						keyHint("tui.select.cancel", "cancel"),
					1, 0,
				));

				container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

				return {
					render: (w) => container.render(w),
					invalidate: () => container.invalidate(),
					handleInput: (data) => {
						if (kb.matches(data, "tui.select.confirm") || kb.matches(data, "tui.select.cancel")) done();
					},
				};
			});
		},
	});
}
