import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../extensions/image-gen.ts", import.meta.url), "utf8");

test("image-gen extension uses built-in OpenRouter image auth", () => {
  assert.doesNotMatch(source, /@earendil-works\/pi-ai\/compat/);
  assert.doesNotMatch(source, /IMAGE_GEN_OPENROUTER_API_KEY/);
  assert.match(source, /OPENROUTER_API_KEY/);
  assert.doesNotMatch(source, /process\.env\.OPENROUTER_API_KEY/);
  assert.doesNotMatch(source, /from "@earendil-works\/pi-ai\/providers\/all"/);
  assert.match(source, /findPiAiProvidersAllPath\(import\.meta\.url\)/);
  assert.match(source, /builtinImagesModels/);
  assert.match(source, /imagesModels\.getAuth/);
  assert.match(
    source,
    /image-gen: OPENROUTER_API_KEY is not set — generate_image tool will fail\./,
  );
  assert.match(source, /imagesModels\.generateImages/);
});
