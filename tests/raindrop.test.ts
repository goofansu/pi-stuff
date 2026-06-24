import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRaindropRequest,
  formatRaindropApiError,
  formatRaindropSuccess,
  default as raindropExtension,
  validateRaindropParams,
} from "../extensions/raindrop.ts";

describe("validateRaindropParams", () => {
  it("accepts a minimal list request", () => {
    const result = validateRaindropParams({ command: "list" });

    assert.deepEqual(result, { ok: true });
  });

  it("accepts a minimal create request", () => {
    const result = validateRaindropParams({
      command: "create",
      items: [{ link: "https://example.com" }],
    });

    assert.deepEqual(result, { ok: true });
  });

  it("rejects create without items", () => {
    const result = validateRaindropParams({ command: "create" });

    assert.equal(result.ok, false);
    assert.match(result.reason, /create requires items/);
  });

  it("rejects create with an empty items array", () => {
    const result = validateRaindropParams({ command: "create", items: [] });

    assert.equal(result.ok, false);
    assert.match(result.reason, /at least 1 item/);
  });

  it("rejects create with more than 100 items", () => {
    const result = validateRaindropParams({
      command: "create",
      items: Array.from({ length: 101 }, (_, i) => ({
        link: `https://example.com/${i}`,
      })),
    });

    assert.equal(result.ok, false);
    assert.match(result.reason, /at most 100 items/);
  });

  it("rejects update without collectionId", () => {
    const result = validateRaindropParams({
      command: "update",
      body: { tags: ["read-later"] },
    });

    assert.equal(result.ok, false);
    assert.match(result.reason, /update requires collectionId/);
  });

  it("rejects update with collectionId 0", () => {
    const result = validateRaindropParams({
      command: "update",
      collectionId: 0,
      body: { tags: ["read-later"] },
    });

    assert.equal(result.ok, false);
    assert.match(result.reason, /does not support collectionId 0/);
  });

  it("rejects update without body", () => {
    const result = validateRaindropParams({
      command: "update",
      collectionId: 123,
    });

    assert.equal(result.ok, false);
    assert.match(result.reason, /update requires body/);
  });
});

describe("buildRaindropRequest", () => {
  it("builds a list request defaulting to all non-trash raindrops", () => {
    const request = buildRaindropRequest({
      command: "list",
      search: "tag:docs",
      nested: true,
      sort: "-created",
      page: 1,
      perpage: 25,
    });

    assert.equal(request.method, "GET");
    assert.equal(
      request.url,
      "https://api.raindrop.io/rest/v1/raindrops/0?search=tag%3Adocs&nested=true&sort=-created&page=1&perpage=25",
    );
    assert.equal(request.body, undefined);
    assert.equal(request.count, 0);
  });

  it("builds a create request", () => {
    const request = buildRaindropRequest({
      command: "create",
      items: [
        {
          link: "https://example.com",
          title: "Example",
          tags: ["docs"],
          collection: { $id: 123 },
        },
      ],
    });

    assert.equal(request.method, "POST");
    assert.equal(request.url, "https://api.raindrop.io/rest/v1/raindrops");
    assert.deepEqual(request.body, {
      items: [
        {
          link: "https://example.com",
          title: "Example",
          tags: ["docs"],
          collection: { $id: 123 },
        },
      ],
    });
    assert.equal(request.count, 1);
  });

  it("builds an update request with query parameters", () => {
    const request = buildRaindropRequest({
      command: "update",
      collectionId: 456,
      search: "tag:old",
      nested: true,
      body: {
        ids: [1, 2],
        tags: ["new"],
        important: true,
      },
    });

    assert.equal(request.method, "PUT");
    assert.equal(
      request.url,
      "https://api.raindrop.io/rest/v1/raindrops/456?search=tag%3Aold&nested=true",
    );
    assert.deepEqual(request.body, {
      ids: [1, 2],
      tags: ["new"],
      important: true,
    });
    assert.equal(request.count, 2);
  });
});

