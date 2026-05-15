/**
 * Save Extension
 *
 * /save <name>  - Saves the last assistant message to .pi/saves/<name>.md
 * /saves        - Browse, open, edit, or gist saved files
 */

import { spawnSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import fs from "node:fs/promises";
import { join } from "node:path";
import type { TextContent, UserMessage } from "@earendil-works/pi-ai";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { DynamicBorder, keyHint } from "@earendil-works/pi-coding-agent";
import {
  Container,
  fuzzyFilter,
  Input,
  type SelectItem,
  SelectList,
  Spacer,
  Text,
} from "@earendil-works/pi-tui";

// --- Types ---

type SaveFile = {
  filename: string;
  filepath: string;
  mtime: Date;
};

// --- Shared helpers ---

function extractText(content: UserMessage["content"] | string): string | null {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = content
      .filter(
        (block): block is TextContent =>
          block.type === "text" && typeof block.text === "string",
      )
      .map((block) => block.text);
    return parts.length > 0 ? parts.join("\n") : null;
  }
  return null;
}

function getLastExchange(ctx: ExtensionContext): {
  assistantText: string;
  userText: string | null;
} | null {
  const entries = ctx.sessionManager.getBranch();

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type !== "message" || entry.message?.role !== "assistant") {
      continue;
    }

    const assistantText = extractText(entry.message.content);
    if (!assistantText) continue;

    let userText: string | null = null;
    for (let j = i - 1; j >= 0; j--) {
      const prev = entries[j];
      if (prev.type === "message" && prev.message?.role === "user") {
        userText = extractText(prev.message.content);
        break;
      }
    }

    return { assistantText, userText };
  }

  return null;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match?.[1]) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    result[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
  }
  return result;
}

function insertFrontmatterKey(
  content: string,
  key: string,
  value: string,
): string {
  const lines = content.split("\n");
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      lines.splice(i, 0, `${key}: ${value}`);
      break;
    }
  }
  return lines.join("\n");
}

