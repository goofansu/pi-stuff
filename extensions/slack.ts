/**
 * Slack Extension — send Slack messages via the Slack API.
 *
 * Registers a slack_message tool that sends a message to a Slack channel
 * using the Slack Web API (`chat.postMessage`).
 *
 * Requires:
 *   SLACK_BOT_TOKEN  — bot token (xoxb-…)
 *   SLACK_CHANNEL_ID — default channel to post to (C…)
 */

import { Type } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Container, Spacer, Text } from "@mariozechner/pi-tui";

const SLACK_API = "https://slack.com/api";

interface SendResult {
  channel: string;
  ts: string;
  text: string;
}

const SLACK_TIMEOUT_MS = 10_000;

/** POST to the Slack Web API and return the parsed JSON response. */
async function slackPost(
  endpoint: string,
  payload: Record<string, unknown>,
  token: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const abortFromSignal = () => controller.abort(signal?.reason);
  if (signal?.aborted) {
    abortFromSignal();
  } else {
    signal?.addEventListener("abort", abortFromSignal, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);
  try {
    controller.signal.throwIfAborted();
    const response = await fetch(`${SLACK_API}/${endpoint}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Slack HTTP error ${response.status} on ${endpoint}${body ? `: ${body.slice(0, 500)}` : ""}`,
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromSignal);
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "slack_message",
    label: "Slack Message",
    description:
      "Send a Slack message to the channel configured by SLACK_CHANNEL_ID. Requires SLACK_BOT_TOKEN and SLACK_CHANNEL_ID.",
    promptSnippet: "Send a Slack message to the configured Slack channel",
    promptGuidelines: [
      "Use slack_message to notify the user via Slack, e.g. when a long task finishes.",
      "Messages are always sent to the channel configured by SLACK_CHANNEL_ID.",
    ],
    parameters: Type.Object({
      text: Type.String({
        description: "The message text to send. Supports Slack mrkdwn syntax.",
      }),
    }),

    async execute(_toolCallId, params, signal) {
      const { text } = params as { text: string };

      const token = process.env.SLACK_BOT_TOKEN;
      if (!token) throw new Error("SLACK_BOT_TOKEN is not set");
      const defaultChannelId = process.env.SLACK_CHANNEL_ID;
      if (!defaultChannelId) throw new Error("SLACK_CHANNEL_ID is not set");

      const res = (await slackPost(
        "chat.postMessage",
        { channel: defaultChannelId, text },
        token,
        signal,
      )) as { ok: boolean; channel?: string; ts?: string; error?: string };

      if (!res.ok) throw new Error(`chat.postMessage failed: ${res.error}`);

      const result: SendResult = {
        channel: res.channel ?? defaultChannelId,
        ts:
          res.ts ??
          (() => {
            throw new Error("chat.postMessage succeeded but returned no ts");
          })(),
        text,
      };

      return {
        content: [
          {
            type: "text",
            text: `Message sent to ${result.channel} (ts: ${result.ts})`,
          },
        ],
        details: result,
      };
    },

    renderCall(args, theme) {
      const { text } = args as { text?: string };
      const dest = `→ ${process.env.SLACK_CHANNEL_ID ?? "default"}`;
      const preview =
        text && text.length > 60 ? `${text.slice(0, 57)}…` : (text ?? "");
      return new Text(
        theme.fg("toolTitle", theme.bold("slack_message ")) +
          theme.fg("dim", `${dest}  ${preview}`),
        0,
        0,
      );
    },

    renderResult(result, { expanded, isPartial }, theme, context) {
      const details = result.details as SendResult | undefined;
      const isError = context.isError === true;
      const icon = isPartial
        ? theme.fg("warning", "⏳")
        : isError
          ? theme.fg("error", "✗")
          : theme.fg("success", "✓");
      const title = `${icon} ${theme.fg("toolTitle", theme.bold("slack_message"))}`;

      if (expanded && details) {
        const container = new Container();
        container.addChild(new Text(title, 0, 0));
        container.addChild(new Spacer(1));
        container.addChild(
          new Text(theme.fg("muted", `Channel: ${details.channel}`), 0, 0),
        );
        container.addChild(
          new Text(theme.fg("muted", `ts: ${details.ts}`), 0, 0),
        );
        container.addChild(new Spacer(1));
        container.addChild(new Text(theme.fg("dim", details.text), 0, 0));
        return container;
      }

      if (details) {
        return new Text(
          `${title} ${theme.fg("dim", `sent to ${details.channel}`)}`,
          0,
          0,
        );
      }

      return new Text(title, 0, 0);
    },
  });
}