describe("result formatting", () => {
  it("formats list success from returned items", () => {
    assert.equal(
      formatRaindropSuccess("list", { result: true, items: [{}, {}, {}] }),
      "Found 3 raindrop(s).",
    );
  });

  it("formats create success from returned items", () => {
    assert.equal(
      formatRaindropSuccess("create", { result: true, items: [{}, {}] }),
      "Created/imported 2 raindrop(s).",
    );
  });

  it("formats update success from modified count", () => {
    assert.equal(
      formatRaindropSuccess("update", { result: true, modified: 7 }),
      "Updated 7 raindrop(s).",
    );
  });

  it("formats API errors with truncated body", () => {
    const message = formatRaindropApiError(429, "x".repeat(700));

    assert.match(message, /Raindrop API failed: 429/);
    assert.match(message, /x{500}/);
    assert.doesNotMatch(message, /x{650}/);
  });
});

function registerRaindropTool() {
  let tool: any;
  const notifications: Array<{ message: string; level: string }> = [];

  raindropExtension({
    on(eventName: string, handler: any) {
      if (eventName === "session_start") {
        handler(null, {
          ui: {
            notify(message: string, level: string) {
              notifications.push({ message, level });
            },
          },
        });
      }
    },
    registerTool(registeredTool: any) {
      tool = registeredTool;
    },
  } as any);

  assert.ok(tool, "raindrop tool should be registered");
  return { tool, notifications };
}

const theme = {
  fg(_name: string, text: string) {
    return text;
  },
  bold(text: string) {
    return text;
  },
};

describe("raindrop rendering", () => {
  it("renders list call summaries", () => {
    const { tool } = registerRaindropTool();

    const rendered = tool.renderCall(
      {
        command: "list",
        search: "tag:docs",
      },
      theme,
    );

    assert.match(rendered.text, /raindrop list collection 0/);
  });

  it("renders create call summaries", () => {
    const { tool } = registerRaindropTool();

    const rendered = tool.renderCall(
      {
        command: "create",
        items: [{ link: "https://example.com" }, { link: "https://openai.com" }],
      },
      theme,
    );

    assert.match(rendered.text, /raindrop create 2 item\(s\)/);
  });

  it("renders update call summaries", () => {
    const { tool } = registerRaindropTool();

    const rendered = tool.renderCall(
      {
        command: "update",
        collectionId: 123,
        body: { tags: ["docs"] },
      },
      theme,
    );

    assert.match(rendered.text, /raindrop update collection 123/);
  });

  it("renders result text", () => {
    const { tool } = registerRaindropTool();

    const rendered = tool.renderResult(
      {
        isError: false,
        content: [{ type: "text", text: "Created/imported 1 raindrop(s)." }],
        details: {},
      },
      { expanded: false, isPartial: false },
      theme,
      { isError: false },
    );

    assert.match(rendered.text, /✓ raindrop/);
    assert.match(rendered.text, /Created\/imported 1 raindrop\(s\)\./);
  });
});

describe("raindrop extension registration", () => {
  it("registers one raindrop tool", () => {
    const { tool } = registerRaindropTool();

    assert.equal(tool.name, "raindrop");
    assert.equal(tool.label, "Raindrop");
    assert.match(tool.description, /list, create, or update many/i);
  });

  it("warns at session start when RAINDROP_API_KEY is missing", () => {
    const oldValue = process.env.RAINDROP_API_KEY;
    delete process.env.RAINDROP_API_KEY;
    try {
      const { notifications } = registerRaindropTool();

      assert.deepEqual(notifications, [
        {
          message:
            "raindrop: RAINDROP_API_KEY is not set - raindrop tool will fail.",
          level: "warning",
        },
      ]);
    } finally {
      if (oldValue === undefined) {
        delete process.env.RAINDROP_API_KEY;
      } else {
        process.env.RAINDROP_API_KEY = oldValue;
      }
    }
  });
});