async function listSaveFiles(savesDir: string): Promise<SaveFile[]> {
  let filenames: string[];
  try {
    filenames = await fs.readdir(savesDir);
  } catch {
    return [];
  }
  const saves: SaveFile[] = [];
  for (const filename of filenames) {
    if (!filename.endsWith(".md")) continue;
    const filepath = join(savesDir, filename);
    saves.push({ filename, filepath, mtime: statSync(filepath).mtime });
  }
  return saves.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

// --- /saves actions ---

async function openSaveFile(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  filepath: string,
): Promise<void> {
  const command = process.platform === "darwin" ? "open" : "xdg-open";
  const result = await pi.exec(command, [filepath]);
  if (result.code !== 0) {
    ctx.ui.notify(result.stderr?.trim() || "Failed to open file", "error");
  }
}

async function editSaveFile(
  ctx: ExtensionContext,
  filepath: string,
): Promise<void> {
  const editorCmd = process.env.VISUAL || process.env.EDITOR;
  if (!editorCmd) {
    ctx.ui.notify("No editor configured. Set $VISUAL or $EDITOR.", "warning");
    return;
  }

  await ctx.ui.custom<void>((tui, theme, _kb, done) => {
    const status = new Text(theme.fg("dim", `Opening ${editorCmd}...`));
    queueMicrotask(() => {
      tui.stop();
      spawnSync(editorCmd, [filepath], { stdio: "inherit", shell: true });
      tui.start();
      tui.requestRender(true);
      done();
    });
    return status;
  });
}

async function gistSaveFile(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  filepath: string,
): Promise<void> {
  let content: string;
  try {
    content = readFileSync(filepath, "utf-8");
  } catch {
    ctx.ui.notify("Failed to read file", "error");
    return;
  }

  const frontmatter = parseFrontmatter(content);
  const gistId = frontmatter.gist_id;

  if (gistId) {
    const result = await pi.exec("gh", ["gist", "edit", gistId, filepath]);
    ctx.ui.notify(
      result.code === 0
        ? "Gist updated"
        : result.stderr?.trim() || "Gist edit failed",
      result.code === 0 ? "success" : "error",
    );
  } else {
    const result = await pi.exec("gh", ["gist", "create", filepath]);
    if (result.code !== 0) {
      ctx.ui.notify(result.stderr?.trim() || "Failed to create gist", "error");
      return;
    }
    const url = result.stdout.trim();
    const newGistId = url.split("/").pop();
    if (!newGistId) {
      ctx.ui.notify(`Created gist but couldn't parse ID: ${url}`, "warning");
      return;
    }
    writeFileSync(
      filepath,
      insertFrontmatterKey(content, "gist_id", newGistId),
      "utf-8",
    );
    ctx.ui.notify(`Gist created: ${url}`, "success");
  }
}

// --- /saves UI ---

async function showSavesSelector(
  ctx: ExtensionContext,
  saves: SaveFile[],
): Promise<SaveFile | null> {
  const items: SelectItem[] = saves.map((s) => ({
    value: s.filepath,
    label: s.filename,
  }));

  const selected = await ctx.ui.custom<string | null>(
    (tui, theme, keybindings, done) => {
      const container = new Container();
      container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
      container.addChild(new Spacer(1));
      container.addChild(
        new Text(theme.fg("accent", theme.bold("Saves")), 1, 0),
      );

      const searchInput = new Input();
      container.addChild(searchInput);
      container.addChild(new Spacer(1));

      const listContainer = new Container();
      container.addChild(listContainer);
      container.addChild(new Spacer(1));
      container.addChild(
        new Text(
          theme.fg("dim", "Type to filter • ") +
            keyHint("tui.select.confirm", "actions") +
            theme.fg("dim", " • ") +
            keyHint("tui.select.cancel", "close"),
          1,
          0,
        ),
      );
      container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

      let filteredItems = items;
      let selectList: SelectList | null = null;

      const updateList = () => {
        listContainer.clear();
        if (filteredItems.length === 0) {
          listContainer.addChild(
            new Text(theme.fg("warning", "  No matching saves"), 0, 0),
          );
          selectList = null;
          return;
        }
        selectList = new SelectList(
          filteredItems,
          Math.min(filteredItems.length, 12),
          {
            selectedPrefix: (text) => theme.fg("accent", text),
            selectedText: (text) => theme.fg("accent", text),
            scrollInfo: (text) => theme.fg("dim", text),
            noMatch: (text) => theme.fg("warning", text),
          },
        );
        selectList.onSelect = (item) => done(item.value as string);
        selectList.onCancel = () => done(null);
        listContainer.addChild(selectList);
      };

      const applyFilter = () => {
        const query = searchInput.getValue();
        filteredItems = query
          ? fuzzyFilter(items, query, (item) => item.label)
          : items;
        updateList();
      };

      applyFilter();

      return {
        render(width: number) {
          return container.render(width);
        },
        invalidate() {
          container.invalidate();
        },
        handleInput(data: string) {
          if (
            keybindings.matches(data, "tui.select.up") ||
            keybindings.matches(data, "tui.select.down") ||
            keybindings.matches(data, "tui.select.confirm") ||
            keybindings.matches(data, "tui.select.cancel")
          ) {
            if (selectList) {
              selectList.handleInput(data);
            } else if (keybindings.matches(data, "tui.select.cancel")) {
              done(null);
            }
            tui.requestRender();
            return;
          }
          searchInput.handleInput(data);
          applyFilter();
          tui.requestRender();
        },
      };
    },
  );

  return selected ? (saves.find((s) => s.filepath === selected) ?? null) : null;
}

async function showActionMenu(
  ctx: ExtensionContext,
  save: SaveFile,
): Promise<"open" | "edit" | "gist" | null> {
  const actions: SelectItem[] = [
    { value: "open", label: "Open" },
    { value: "edit", label: "Edit" },
    { value: "gist", label: "Gist it" },
  ];

  return ctx.ui.custom<"open" | "edit" | "gist" | null>(
    (tui, theme, _kb, done) => {
      const container = new Container();
      container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
      container.addChild(
        new Text(
          theme.fg("accent", theme.bold(`Actions for ${save.filename}`)),
        ),
      );
      const selectList = new SelectList(actions, actions.length, {
        selectedPrefix: (text) => theme.fg("accent", text),
        selectedText: (text) => theme.fg("accent", text),
        scrollInfo: (text) => theme.fg("dim", text),
        noMatch: (text) => theme.fg("warning", text),
      });
      selectList.onSelect = (item) =>
        done(item.value as "open" | "edit" | "gist");
      selectList.onCancel = () => done(null);
      container.addChild(selectList);
      container.addChild(
        new Text(
          keyHint("tui.select.confirm", "confirm") +
            theme.fg("dim", " • ") +
            keyHint("tui.select.cancel", "back"),
        ),
      );
      container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));

      return {
        render(width: number) {
          return container.render(width);
        },
        invalidate() {
          container.invalidate();
        },
        handleInput(data: string) {
          selectList.handleInput(data);
          tui.requestRender();
        },
      };
    },
  );
}

