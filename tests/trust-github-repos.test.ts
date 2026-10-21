import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type {
  ExtensionAPI,
  ProjectTrustEvent,
  ProjectTrustEventResult,
} from "@earendil-works/pi-coding-agent";
import trustGitHubReposExtension from "../extensions/trust-github-repos.ts";

const trustedRemotes = [
  "https://github.com/goofansu/repo.git",
  "https://github.com/goofansu/repo/",
  "git@github.com:goofansu/repo.git",
  "github.com:goofansu/repo.git",
  "ssh://git@github.com/goofansu/repo.git",
  "https://github.int.exe.xyz/goofansu/repo.git",
  "  https://GITHUB.COM/GoOfAnSu/repo.git\n",
];

for (const remote of trustedRemotes) {
  test(`remembers trust for ${JSON.stringify(remote)}`, async () => {
    const handler = handlerWithOrigins(remote);
    assert.deepEqual(await handler(event), { trusted: "yes", remember: true });
  });
}

const untrustedRemotes = [
  "",
  "   ",
  "not a URL",
  "https://github.com/other/repo.git",
  "https://github.com/goofansu-evil/repo.git",
  "git@github.com:other/repo.git",
  "https://github.com.evil.example/goofansu/repo.git",
  "https://github.com@evil.example/goofansu/repo.git",
  "https://evil.example/goofansu/repo.git",
  "http://github.com/goofansu/repo.git",
  "ftp://github.com/goofansu/repo.git",
  "file://github.com/goofansu/repo.git",
  "git://github.com/goofansu/repo.git",
  "ssh://git@github.int.exe.xyz/goofansu/repo.git",
  "git@github.int.exe.xyz:goofansu/repo.git",
  "https://github.int.exe.xyz.evil.example/goofansu/repo.git",
  "https://github.com/goofansu",
  "https://github.com/goofansu/",
  "https://github.com/goofansu/repo/extra",
  "https://github.com//goofansu/repo.git",
  "https://github.com/goofansu//repo.git",
  "https://github.com/goofansu/repo.git//",
  "https://github.com/goofansu/%ZZ",
];

for (const remote of untrustedRemotes) {
  test(`leaves trust undecided for ${JSON.stringify(remote)}`, async () => {
    const handler = handlerWithOrigins(remote);
    assert.deepEqual(await handler(event), { trusted: "undecided" });
  });
}

type TrustHandler = (
  event: ProjectTrustEvent,
) => Promise<ProjectTrustEventResult>;

function registerHandler(exec: ExtensionAPI["exec"]): TrustHandler {
  let handler: TrustHandler | undefined;
  const api = {
    on(event: string, callback: TrustHandler) {
      if (event === "project_trust") handler = callback;
    },
    exec,
  };
  trustGitHubReposExtension(api as unknown as ExtensionAPI);
  assert.ok(handler, "registers a project_trust handler");
  return handler;
}

function handlerWithOrigins(stdout: string): TrustHandler {
  return registerHandler(async () => ({
    code: 0,
    stdout,
    stderr: "",
    killed: false,
  }));
}

const event: ProjectTrustEvent = {
  type: "project_trust",
  cwd: "/tmp/project with spaces",
};

for (const [name, stdout, trusted] of [
  ["all trusted origins", trustedRemotes.slice(0, 6).join("\n"), true],
  ["CRLF and blank lines", `\r\n  ${trustedRemotes[0]}  \r\n\r\n`, true],
  ["mixed origins", `${trustedRemotes[0]}\nhttps://github.com/other/repo.git`, false],
  ["malformed origin among trusted ones", `${trustedRemotes[0]}\ninvalid`, false],
] as const) {
  test(`project_trust handles ${name}`, async () => {
    const handler = handlerWithOrigins(stdout);
    assert.deepEqual(
      await handler(event),
      trusted ? { trusted: "yes", remember: true } : { trusted: "undecided" },
    );
  });
}

test("Git failure does not trust even when stdout contains a trusted URL", async () => {
  const handler = registerHandler(async () => ({
    code: 128,
    stdout: trustedRemotes[0],
    stderr: "fatal: not a git repository",
    killed: false,
  }));
  assert.deepEqual(await handler(event), { trusted: "undecided" });
});

test("trust follows the event's checkout and all of its origin URLs", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "trust-github-repos-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  // Ignore the developer's Git overrides and URL rewrites for isolated fixtures.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
  );
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = join(root, "no-global-config");
  env.GIT_CEILING_DIRECTORIES = root;

  function git(cwd: string, ...args: string[]) {
    const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  }

  const trusted = join(root, "trusted checkout");
  const untrusted = join(root, "untrusted checkout");
  for (const cwd of [trusted, untrusted]) {
    await mkdir(cwd);
    git(cwd, "init", "--quiet");
  }
  git(trusted, "remote", "add", "origin", "https://github.com/goofansu/repo.git");
  git(untrusted, "remote", "add", "origin", "https://github.com/other/repo.git");
  const nested = join(trusted, "nested directory");
  await mkdir(nested);

  const handler = registerHandler(async (command, args, options) => {
    const result = spawnSync(command, args, {
      cwd: options?.cwd,
      timeout: options?.timeout,
      env,
      encoding: "utf8",
    });
    if (result.error) throw result.error;
    return {
      code: result.status ?? 1,
      stdout: result.stdout,
      stderr: result.stderr,
      killed: result.signal !== null,
    };
  });
  const decide = (cwd: string) => handler({ type: "project_trust", cwd });

  assert.deepEqual(await decide(untrusted), { trusted: "undecided" });
  assert.deepEqual(await decide(nested), { trusted: "yes", remember: true });
  assert.deepEqual(await decide(untrusted), { trusted: "undecided" });

  git(
    trusted,
    "config",
    "--add",
    "remote.origin.url",
    "https://github.com/other/repo.git",
  );
  assert.deepEqual(await decide(nested), { trusted: "undecided" });

  git(trusted, "remote", "remove", "origin");
  assert.deepEqual(await decide(nested), { trusted: "undecided" });
});

test("Git execution exceptions leave trust undecided", async () => {
  const handler = registerHandler(async () => {
    throw new Error("git could not start");
  });
  assert.deepEqual(await handler(event), { trusted: "undecided" });
});
