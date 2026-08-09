import assert from "node:assert/strict";
import { describe, it } from "node:test";
import webSearchExtension from "../extensions/web-search.ts";

function registerWebSearchTool() {
  let tool: any;
  webSearchExtension({
    on() {},
    registerTool(registered: any) {
      tool = registered;
    },
    registerCommand() {},
  } as any);
  return tool;
}

interface FetchCall {
  url: string;
  init: RequestInit;
  body: Record<string, unknown>;
}

/**
 * Registration-level seam: run the registered web_search tool against a mocked
 * fetch and inspect only what callers can see — the outgoing Brave request, the
 * model-visible text, and the structured details.
 */
async function runTool(
  params: Record<string, unknown>,
  response: {
    ok?: boolean;
    status?: number;
    json?: unknown;
    text?: string;
  },
  signal?: AbortSignal,
) {
  const tool = registerWebSearchTool();
  const calls: FetchCall[] = [];
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.BRAVE_SEARCH_API_KEY;
  process.env.BRAVE_SEARCH_API_KEY = "test-key";
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.json ?? {},
      text: async () => response.text ?? "",
    } as any;
  }) as typeof fetch;

  try {
    const result = await tool.execute("call-1", params, signal);
    return { calls, result, text: result.content[0].text as string };
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.BRAVE_SEARCH_API_KEY;
    else process.env.BRAVE_SEARCH_API_KEY = previousKey;
  }
}

async function expectToolFailure(
  params: Record<string, unknown>,
  response: { ok?: boolean; status?: number; text?: string },
  expected: RegExp,
) {
  await assert.rejects(() => runTool(params, response), expected);
}

const braveResponse = {
  grounding: {
    generic: [
      {
        url: "https://news.example.com/rate-decision",
        title: "Central bank holds rates",
        snippets: ["Rates were held at 4.25% on Thursday."],
      },
      {
        url: "https://background.example.com/primer",
        title: "How rate decisions work",
        snippets: ["A primer on monetary policy."],
      },
    ],
  },
  sources: {
    "https://news.example.com/rate-decision": {
      title: "Central bank holds rates",
      hostname: "news.example.com",
      age: ["Wednesday, January 15, 2026", "2026-01-15", "1 day ago"],
    },
    "https://background.example.com/primer": {
      title: "How rate decisions work",
      hostname: "background.example.com",
      age: null,
    },
  },
};

describe("web_search registration", () => {
  it("registers the web_search tool with prompt guidance", () => {
    const tool = registerWebSearchTool();

    assert.equal(tool.name, "web_search");
    assert.ok(tool.promptSnippet.length > 0);
    const guidelines = tool.promptGuidelines as string[];
    assert.ok(guidelines[0]?.startsWith("Use web_search "));
    assert.ok(guidelines.some((guideline) => guideline.includes("Do NOT")));
  });

  it("guides freshness and context-efficient search budgets", () => {
    const guidelines = (
      registerWebSearchTool().promptGuidelines as string[]
    ).join("\n");

    assert.match(guidelines, /freshness/);
    assert.match(guidelines, /max_urls/);
    assert.match(guidelines, /Do NOT repeat the same search/);
  });

  it("warns when BRAVE_SEARCH_API_KEY is missing at session start", () => {
    const notifications: Array<[string, string]> = [];
    let handler: any;
    webSearchExtension({
      on(event: string, fn: any) {
        if (event === "session_start") handler = fn;
      },
      registerTool() {},
      registerCommand() {},
    } as any);

    const previous = process.env.BRAVE_SEARCH_API_KEY;
    delete process.env.BRAVE_SEARCH_API_KEY;
    try {
      handler({}, {
        ui: {
          notify(message: string, level: string) {
            notifications.push([message, level]);
          },
        },
      } as any);
    } finally {
      if (previous !== undefined) process.env.BRAVE_SEARCH_API_KEY = previous;
    }

    assert.deepEqual(notifications.length, 1);
    assert.match(notifications[0][0], /BRAVE_SEARCH_API_KEY is not set/);
    assert.equal(notifications[0][1], "warning");
  });
});

