import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));

test("prepare script delegates to the guarded Husky installer", () => {
  assert.equal(packageJson.scripts.prepare, "node .husky/install.mjs");
});

test("Husky installer skips production and CI installs before importing Husky", async () => {
  const installer = await readFile(".husky/install.mjs", "utf8");

  assert.match(installer, /NODE_ENV === ["']production["']/);
  assert.match(installer, /CI === ["']true["']/);
  assert.ok(installer.indexOf("process.exit(0)") < installer.indexOf("import(\"husky\")"));
});
