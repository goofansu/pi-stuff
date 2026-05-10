import test from "node:test";
import assert from "node:assert/strict";

import { initTheme } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import { BtwOverlay } from "../extensions/btw.ts";

const theme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
};

const tui = {
  terminal: { rows: 40 },
  requestRender() {},
};

const keybindings = {
  matches: () => false,
};

test("BTW overlay renders to the width allocated by the overlay manager", () => {
  initTheme(theme as any, true);
  const overlay = new BtwOverlay(
    tui as any,
    theme as any,
    keybindings as any,
    () => ["hello"],
    () => "Ready",
    () => {},
    () => {},
  );

  const lines = overlay.render(100);

  assert.ok(lines.length > 0);
  assert.equal(visibleWidth(lines[0]), 100);
  assert.equal(visibleWidth(lines.at(-1) ?? ""), 100);
});