describe("web_search schema", () => {
  const properties = registerWebSearchTool().parameters
    .properties as Record<string, any>;

  it("documents candidate breadth separately from returned sources", () => {
    assert.match(properties.count.description, /1-50/);
    assert.match(properties.max_urls.description, /1-50/);
    assert.notEqual(properties.count.description, properties.max_urls.description);
  });

  it("enforces Brave's documented numeric bounds", () => {
    const bounds = (name: string) => [
      properties[name].minimum,
      properties[name].maximum,
    ];

    assert.deepEqual(bounds("count"), [1, 50]);
    assert.deepEqual(bounds("max_urls"), [1, 50]);
    assert.deepEqual(bounds("max_tokens"), [1024, 32768]);
    assert.deepEqual(bounds("max_tokens_per_url"), [512, 8192]);
    assert.deepEqual(bounds("max_snippets_per_url"), [1, 100]);
  });

  it("accepts Brave's freshness syntax", () => {
    const pattern = new RegExp(properties.freshness.pattern);

    for (const value of ["pd", "pw", "pm", "py", "2026-01-01to2026-03-31"])
      assert.ok(pattern.test(value), value);
    for (const value of ["last week", "p1d", "2026-01-01"])
      assert.ok(!pattern.test(value), value);
    assert.match(properties.freshness.description, /YYYY-MM-DDtoYYYY-MM-DD/);
  });
});

