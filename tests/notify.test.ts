import test from "node:test";
import assert from "node:assert/strict";

import notifyExtension from "../extensions/notify.ts";

function withStdoutWrite<T>(fn: () => T): { result: T; writes: string[] } {
  const writes: string[] = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: unknown, ..._args: unknown[]) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  try {
    return { result: fn(), writes };
  } finally {
    process.stdout.write = originalWrite;
  }
}

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const originals = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(env)) {
    originals.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of originals) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function triggerAgentEnd(messages: Array<{ role?: string; content?: unknown }>) {
  let handler: ((event: { messages?: typeof messages }) => Promise<void>) | undefined;
  const pi = {
    on(event: string, callback: typeof handler) {
      assert.equal(event, "agent_end");
      handler = callback;
    },
  };

  notifyExtension(pi as never);
  assert.ok(handler, "agent_end handler should be registered");
  return handler({ messages });
}

test("notify extension emits a plain bell in Zed terminals", async () => {
  await withEnv({ ZED_TERM: "true", TERM_PROGRAM: "zed" }, async () => {
    const { writes } = await withStdoutWrite(async () => {
      await triggerAgentEnd([{ role: "assistant", content: "a-z" }]);
    });

    assert.deepEqual(writes, ["\x07"]);
  });
});

test("notify extension emits OSC 777 outside Zed terminals", async () => {
  await withEnv({ ZED_TERM: undefined, TERM_PROGRAM: undefined }, async () => {
    const { writes } = await withStdoutWrite(async () => {
      await triggerAgentEnd([{ role: "assistant", content: "a-z" }]);
    });

    assert.deepEqual(writes, ["\x1b]777;notify;π;a-z\x07"]);
  });
});
