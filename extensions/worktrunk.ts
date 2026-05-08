/**
 * Worktrunk status marker extension
 *
 * Updates the wt list activity marker to reflect Pi's current state:
 *   🤖 — Pi is working
 *   💬 — Pi is waiting for input
 *
 * Requires the worktrunk CLI (https://worktrunk.dev).
 * Markers appear in `wt list` alongside the current branch.
 */

import { execFile } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function wtMarker(args: string[]): void {
  execFile("wt", ["config", "state", "marker", ...args]);
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async () => {
    wtMarker(["set", "💬"]);
  });

  pi.on("agent_start", async () => {
    wtMarker(["set", "🤖"]);
  });

  pi.on("agent_end", async () => {
    wtMarker(["set", "💬"]);
  });

  pi.on("session_shutdown", async () => {
    wtMarker(["clear"]);
  });
}
