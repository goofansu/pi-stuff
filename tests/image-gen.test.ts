import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../extensions/image-gen.ts", import.meta.url), "utf8");

test("image-gen extension uses dedicated OpenRouter API key env var", () => {
  assert.match(source, /IMAGE_GEN_OPENROUTER_API_KEY/);
  assert.doesNotMatch(source, /process\.env\.OPENROUTER_API_KEY/);
});
