import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import slackExtension from "../extensions/slack.ts";

function registerSlackTool() {
  let tool: any;
  slackExtension({
    registerTool(registeredTool: any) {
      tool = registeredTool;
    },
  } as any);
  assert.ok(tool, "slack_message tool should be registered");
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

const originalFetch = globalThis.fetch;
const originalToken = process.env.SLACK_BOT_TOKEN;
const originalChannel = process.env.SLACK_CHANNEL_ID;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.SLACK_BOT_TOKEN;
  else process.env.SLACK_BOT_TOKEN = originalToken;
  if (originalChannel === undefined) delete process.env.SLACK_CHANNEL_ID;
  else process.env.SLACK_CHANNEL_ID = originalChannel;
});

describe("slack_message tool", () => {
  it("aborts the Slack fetch when the tool execution signal is aborted", async () => {
    const tool = registerSlackTool();
    process.env.SLACK_BOT_TOKEN = "xoxb-test";
    process.env.SLACK_CHANNEL_ID = "C123";

    let fetchSignal: AbortSignal | undefined;
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      fetchSignal = init?.signal ?? undefined;
      await new Promise<void>((resolve, reject) => {
        fetchSignal?.addEventListener(
          "abort",
          () => reject(fetchSignal?.reason),
          { once: true },
        );
        setImmediate(resolve);
      });
      return new Response(
        JSON.stringify({ ok: true, channel: "C123", ts: "123.456" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const controller = new AbortController();
    const execution = tool.execute(
      "tool-call-1",
      { text: "hello" },
      controller.signal,
    );

    assert.ok(fetchSignal, "fetch should receive an abort signal");
    controller.abort();
    assert.equal(fetchSignal.aborted, true);

    await assert.rejects(execution);
  });

  it("renders error results with a failure icon", () => {
    const tool = registerSlackTool();

    const rendered = tool.renderResult(
      { content: [{ type: "text", text: "failed" }], details: undefined },
      { expanded: false, isPartial: false },
      theme,
      { isError: true },
    );

    assert.match(rendered.text, /✗/);
    assert.doesNotMatch(rendered.text, /✓/);
  });
});