describe("web_search outgoing Brave request", () => {
  it("keeps count as candidate breadth and omits every optional control", async () => {
    const { calls } = await runTool({ query: "  pi coding agent  " }, {
      json: braveResponse,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].body, {
      q: "pi coding agent",
      count: 20,
      maximum_number_of_tokens: 8192,
      context_threshold_mode: "balanced",
    });
    assert.equal(
      calls[0].url,
      "https://api.search.brave.com/res/v1/llm/context",
    );
    assert.equal(
      (calls[0].init.headers as Record<string, string>)["X-Subscription-Token"],
      "test-key",
    );
  });

  it("maps every control onto Brave's request field names", async () => {
    const { calls, result } = await runTool(
      {
        query: "latest rate decision",
        count: 50,
        max_urls: 5,
        max_tokens: 16384,
        max_tokens_per_url: 1024,
        max_snippets_per_url: 5,
        freshness: " PW ",
        threshold: "strict",
        goggles: " $discard,site=reddit.com ",
      },
      { json: braveResponse },
    );

    assert.deepEqual(calls[0].body, {
      q: "latest rate decision",
      count: 50,
      maximum_number_of_tokens: 16384,
      context_threshold_mode: "strict",
      maximum_number_of_urls: 5,
      maximum_number_of_tokens_per_url: 1024,
      maximum_number_of_snippets_per_url: 5,
      freshness: "pw",
      goggles: "$discard,site=reddit.com",
    });
    assert.equal(result.details.count, 50);
    assert.equal(result.details.max_urls, 5);
    assert.equal(result.details.freshness, "pw");
    assert.equal(result.details.max_tokens_per_url, 1024);
    assert.equal(result.details.max_snippets_per_url, 5);
  });

  it("clamps out-of-range numbers to Brave's limits", async () => {
    const { calls } = await runTool(
      {
        query: "clamping",
        count: 500,
        max_urls: 0,
        max_tokens: 1,
        max_tokens_per_url: 99_999,
        max_snippets_per_url: 900,
      },
      { json: braveResponse },
    );

    assert.equal(calls[0].body.count, 50);
    assert.equal(calls[0].body.maximum_number_of_urls, 1);
    assert.equal(calls[0].body.maximum_number_of_tokens, 1024);
    assert.equal(calls[0].body.maximum_number_of_tokens_per_url, 8192);
    assert.equal(calls[0].body.maximum_number_of_snippets_per_url, 100);
  });

  it("rejects unsupported freshness before making a request", async () => {
    const tool = registerWebSearchTool();
    const originalFetch = globalThis.fetch;
    let called = false;
    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    globalThis.fetch = (async () => {
      called = true;
      throw new Error("should not be called");
    }) as typeof fetch;

    try {
      await assert.rejects(
        () => tool.execute("call-1", { query: "news", freshness: "last week" }),
        /freshness must be pd, pw, pm, py, or YYYY-MM-DDtoYYYY-MM-DD/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.equal(called, false);
  });

  it("passes its abort signal to the network request", async () => {
    const controller = new AbortController();
    const { calls } = await runTool(
      { query: "cancellable" },
      { json: braveResponse },
      controller.signal,
    );

    assert.equal(calls[0].init.signal, controller.signal);
  });

  it("turns non-successful Brave responses into tool failures", async () => {
    await expectToolFailure(
      { query: "bad key" },
      { ok: false, status: 401, text: "unauthorized" },
      /Brave LLM Context failed: 401 — unauthorized/,
    );
  });
});

describe("web_search model-visible output", () => {
  it("shows source dates in result entries and the source list", async () => {
    const { text, result } = await runTool(
      { query: "rate decision", freshness: "pw" },
      { json: braveResponse },
    );

    assert.match(
      text,
      /## 1\. Central bank holds rates\nhttps:\/\/news\.example\.com\/rate-decision\nDate: 2026-01-15/,
    );
    assert.match(text, /- Rates were held at 4\.25% on Thursday\./);
    assert.match(
      text,
      /## Sources\n1\. Central bank holds rates\n {3}https:\/\/news\.example\.com\/rate-decision\n {3}Date: 2026-01-15/,
    );
    assert.equal(result.details.sources[0].date, "2026-01-15");
  });

  it("renders sources without a date and with unexpected age metadata", async () => {
    const { text, result } = await runTool(
      { query: "mixed metadata" },
      {
        json: {
          grounding: {
            generic: [
              { url: "https://a.example.com", title: "No age", snippets: ["a"] },
              {
                url: "https://b.example.com",
                title: "Odd age",
                snippets: ["b"],
              },
              {
                url: "https://c.example.com",
                title: "Relative age",
                snippets: ["c"],
              },
            ],
          },
          sources: {
            "https://a.example.com": { hostname: "a.example.com", age: null },
            "https://b.example.com": {
              hostname: "b.example.com",
              age: { published: 12345 },
            },
            "https://c.example.com": {
              hostname: "c.example.com",
              age: "3 days ago",
            },
          },
        },
      },
    );

    assert.match(text, /## 1\. No age\nhttps:\/\/a\.example\.com\n/);
    assert.match(text, /## 2\. Odd age\nhttps:\/\/b\.example\.com\n/);
    assert.match(text, /## 3\. Relative age\nhttps:\/\/c\.example\.com\nDate: 3 days ago/);
    assert.doesNotMatch(text, /Date: \[object Object\]/);
    assert.deepEqual(
      result.details.sources.map((source: any) => source.date),
      [undefined, undefined, "3 days ago"],
    );
  });

  it("keeps titles, URLs, snippets, and POI/map entries intact", async () => {
    const { text, result } = await runTool(
      { query: "coffee near me" },
      {
        json: {
          grounding: {
            generic: [],
            poi: {
              url: "https://cafe.example.com",
              name: "Corner Cafe",
              snippets: ["Open until 6pm."],
            },
            map: [{ url: "https://map.example.com", name: "Cafe Row" }],
          },
          sources: {
            "https://cafe.example.com": {
              hostname: "cafe.example.com",
              age: ["2026-02-02"],
            },
            "https://map.example.com": { hostname: "map.example.com" },
          },
        },
      },
    );

    assert.match(
      text,
      /## Point of interest: Corner Cafe\nhttps:\/\/cafe\.example\.com\nDate: 2026-02-02/,
    );
    assert.match(text, /- Open until 6pm\./);
    assert.match(text, /## Map result: Cafe Row\nhttps:\/\/map\.example\.com/);
    assert.deepEqual(
      result.details.sources.map((source: any) => source.url),
      ["https://map.example.com", "https://cafe.example.com"],
    );
  });

  it("reports an empty result set", async () => {
    const { text } = await runTool({ query: "nothing" }, { json: {} });

    assert.equal(text, "No web-search results found.");
  });

  it("bounds large output and explains the truncation", async () => {
    const { text } = await runTool(
      { query: "huge" },
      {
        json: {
          grounding: {
            generic: Array.from({ length: 200 }, (_, i) => ({
              url: `https://example.com/${i}`,
              title: `Result ${i}`,
              snippets: ["x".repeat(1000)],
            })),
          },
          sources: {},
        },
      },
    );

    assert.ok(Buffer.byteLength(text, "utf8") <= 50 * 1024 + 200);
    assert.match(text, /\[web-search output truncated to 51200 bytes\./);
    assert.match(text, /lower max_tokens, max_urls, or max_tokens_per_url/);
  });
});
