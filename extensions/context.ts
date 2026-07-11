/**
 * /context
 *
 * Small TUI view showing what's loaded/available:
 * - extensions (best-effort from registered extension slash commands)
 * - skills
 * - project context files (AGENTS.md / CLAUDE.md)
 * - current context window usage + session totals (tokens/cost)
 */

import path from "node:path";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import { DynamicBorder, keyHint } from "@earendil-works/pi-coding-agent";
import {
  type Component,
  Container,
  type KeybindingsManager,
  Text,
} from "@earendil-works/pi-tui";

function formatUsd(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return "$0.00";
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(4)}`;
}

function estimateTokens(text: string): number {
  // Deliberately fuzzy (good enough for “how big-ish is this”).
  return Math.max(0, Math.ceil(text.length / 4));
}

function normalizeSkillName(name: string): string {
  return name.startsWith("skill:") ? name.slice("skill:".length) : name;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object"
    ? (value as UnknownRecord)
    : undefined;
}

function extractCostTotal(usage: unknown): number {
  const usageRecord = asRecord(usage);
  if (!usageRecord) return 0;
  const c = usageRecord.cost;
  if (typeof c === "number") return Number.isFinite(c) ? c : 0;
  if (typeof c === "string") {
    const n = Number(c);
    return Number.isFinite(n) ? n : 0;
  }
  const t = asRecord(c)?.total;
  if (typeof t === "number") return Number.isFinite(t) ? t : 0;
  if (typeof t === "string") {
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function sumSessionUsage(ctx: ExtensionCommandContext): {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
} {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let totalCost = 0;

  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type !== "message") continue;
    const msg = entry.message;
    if (msg.role !== "assistant") continue;
    const usage = asRecord(msg.usage);
    if (!usage) continue;
    input += Number(usage.input ?? 0) || 0;
    output += Number(usage.output ?? 0) || 0;
    cacheRead += Number(usage.cacheRead ?? 0) || 0;
    cacheWrite += Number(usage.cacheWrite ?? 0) || 0;
    totalCost += extractCostTotal(usage);
  }

  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    totalTokens: input + output + cacheRead + cacheWrite,
    totalCost,
  };
}

function shortenPath(p: string, cwd: string): string {
  const rp = path.resolve(p);
  const rc = path.resolve(cwd);
  if (rp === rc) return ".";
  if (rp.startsWith(rc + path.sep)) return `./${rp.slice(rc.length + 1)}`;
  return rp;
}

function renderUsageBar(
  theme: Theme,
  parts: { system: number; tools: number; convo: number; remaining: number },
  total: number,
  width: number,
): string {
  const w = Math.max(10, width);
  if (total <= 0) return "";

  const toCols = (n: number) => Math.round((n / total) * w);
  const sys = toCols(parts.system);
  const tools = toCols(parts.tools);
  const con = toCols(parts.convo);
  let rem = w - sys - tools - con;
  if (rem < 0) rem = 0;
  // adjust rounding drift
  while (sys + tools + con + rem < w) rem++;
  while (sys + tools + con + rem > w && rem > 0) rem--;

  const block = "█";
  const sysStr = theme.fg("accent", block.repeat(sys));
  const toolsStr = theme.fg("warning", block.repeat(tools));
  const conStr = theme.fg("success", block.repeat(con));
  const remStr = theme.fg("dim", block.repeat(rem));
  return `${sysStr}${toolsStr}${conStr}${remStr}`;
}

function joinComma(items: string[]): string {
  return items.join(", ");
}

function joinCommaStyled(
  items: string[],
  renderItem: (item: string) => string,
  sep: string,
): string {
  return items.map(renderItem).join(sep);
}

type ContextViewData = {
  usage: {
    // message-based context usage estimate from ctx.getContextUsage()
    messageTokens: number;
    contextWindow: number;
    // effective usage incl. a rough tool-definition estimate
    effectiveTokens: number;
    percent: number;
    remainingTokens: number;
    systemPromptTokens: number;
    agentTokens: number;
    toolsTokens: number;
    activeTools: number;
  } | null;
  agentFiles: string[];
  extensions: string[];
  skills: string[];
  loadedSkills: string[];
  session: { totalTokens: number; totalCost: number };
};

class ContextView implements Component {
  private theme: Theme;
  private onDone: () => void;
  private data: ContextViewData;
  private keybindings: KeybindingsManager;
  private container: Container;
  private body: Text;
  private cachedWidth?: number;

  constructor(
    theme: Theme,
    data: ContextViewData,
    keybindings: KeybindingsManager,
    onDone: () => void,
  ) {
    this.theme = theme;
    this.data = data;
    this.keybindings = keybindings;
    this.onDone = onDone;

    this.container = new Container();
    this.container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
    this.container.addChild(
      new Text(
        theme.fg("accent", theme.bold("Context")) +
          theme.fg("dim", "  (") +
          keyHint("tui.select.cancel", "close") +
          theme.fg("dim", " / ") +
          keyHint("tui.select.confirm", "close") +
          theme.fg("dim", ")"),
        1,
        0,
      ),
    );
    this.container.addChild(new Text("", 1, 0));

    this.body = new Text("", 1, 0);
    this.container.addChild(this.body);

    this.container.addChild(new Text("", 1, 0));
    this.container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
  }

  private rebuild(width: number): void {
    const muted = (s: string) => this.theme.fg("muted", s);
    const dim = (s: string) => this.theme.fg("dim", s);
    const text = (s: string) => this.theme.fg("text", s);

    const lines: string[] = [];

    // Window + bar
    if (!this.data.usage) {
      lines.push(muted("Window: ") + dim("(unknown)"));
    } else {
      const u = this.data.usage;
      lines.push(
        muted("Window: ") +
          text(
            `~${u.effectiveTokens.toLocaleString()} / ${u.contextWindow.toLocaleString()}`,
          ) +
          muted(
            `  (${u.percent.toFixed(1)}% used, ~${u.remainingTokens.toLocaleString()} left)`,
          ),
      );

      // bar width tries to fit within the viewport
      const barWidth = Math.max(10, Math.min(36, width - 10));

      // Prorate system prompt into current message context estimate, then add tools estimate.
      const sysInMessages = Math.min(u.systemPromptTokens, u.messageTokens);
      const convoInMessages = Math.max(0, u.messageTokens - sysInMessages);
      const bar =
        renderUsageBar(
          this.theme,
          {
            system: sysInMessages,
            tools: u.toolsTokens,
            convo: convoInMessages,
            remaining: u.remainingTokens,
          },
          u.contextWindow,
          barWidth,
        ) +
        " " +
        dim("sys") +
        this.theme.fg("accent", "█") +
        " " +
        dim("tools") +
        this.theme.fg("warning", "█") +
        " " +
        dim("convo") +
        this.theme.fg("success", "█") +
        " " +
        dim("free") +
        this.theme.fg("dim", "█");
      lines.push(bar);
    }

    lines.push("");

    // System prompt + tools totals (approx)
    if (this.data.usage) {
      const u = this.data.usage;
      lines.push(
        muted("System: ") +
          text(`~${u.systemPromptTokens.toLocaleString()} tok`) +
          muted(` (AGENTS ~${u.agentTokens.toLocaleString()})`),
      );
      lines.push(
        muted("Tools: ") +
          text(`~${u.toolsTokens.toLocaleString()} tok`) +
          muted(` (${u.activeTools} active)`),
      );
    }

    lines.push(
      muted(`AGENTS (${this.data.agentFiles.length}): `) +
        text(
          this.data.agentFiles.length
            ? joinComma(this.data.agentFiles)
            : "(none)",
        ),
    );
    lines.push("");
    lines.push(
      muted(`Extensions (${this.data.extensions.length}): `) +
        text(
          this.data.extensions.length
            ? joinComma(this.data.extensions)
            : "(none)",
        ),
    );

    const loaded = new Set(this.data.loadedSkills);
    const skillsRendered = this.data.skills.length
      ? joinCommaStyled(
          this.data.skills,
          (name) =>
            loaded.has(name)
              ? this.theme.fg("success", name)
              : this.theme.fg("muted", name),
          this.theme.fg("muted", ", "),
        )
      : "(none)";
    lines.push(muted(`Skills (${this.data.skills.length}): `) + skillsRendered);
    lines.push("");
    lines.push(
      muted("Session: ") +
        text(`${this.data.session.totalTokens.toLocaleString()} tokens`) +
        muted(" · ") +
        text(formatUsd(this.data.session.totalCost)),
    );

    this.body.setText(lines.join("\n"));
    this.cachedWidth = width;
  }

  handleInput(data: string): void {
    if (
      this.keybindings.matches(data, "tui.select.cancel") ||
      this.keybindings.matches(data, "tui.select.confirm")
    ) {
      this.onDone();
      return;
    }
  }

  invalidate(): void {
    this.container.invalidate();
    this.cachedWidth = undefined;
  }

  render(width: number): string[] {
    if (this.cachedWidth !== width) this.rebuild(width);
    return this.container.render(width);
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("context", {
    description: "Show loaded context overview",
    handler: async (_args, ctx: ExtensionCommandContext) => {
      const commands = pi.getCommands();
      const extensionCmds = commands.filter((c) => c.source === "extension");
      const skillCmds = commands.filter((c) => c.source === "skill");

      const extensionsByPath = new Map<string, string[]>();
      for (const c of extensionCmds) {
        const p = c.sourceInfo?.path ?? "<unknown>";
        const arr = extensionsByPath.get(p) ?? [];
        arr.push(c.name);
        extensionsByPath.set(p, arr);
      }
      const extensionFiles = [...extensionsByPath.keys()]
        .map((p) => (p === "<unknown>" ? p : path.basename(p)))
        .sort((a, b) => a.localeCompare(b));

      const promptOptions = ctx.getSystemPromptOptions();
      const loadedSkills = (promptOptions.skills ?? [])
        .map((s) => s.name)
        .sort((a, b) => a.localeCompare(b));
      const skills = Array.from(
        new Set([
          ...skillCmds.map((c) => normalizeSkillName(c.name)),
          ...loadedSkills,
        ]),
      ).sort((a, b) => a.localeCompare(b));

      const agentFiles = (promptOptions.contextFiles ?? []).map((f) => ({
        path: f.path,
        tokens: estimateTokens(f.content),
      }));
      const agentFilePaths = agentFiles.map((f) =>
        shortenPath(f.path, ctx.cwd),
      );
      const agentTokens = agentFiles.reduce((a, f) => a + f.tokens, 0);

      const systemPrompt = ctx.getSystemPrompt();
      const systemPromptTokens = systemPrompt
        ? estimateTokens(systemPrompt)
        : 0;

      const usage = ctx.getContextUsage();
      const knownUsage = usage && usage.tokens !== null ? usage : undefined;
      const messageTokens = knownUsage?.tokens ?? 0;
      const ctxWindow = knownUsage?.contextWindow ?? 0;

      // Tool definitions are not part of ctx.getContextUsage() (it estimates message tokens).
      // We approximate their token impact from tool name + description, and apply a fudge
      // factor to account for parameters/schema/formatting.
      const TOOL_FUDGE = 1.5;
      const activeToolNames = pi.getActiveTools();
      const toolInfoByName = new Map(
        pi.getAllTools().map((t) => [t.name, t] as const),
      );
      let toolsTokens = 0;
      for (const name of activeToolNames) {
        const info = toolInfoByName.get(name);
        const blob = `${name}\n${info?.description ?? ""}`;
        toolsTokens += estimateTokens(blob);
      }
      toolsTokens = Math.round(toolsTokens * TOOL_FUDGE);

      const effectiveTokens = messageTokens + toolsTokens;
      const percent = ctxWindow > 0 ? (effectiveTokens / ctxWindow) * 100 : 0;
      const remainingTokens =
        ctxWindow > 0 ? Math.max(0, ctxWindow - effectiveTokens) : 0;

      const sessionUsage = sumSessionUsage(ctx);

      const makePlainText = () => {
        const lines: string[] = [];
        lines.push("Context");
        if (knownUsage) {
          lines.push(
            `Window: ~${effectiveTokens.toLocaleString()} / ${ctxWindow.toLocaleString()} (${percent.toFixed(1)}% used, ~${remainingTokens.toLocaleString()} left)`,
          );
        } else {
          lines.push("Window: (unknown)");
        }
        lines.push(
          `System: ~${systemPromptTokens.toLocaleString()} tok (AGENTS ~${agentTokens.toLocaleString()})`,
        );
        lines.push(
          `Tools: ~${toolsTokens.toLocaleString()} tok (${activeToolNames.length} active)`,
        );
        lines.push(
          `AGENTS: ${agentFilePaths.length ? joinComma(agentFilePaths) : "(none)"}`,
        );
        lines.push(
          `Extensions (${extensionFiles.length}): ${extensionFiles.length ? joinComma(extensionFiles) : "(none)"}`,
        );
        lines.push(
          `Skills (${skills.length}): ${skills.length ? joinComma(skills) : "(none)"}`,
        );
        lines.push(
          `Session: ${sessionUsage.totalTokens.toLocaleString()} tokens · ${formatUsd(sessionUsage.totalCost)}`,
        );
        return lines.join("\n");
      };

      if (ctx.mode !== "tui") {
        pi.sendMessage(
          { customType: "context", content: makePlainText(), display: true },
          { triggerTurn: false },
        );
        return;
      }

      const viewData: ContextViewData = {
        usage: knownUsage
          ? {
              messageTokens,
              contextWindow: ctxWindow,
              effectiveTokens,
              percent,
              remainingTokens,
              systemPromptTokens,
              agentTokens,
              toolsTokens,
              activeTools: activeToolNames.length,
            }
          : null,
        agentFiles: agentFilePaths,
        extensions: extensionFiles,
        skills,
        loadedSkills,
        session: {
          totalTokens: sessionUsage.totalTokens,
          totalCost: sessionUsage.totalCost,
        },
      };

      await ctx.ui.custom<void>((_tui, theme, keybindings, done) => {
        return new ContextView(theme, viewData, keybindings, done);
      });
    },
  });
}
