import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateGhInvocation } from "../extensions/github-search.ts";

describe("validateGhInvocation", () => {
  it("allows a structured GitHub search command", () => {
    const result = validateGhInvocation({
      command: "search code",
      args: ["example", "--repo", "owner/repo"],
    });

    assert.deepEqual(result, {
      ok: true,
      argv: ["search", "code", "example", "--repo", "owner/repo"],
    });
  });

  it("allows read-only gh commands under search, api, and repo", () => {
    const allowedCommands = ["repo list", "repo view"];

    for (const command of allowedCommands) {
      const result = validateGhInvocation({ command, args: ["--json", "url"] });

      assert.deepEqual(
        result,
        { ok: true, argv: [...command.split(" "), "--json", "url"] },
        command,
      );
    }
  });

  it("rejects gh commands that are mutating or unavailable", () => {
    for (const command of [
      "repo create",
      "issue list",
      "issue view",
      "issue status",
      "pr list",
      "pr view",
      "pr status",
      "pr checks",
      "pr diff",
      "pr merge",
      "release list",
      "release view",
      "gist list",
      "gist view",
      "run list",
      "workflow view",
      "search topics",
      "search users",
    ]) {
      const result = validateGhInvocation({
        command,
        args: ["owner/repo"],
      });

      assert.equal(result.ok, false, command);
      assert.match(result.reason, /not an allowed read-only gh command/, command);
    }
  });

  it("rejects api calls that request a mutating method", () => {
    const result = validateGhInvocation({
      command: "api",
      args: ["repos/owner/repo/issues", "--method", "POST"],
    });

    assert.equal(result.ok, false);
    assert.match(result.reason, /gh api only allows GET or HEAD/);
  });
});
