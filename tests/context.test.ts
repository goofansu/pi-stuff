import assert from "node:assert/strict";
import test from "node:test";

import contextExtension, { sumSessionUsage } from "../extensions/context.ts";

type CapturedCommand = {
  handler: (args: string, ctx: Record<string, unknown>) => Promise<void>;
};

function createContextHarness() {
  let command: CapturedCommand | undefined;
  const messages: Array<{
    message: { customType: string; content: string; display: boolean };
    options: { triggerTurn: boolean };
  }> = [];

  const pi = {
    on: () => {},
    appendEntry: () => {},
    registerCommand: (_name: string, options: CapturedCommand) => {
      command = options;
    },
    getCommands: () => [],
    getActiveTools: () => [],
    getAllTools: () => [],
    sendMessage: (
      message: { customType: string; content: string; display: boolean },
      options: { triggerTurn: boolean },
    ) => {
      messages.push({ message, options });
    },
  };

  contextExtension(pi as never);
  assert.ok(command, "context command was registered");

  return { command, messages };
}

function createCommandContext(overrides: Record<string, unknown> = {}) {
  return {
    cwd: "/tmp/context-project",
    mode: "print",
    hasUI: false,
    ui: {
      custom: async () => {
        throw new Error("custom UI should not be used");
      },
    },
    sessionManager: { getEntries: () => [] },
    getSystemPrompt: () => "system prompt",
    getSystemPromptOptions: () => ({
      cwd: "/tmp/context-project",
      contextFiles: [],
      skills: [],
    }),
    getContextUsage: () => ({ tokens: 100, contextWindow: 1000, percent: 10 }),
    ...overrides,
  };
}

test("sumSessionUsage includes current assistant usage fields", () => {
  const ctx = {
    sessionManager: {
      getEntries: () => [
        {
          type: "message",
          message: {
            role: "assistant",
            usage: {
              input: 100,
              output: 20,
              cacheRead: 30,
              cacheWrite: 40,
              cost: { total: 0.1234 },
            },
          },
        },
      ],
    },
  };

  assert.deepEqual(sumSessionUsage(ctx as never), {
    input: 100,
    output: 20,
    cacheRead: 30,
    cacheWrite: 40,
    totalTokens: 190,
    totalCost: 0.1234,
  });
});

test("context command reports prompt option context files and loaded skills", async () => {
  const { command, messages } = createContextHarness();
  const ctx = createCommandContext({
    getSystemPromptOptions: () => ({
      cwd: "/tmp/context-project",
      contextFiles: [
        {
          path: "/tmp/context-project/AGENTS.md",
          content: "Project-specific instructions",
        },
      ],
      skills: [
        {
          name: "loaded-skill",
          description: "Loaded skill",
          filePath: "/tmp/context-project/skills/loaded-skill/SKILL.md",
          baseDir: "/tmp/context-project/skills/loaded-skill",
          sourceInfo: {
            path: "/tmp/context-project/skills/loaded-skill/SKILL.md",
            source: "auto",
            scope: "project",
            origin: "top-level",
          },
          disableModelInvocation: false,
        },
      ],
    }),
  });

  await command.handler("", ctx);

  assert.equal(messages.length, 1);
  const content = messages[0].message.content;
  assert.match(content, /AGENTS: \.\/AGENTS\.md/);
  assert.match(content, /Skills \(1\): loaded-skill/);
});

test("context command renders unknown window when context tokens are null", async () => {
  const { command, messages } = createContextHarness();
  const ctx = createCommandContext({
    getContextUsage: () => ({ tokens: null, contextWindow: 1000, percent: null }),
  });

  await command.handler("", ctx);

  assert.equal(messages.length, 1);
  assert.match(messages[0].message.content, /Window: \(unknown\)/);
});

test("context command emits plaintext instead of custom UI in rpc mode", async () => {
  const { command, messages } = createContextHarness();
  let customCalls = 0;
  const ctx = createCommandContext({
    mode: "rpc",
    hasUI: true,
    ui: {
      custom: async () => {
        customCalls += 1;
        throw new Error("custom UI should not be used in rpc mode");
      },
    },
  });

  await command.handler("", ctx);

  assert.equal(customCalls, 0);
  assert.equal(messages.length, 1);
  assert.match(messages[0].message.content, /^Context\n/);
});
