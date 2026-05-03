import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const extensionsDir = join(process.cwd(), "extensions");
const extensionFiles = readdirSync(extensionsDir)
  .filter((name) => name.endsWith(".ts"))
  .map((name) => join(extensionsDir, name));

test("extensions do not bind q as a quit/cancel/close shortcut", () => {
  const offenders: string[] = [];

  for (const file of extensionFiles) {
    const source = readFileSync(file, "utf8");
    const hasQInputBinding = /\.toLowerCase\(\)\s*===\s*["']q["']/.test(source);
    const hasQCloseHint = /\bq\b[^\n"'`]*(?:close|cancel|quit)|(?:close|cancel|quit)[^\n"'`]*\bq\b/i.test(
      source,
    );

    if (hasQInputBinding || hasQCloseHint) {
      offenders.push(file.replace(`${process.cwd()}/`, ""));
    }
  }

  assert.deepEqual(offenders, []);
});
