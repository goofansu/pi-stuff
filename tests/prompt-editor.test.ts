import assert from "node:assert/strict";
import { describe, it } from "node:test";
import promptEditorExtension from "../extensions/prompt-editor.ts";

function collectPromptEditorShortcuts() {
  const shortcuts: Array<{
    shortcut: string;
    description?: string;
    handler: (ctx: unknown) => unknown;
  }> = [];

  promptEditorExtension({
    registerCommand() {},
    registerShortcut(shortcut: string, options: any) {
      shortcuts.push({ shortcut, ...options });
    },
    on() {},
  } as any);

  return shortcuts;
}

function createTheme() {
  return {
    fg(_color: string, text: string) {
      return text;
    },
    bold(text: string) {
      return text;
    },
    getFgAnsi() {
      return "";
    },
    getThinkingBorderColor() {
      return (text: string) => text;
    },
    getBashModeBorderColor() {
      return (text: string) => text;
    },
  };
}

async function renderPromptEditorWithSessionName(options: {
  text: string;
  sessionName?: string;
}) {
  const handlers = new Map<string, Array<(event: any, ctx: any) => unknown>>();
  let editorFactory:
    | ((tui: any, theme: any, keybindings: any) => { render(width: number): string[] })
    | undefined;

  const pi = {
    registerCommand() {},
    registerShortcut() {},
    on(event: string, handler: (event: any, ctx: any) => unknown) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    getThinkingLevel() {
      return "off";
    },
    getSessionName() {
      return options.sessionName;
    },
  };

  promptEditorExtension(pi as any);

  const theme = createTheme();
  const ctx = {
    hasUI: true,
    cwd: process.cwd(),
    ui: {
      theme,
      setEditorComponent(factory: typeof editorFactory) {
        editorFactory = factory;
      },
      getEditorText() {
        return "";
      },
    },
    sessionManager: {
      getSessionFile() {
        return undefined;
      },
      getBranch() {
        return [];
      },
    },
    model: { provider: "test", id: "model", reasoning: false },
    modelRegistry: { find() {} },
  };

  for (const handler of handlers.get("session_start") ?? []) {
    await handler({ type: "session_start", reason: "startup" }, ctx);
  }

  assert.ok(editorFactory, "session_start should install an editor component");
  const editor = editorFactory(
    { terminal: { rows: 30, columns: 80 }, requestRender() {} },
    theme,
    { matches() { return false; } },
  ) as any;
  editor.setText(options.text);

  return editor.render(80)[0]?.replace(/\x1b\[[0-9;]*m/g, "") ?? "";
}

describe("prompt-editor shortcuts", () => {
  it("registers comma/period mode-cycle shortcuts and no ctrl+space shortcut", () => {
    const shortcuts = collectPromptEditorShortcuts();
    const shortcutKeys = shortcuts.map((shortcut) => shortcut.shortcut).sort();

    assert.ok(shortcutKeys.includes("ctrl+shift+,"));
    assert.ok(shortcutKeys.includes("ctrl+shift+."));
    assert.equal(shortcutKeys.includes("ctrl+space"), false);
  });
});

describe("prompt-editor session name label", () => {
  it("renders session name as a right-side segment after bash without moving mode", async () => {
    const topBorder = await renderPromptEditorWithSessionName({
      text: "!echo hi",
      sessionName: "demo session",
    });

    assert.match(topBorder, /── [^─]+ ── bash ── demo session /);
  });
});
