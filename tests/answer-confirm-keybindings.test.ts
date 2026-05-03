import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const answerSource = () =>
  readFileSync(join(process.cwd(), "extensions", "answer.ts"), "utf8");

test("answer confirmation only uses configured submit and cancel keybindings", () => {
  const source = answerSource();

  assert.doesNotMatch(source, /data\.toLowerCase\(\)\s*===\s*["']y["']/);
  assert.doesNotMatch(source, /data\.toLowerCase\(\)\s*===\s*["']n["']/);
  assert.doesNotMatch(source, /\/y\b|\/n\b/);
});
