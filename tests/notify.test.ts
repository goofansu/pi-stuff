import test from "node:test";
import assert from "node:assert/strict";

import { wrapForTmux } from "../extensions/notify.ts";

test("wrapForTmux leaves escape sequences unchanged outside tmux", () => {
  const previousTmux = process.env.TMUX;
  delete process.env.TMUX;
  try {
    const sequence = "\x1b]777;notify;π;Done\x07";

    assert.equal(wrapForTmux(sequence), sequence);
  } finally {
    if (previousTmux === undefined) {
      delete process.env.TMUX;
    } else {
      process.env.TMUX = previousTmux;
    }
  }
});

test("wrapForTmux uses tmux passthrough and doubles inner ESC bytes", () => {
  const previousTmux = process.env.TMUX;
  process.env.TMUX = "/tmp/tmux-501/default,123,0";
  try {
    const sequence = "\x1b]777;notify;π;Done\x07";

    assert.equal(
      wrapForTmux(sequence),
      "\x1bPtmux;\x1b\x1b]777;notify;π;Done\x07\x1b\\",
    );
  } finally {
    if (previousTmux === undefined) {
      delete process.env.TMUX;
    } else {
      process.env.TMUX = previousTmux;
    }
  }
});
