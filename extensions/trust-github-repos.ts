/**
 * Automatically trust and remember projects whose origin URLs all point to
 * github.com/goofansu repositories, before project-local resources load.
 * Install personally (or load with -e) to participate in project_trust.
 *
 * Adapted from mitsuhiko/agent-stuff's extensions/trust-github-repos.ts;
 * restricted to goofansu, HTTPS/SSH, and exactly two non-empty path segments.
 * See THIRD_PARTY_LICENSES for the Apache-2.0 attribution.
 */

import type {
  ExtensionAPI,
  ProjectTrustEventResult,
} from "@earendil-works/pi-coding-agent";

export function isTrustedGitHubRemote(remoteUrl: string): boolean {
  const value = remoteUrl.trim();

  // SCP-like SSH syntax: git@github.com:owner/repo.git
  const scpMatch = value.match(
    /^(?:[^@/:\s]+@)?github\.com:([^/:\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i,
  );
  if (scpMatch) {
    return scpMatch[1].toLowerCase() === "goofansu";
  }

  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "ssh:") ||
      parsed.hostname.toLowerCase() !== "github.com"
    ) {
      return false;
    }

    const parts = parsed.pathname.replace(/^\/|\/$/g, "").split("/");
    return (
      parts.length === 2 &&
      parts[0].toLowerCase() === "goofansu" &&
      parts[1].length > 0
    );
  } catch {
    return false;
  }
}

async function getOriginRemoteUrls(
  pi: ExtensionAPI,
  cwd: string,
): Promise<string[]> {
  try {
    const result = await pi.exec(
      "git",
      ["remote", "get-url", "--all", "origin"],
      { cwd, timeout: 5_000 },
    );
    if (result.code !== 0) {
      return [];
    }

    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export default function trustGitHubReposExtension(pi: ExtensionAPI): void {
  pi.on("project_trust", async (event): Promise<ProjectTrustEventResult> => {
    const originUrls = await getOriginRemoteUrls(pi, event.cwd);
    if (originUrls.length > 0 && originUrls.every(isTrustedGitHubRemote)) {
      return { trusted: "yes", remember: true };
    }

    return { trusted: "undecided" };
  });
}