// --- Commands ---

export default function (pi: ExtensionAPI) {
  pi.registerCommand("save", {
    description: "Save the last assistant message to .pi/saves",
    handler: async (args, ctx) => {
      let name = args?.trim();
      if (!name) {
        name = await ctx.ui.input("What's the filename?", "e.g. my-notes");
        if (!name?.trim()) return;
        name = name.trim();
      }

      const exchange = getLastExchange(ctx);
      if (!exchange) {
        ctx.ui.notify("No assistant message found to save", "error");
        return;
      }

      const { assistantText, userText } = exchange;

      const frontmatter = [
        "---",
        `date: ${new Date().toISOString()}`,
        `model: ${ctx.model?.id ?? "unknown"}`,
        "---",
      ].join("\n");

      const sections: string[] = [frontmatter];
      if (userText) {
        sections.push(`**User**\n\n${userText}`);
      }
      sections.push(`---\n**Assistant**\n\n${assistantText}`);

      const slug = name
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");
      if (!slug) {
        ctx.ui.notify(
          "Invalid filename — use alphanumeric characters",
          "error",
        );
        return;
      }
      const filename = `${slug}.md`;
      const savesDir = join(ctx.cwd, ".pi", "saves");
      await fs.mkdir(savesDir, { recursive: true });
      const outputPath = join(savesDir, filename);

      let existed = false;
      try {
        await fs.access(outputPath);
        existed = true;
        const ok = await ctx.ui.confirm(
          "Overwrite?",
          `${filename} already exists`,
        );
        if (!ok) return;
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }

      await fs.writeFile(outputPath, sections.join("\n\n"), "utf-8");
      ctx.ui.notify(
        existed
          ? `Overwritten .pi/saves/${filename}`
          : `Saved to .pi/saves/${filename}`,
        "success",
      );
    },
  });

  pi.registerCommand("saves", {
    description: "List saves from .pi/saves",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("Saves requires interactive mode", "error");
        return;
      }

      const savesDir = join(ctx.cwd, ".pi", "saves");
      const saves = await listSaveFiles(savesDir);

      if (saves.length === 0) {
        ctx.ui.notify("No saves found in .pi/saves/", "info");
        return;
      }

      while (true) {
        const selected = await showSavesSelector(ctx, saves);
        if (!selected) return;

        const action = await showActionMenu(ctx, selected);
        if (!action) continue;

        switch (action) {
          case "open":
            await openSaveFile(pi, ctx, selected.filepath);
            break;
          case "edit":
            await editSaveFile(ctx, selected.filepath);
            break;
          case "gist":
            await gistSaveFile(pi, ctx, selected.filepath);
            break;
        }
      }
    },
  });
}
