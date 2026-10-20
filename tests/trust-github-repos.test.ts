import assert from "node:assert/strict";
import test from "node:test";
import type {
  ExtensionAPI,
  ProjectTrustEventResult,
} from "@earendil-works/pi-coding-agent";
import trustGitHubReposExtension, {
  isTrustedGitHubRemote,
} from "../extensions/trust-github-repos.ts";

const remoteForms = [
  (host: string, path: string) => `https://${host}/${path}`,
  (host: string, path: string) => `git@${host}:${path}`,
  (host: string, path: string) => `ssh://git@${host}/${path}`,
];

for (const remote of remoteForms) {
  test(`matches only goofansu repositories: ${remote("github.com", "owner/repo")}`, () => {
    for (const owner of ["goofansu", "GOOFANSU", "GoOfAnSu"]) {
      for (const suffix of ["", ".git", ".git/"]) {
        assert.equal(
          isTrustedGitHubRemote(
            remote("github.com", `${owner}/pi-stuff${suffix}`),
          ),
          true,
        );
      }
    }
    assert.equal(
      isTrustedGitHubRemote(remote("GITHUB.COM", "goofansu/repo")),
      true,
    );

    for (const owner of [
      "mitsuhiko",
      "earendil-works",
      "other",
      "goofansu-evil",
      "notgoofansu",
    ]) {
      const url = remote("github.com", `${owner}/repo.git`);
      assert.equal(isTrustedGitHubRemote(url), false, url);
    }
    for (const host of [
      "gitlab.com",
      "github.com.evil.com",
      "notgithub.com",
      "github.int.exe.xyz",
    ]) {
      const url = remote(host, "goofansu/repo.git");
      assert.equal(isTrustedGitHubRemote(url), false, url);
    }
    for (const path of [
      "",
      "goofansu",
      "goofansu/",
      "goofansu/repo/extra",
      "goofansu//repo",
      "/goofansu/repo",
    ]) {
      const url = remote("github.com", path);
      assert.equal(isTrustedGitHubRemote(url), false, url);
    }
  });
}

test("rejects malformed remotes and unsupported protocols", () => {
  for (const url of [
    "",
    "not a URL",
    "../goofansu/repo",
    "http://github.com/goofansu/repo",
    "ftp://github.com/goofansu/repo",
    "file://github.com/goofansu/repo",
    "https://github.com@evil.com/goofansu/repo",
  ]) {
    assert.equal(isTrustedGitHubRemote(url), false, url);
  }
});

async function decideTrust(stdout: string, code = 0, throws = false) {
  let handler:
    | ((event: { cwd: string }) => Promise<ProjectTrustEventResult>)
    | undefined;
  const pi = {
    on(event: string, callback: typeof handler) {
      assert.equal(event, "project_trust");
      handler = callback;
    },
    async exec(command: string, args: string[], options: unknown) {
      assert.equal(command, "git");
      assert.deepEqual(args, ["remote", "get-url", "--all", "origin"]);
      assert.deepEqual(options, { cwd: "/project", timeout: 5_000 });
      if (throws) throw new Error("git failed");
      return { stdout, stderr: "", code, killed: false };
    },
  } as unknown as ExtensionAPI;
  trustGitHubReposExtension(pi);
  assert.ok(handler);
  return handler({ cwd: "/project" });
}

test("trusts and remembers only a non-empty set of entirely trusted origins", async () => {
  assert.deepEqual(await decideTrust("https://github.com/goofansu/repo.git"), {
    trusted: "yes",
    remember: true,
  });
  assert.deepEqual(
    await decideTrust(
      " https://github.com/goofansu/repo.git\r\ngit@github.com:GOOFANSU/repo.git\n\n",
    ),
    { trusted: "yes", remember: true },
  );
  for (const stdout of [
    "",
    " \n",
    "https://github.com/other/repo",
    "https://github.com/goofansu/repo\nhttps://github.com/other/repo",
  ]) {
    assert.deepEqual(await decideTrust(stdout), { trusted: "undecided" });
  }
});

test("falls back to normal trust handling when git fails", async () => {
  const trustedUrl = "https://github.com/goofansu/repo";
  assert.deepEqual(await decideTrust(trustedUrl, 1), { trusted: "undecided" });
  assert.deepEqual(await decideTrust(trustedUrl, 0, true), {
    trusted: "undecided",
  });
});