describe("executeRaindropTool", () => {
  it("returns a tool error when RAINDROP_API_KEY is missing", async () => {
    const { tool } = registerRaindropTool();
    const oldValue = process.env.RAINDROP_API_KEY;
    delete process.env.RAINDROP_API_KEY;

    try {
      const result = await tool.execute(
        "call-1",
        { command: "create", items: [{ link: "https://example.com" }] },
        undefined,
      );

      assert.equal(result.isError, true);
      assert.equal(result.content[0].text, "RAINDROP_API_KEY is not set");
    } finally {
      if (oldValue === undefined) {
        delete process.env.RAINDROP_API_KEY;
      } else {
        process.env.RAINDROP_API_KEY = oldValue;
      }
    }
  });

  it("executes a create request with bearer auth", async () => {
    const { tool } = registerRaindropTool();
    const oldKey = process.env.RAINDROP_API_KEY;
    const oldFetch = globalThis.fetch;
    const calls: Array<{ url: string; init: RequestInit }> = [];
    process.env.RAINDROP_API_KEY = "test-token";
    globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({ result: true, items: [{ _id: 1 }, { _id: 2 }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      const result = await tool.execute(
        "call-1",
        {
          command: "create",
          items: [
            { link: "https://example.com/a" },
            { link: "https://example.com/b" },
          ],
        },
        undefined,
      );

      assert.equal(result.isError, false);
      assert.equal(result.content[0].text, "Created/imported 2 raindrop(s).");
      assert.equal(calls[0].url, "https://api.raindrop.io/rest/v1/raindrops");
      assert.equal(calls[0].init.method, "POST");
      assert.deepEqual(calls[0].init.headers, {
        Accept: "application/json",
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      });
      assert.equal(
        calls[0].init.body,
        JSON.stringify({
          items: [
            { link: "https://example.com/a" },
            { link: "https://example.com/b" },
          ],
        }),
      );
    } finally {
      globalThis.fetch = oldFetch;
      if (oldKey === undefined) {
        delete process.env.RAINDROP_API_KEY;
      } else {
        process.env.RAINDROP_API_KEY = oldKey;
      }
    }
  });

  it("executes a list request with bearer auth and no body", async () => {
    const { tool } = registerRaindropTool();
    const oldKey = process.env.RAINDROP_API_KEY;
    const oldFetch = globalThis.fetch;
    const calls: Array<{ url: string; init: RequestInit }> = [];
    process.env.RAINDROP_API_KEY = "test-token";
    globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({ result: true, items: [{ _id: 1 }, { _id: 2 }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      const result = await tool.execute(
        "call-1",
        {
          command: "list",
          search: "tag:docs",
          perpage: 25,
        },
        undefined,
      );

      assert.equal(result.isError, false);
      assert.equal(result.content[0].text, "Found 2 raindrop(s).");
      assert.equal(
        calls[0].url,
        "https://api.raindrop.io/rest/v1/raindrops/0?search=tag%3Adocs&perpage=25",
      );
      assert.equal(calls[0].init.method, "GET");
      assert.deepEqual(calls[0].init.headers, {
        Accept: "application/json",
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      });
      assert.equal(calls[0].init.body, undefined);
    } finally {
      globalThis.fetch = oldFetch;
      if (oldKey === undefined) {
        delete process.env.RAINDROP_API_KEY;
      } else {
        process.env.RAINDROP_API_KEY = oldKey;
      }
    }
  });

  it("returns an API error without exposing the API key", async () => {
    const { tool } = registerRaindropTool();
    const oldKey = process.env.RAINDROP_API_KEY;
    const oldFetch = globalThis.fetch;
    process.env.RAINDROP_API_KEY = "secret-token";
    globalThis.fetch = (async () =>
      new Response("denied secret-token", { status: 401 })) as typeof fetch;

    try {
      const result = await tool.execute(
        "call-1",
        { command: "create", items: [{ link: "https://example.com" }] },
        undefined,
      );

      assert.equal(result.isError, true);
      assert.match(result.content[0].text, /Raindrop API failed: 401/);
      assert.doesNotMatch(JSON.stringify(result), /secret-token/);
    } finally {
      globalThis.fetch = oldFetch;
      if (oldKey === undefined) {
        delete process.env.RAINDROP_API_KEY;
      } else {
        process.env.RAINDROP_API_KEY = oldKey;
      }
    }
  });
});
