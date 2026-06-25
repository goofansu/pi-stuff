import assert from "node:assert/strict";
import { describe, it } from "node:test";
import githubSearchExtension, { validateGhInvocation } from "../extensions/github-explore.ts";

function registerGithubSearchTool() {
  let tool: any;
  githubSearchExtension({
    registerTool(registeredTool: any) {
      tool = registeredTool;
    },
  } as any);
  assert.ok(tool, "github-explore tool should be registered");
  return tool;
}

const theme = {
  fg(_name: string, text: string) {
    return text;
  },
  bold(text: string) {
    return text;
  },
};

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

  it("allows repo read-file and repo read-dir commands", () => {
    assert.deepEqual(
      validateGhInvocation({
        command: "repo read-file",
        args: ["README.md", "--repo", "owner/repo", "--ref", "main"],
      }),
      {
        ok: true,
        argv: [
          "repo",
          "read-file",
          "README.md",
          "--repo",
          "owner/repo",
          "--ref",
          "main",
        ],
      },
    );

    assert.deepEqual(
      validateGhInvocation({
        command: "repo read-dir",
        args: ["docs", "--repo", "owner/repo", "--json", "name,path,type"],
      }),
      {
        ok: true,
        argv: [
          "repo",
          "read-dir",
          "docs",
          "--repo",
          "owner/repo",
          "--json",
          "name,path,type",
        ],
      },
    );
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

  it("rejects api calls when any repeated method flag is mutating", () => {
    const result = validateGhInvocation({
      command: "api",
      args: ["repos/owner/repo", "--method", "GET", "--method", "POST"],
    });

    assert.equal(result.ok, false);
    assert.match(result.reason, /gh api only allows GET or HEAD/);
  });

  it("rejects compact api body flags that can mutate data", () => {
    for (const args of [
      ["repos/owner/repo/issues", "-fbody=Hi"],
      ["repos/owner/repo/issues", "-Fbody=Hi"],
    ]) {
      const result = validateGhInvocation({ command: "api", args });

      assert.equal(result.ok, false, args.join(" "));
      assert.match(result.reason, /request body fields can mutate data/);
    }
  });

  it("rejects api graphql even when valued flags precede the endpoint", () => {
    const result = validateGhInvocation({
      command: "api",
      args: ["--method", "GET", "graphql"],
    });

    assert.equal(result.ok, false);
    assert.match(result.reason, /gh api graphql is blocked/);
  });

  it("rejects flags that open a browser", () => {
    for (const args of [
      ["owner/repo", "--web"],
      ["owner/repo", "--web=true"],
      ["owner/repo", "-w"],
    ]) {
      const result = validateGhInvocation({ command: "repo view", args });

      assert.equal(result.ok, false, args.join(" "));
      assert.match(result.reason, /blocked because it has side effects/);
    }
  });

  it("rejects flags that write local files or caches", () => {
    for (const args of [
      ["README.md", "--repo", "owner/repo", "--output", "README.md"],
      ["README.md", "--repo", "owner/repo", "--output=README.md"],
      ["README.md", "--repo", "owner/repo", "-o", "README.md"],
      ["README.md", "--repo", "owner/repo", "-oREADME.md"],
      ["README.md", "--repo", "owner/repo", "--clobber"],
    ]) {
      const result = validateGhInvocation({
        command: "repo read-file",
        args,
      });

      assert.equal(result.ok, false, args.join(" "));
      assert.match(result.reason, /blocked because it writes local files/);
    }

    for (const args of [
      ["README.md", "--repo", "owner/repo", "--allow-escape-sequences"],
      ["README.md", "--repo", "owner/repo", "--allow-escape-sequences=true"],
    ]) {
      const terminalEscapeResult = validateGhInvocation({
        command: "repo read-file",
        args,
      });

      assert.equal(terminalEscapeResult.ok, false, args.join(" "));
      assert.match(terminalEscapeResult.reason, /terminal escape/);
    }

    for (const args of [
      ["repos/owner/repo", "--cache", "1h"],
      ["repos/owner/repo", "--cache=1h"],
    ]) {
      const result = validateGhInvocation({ command: "api", args });

      assert.equal(result.ok, false, args.join(" "));
      assert.match(result.reason, /blocked because it writes a local cache/);
    }
  });
});

describe("github-explore renderResult", () => {
  it("renders a collapsed status with command summary and expand hint", () => {
    const tool = registerGithubSearchTool();

    const rendered = tool.renderResult(
      {
        isError: false,
        content: [{ type: "text", text: "first line\nsecond line\nthird line" }],
        details: {
          command: "gh search code example --repo owner/repo",
          code: 0,
          stdout: "first line\nsecond line\nthird line",
          stderr: "",
        },
      },
      { expanded: false, isPartial: false },
      theme,
      { isError: false },
    );

    assert.match(rendered.text, /✓ github_explore/);
    assert.match(rendered.text, /gh search code example --repo owner\/repo/);
    assert.doesNotMatch(rendered.text, /Done/);
    assert.doesNotMatch(rendered.text, /first line/);
    assert.doesNotMatch(rendered.text, /second line/);
    assert.doesNotMatch(rendered.text, /third line/);
    assert.match(rendered.text, /to expand/);
    assert.doesNotMatch(rendered.text, /Exit code:/);
  });

  it("renders expanded command, exit code, and full formatted output", () => {
    const tool = registerGithubSearchTool();

    const rendered = tool.renderResult(
      {
        isError: true,
        content: [{ type: "text", text: "stdout line\n\nstderr:\nstderr line" }],
        details: {
          command: "gh api repos/owner/repo",
          code: 1,
          stdout: "stdout line",
          stderr: "stderr line",
        },
      },
      { expanded: true, isPartial: false },
      theme,
      { isError: true },
    );

    assert.match(rendered.text, /✗ github_explore/);
    assert.doesNotMatch(rendered.text, /Failed/);
    assert.match(rendered.text, /Command: gh api repos\/owner\/repo/);
    assert.match(rendered.text, /Exit code: 1/);
    assert.match(rendered.text, /stdout line/);
    assert.match(rendered.text, /stderr:\nstderr line/);
    assert.doesNotMatch(rendered.text, /to expand/);
  });
});
