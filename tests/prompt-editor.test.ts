import assert from "node:assert/strict";
import { describe, it } from "node:test";
import promptEditorExtension, {
  mergeModesFileChanges,
  parseModesFileThinkingLevel,
} from "../extensions/prompt-editor.ts";

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

describe("prompt-editor modes file", () => {
  it("accepts max as a persisted thinking level", () => {
    assert.equal(parseModesFileThinkingLevel("max"), "max");
  });

  it("keeps a renamed mode in its original position", () => {
    const baseline = {
      version: 1 as const,
      currentMode: "default",
      modes: { default: {}, review: {}, fast: {} },
    };
    const edited = {
      ...baseline,
      modes: { default: {}, planning: {}, fast: {} },
    };

    const merged = mergeModesFileChanges(baseline, edited, baseline);

    assert.deepEqual(Object.keys(merged.modes), ["default", "planning", "fast"]);
  });
});

describe("prompt-editor shortcuts", () => {
  it("registers comma/period mode-cycle shortcuts and no ctrl+space shortcut", () => {
    const shortcuts = collectPromptEditorShortcuts();
    const shortcutKeys = shortcuts.map((shortcut) => shortcut.shortcut).sort();

    assert.ok(shortcutKeys.includes("ctrl+shift+,"));
    assert.ok(shortcutKeys.includes("ctrl+shift+."));
    assert.equal(shortcutKeys.includes("ctrl+space"), false);
  });
});
