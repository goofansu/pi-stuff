/**
 * Web Search Extension — Brave LLM Context grounding for pi.
 *
 * Registers a web-search tool that searches the web using Brave LLM Context and
 * returns extracted page content, snippets, structured data, and sources for
 * grounded answers. The main agent should use it for current information,
 * recent events, external facts, product/docs lookups, or anything that benefits
 * from web grounding. Also provides a /web-search command for direct use.
 *
 * Requires:
 *   BRAVE_SEARCH_API_KEY — API key from https://api.search.brave.com
 */

import { StringEnum, Type } from "@earendil-works/pi-ai";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { getMarkdownTheme, keyHint } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "@earendil-works/pi-tui";

const BRAVE_LLM_CONTEXT_ENDPOINT =
  "https://api.search.brave.com/res/v1/llm/context";

const FRESHNESS_PATTERN =
  /^(pd|pw|pm|py|\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2})$/;

interface SearchParams {
  query: string;
  count?: number;
  max_urls?: number;
  max_tokens?: number;
  max_tokens_per_url?: number;
  freshness?: string;
  threshold?: "strict" | "balanced" | "lenient";
  goggles?: string;
}

interface SearchSource {
  /** 1-based position shared with the numbered result entry for this source. */
  index: number;
  url: string;
  title?: string;
  hostname?: string;
  age?: unknown;
  date?: string;
}

interface BraveGroundingItem {
  url?: string;
  title?: string;
  name?: string;
  snippets?: unknown[];
}

interface BraveSourceMeta {
  title?: string;
  hostname?: string;
  age?: unknown;
}

interface BraveApiResponse {
  grounding?: {
    generic?: BraveGroundingItem[];
    map?: BraveGroundingItem[];
    poi?: BraveGroundingItem;
  };
  sources?: Record<string, BraveSourceMeta>;
}

type GroundingKind = "generic" | "poi" | "map";

const GROUNDING_KIND_PRIORITY: Record<GroundingKind, number> = {
  generic: 0,
  map: 1,
  poi: 2,
};

/**
 * One numbered grounding entry. Collection and rendering both walk this single
 * ordered, URL-deduplicated list so entry numbers and source numbers cannot
 * drift apart.
 */
interface GroundingEntry {
  index: number;
  kind: GroundingKind;
  item: BraveGroundingItem;
  meta: BraveSourceMeta;
  date?: string;
}

function mergeSnippets(
  left: unknown[] | undefined,
  right: unknown[] | undefined,
): unknown[] | undefined {
  const merged: unknown[] = [];
  const seenStrings = new Set<string>();

  for (const snippet of [...(left ?? []), ...(right ?? [])]) {
    if (typeof snippet === "string") {
      if (seenStrings.has(snippet)) continue;
      seenStrings.add(snippet);
    }
    merged.push(snippet);
  }

  return merged.length > 0 ? merged : undefined;
}

/**
 * Brave can represent one URL in multiple grounding collections. Consolidate
 * those records into one citable entry without dropping local-result labels or
 * snippets that only occur in the later POI/map record.
 */
function mergeGroundingEntry(
  entry: GroundingEntry,
  kind: GroundingKind,
  item: BraveGroundingItem,
): void {
  const preferIncomingKind =
    GROUNDING_KIND_PRIORITY[kind] > GROUNDING_KIND_PRIORITY[entry.kind];
  entry.kind = preferIncomingKind ? kind : entry.kind;
  entry.item = {
    url: entry.item.url ?? item.url,
    title: entry.item.title ?? item.title,
    name: preferIncomingKind
      ? (item.name ?? entry.item.name)
      : (entry.item.name ?? item.name),
    snippets: mergeSnippets(entry.item.snippets, item.snippets),
  };
}

interface SearchDetails {
  query: string;
  count: number;
  max_urls?: number;
  max_tokens: number;
  max_tokens_per_url?: number;
  freshness?: string;
  threshold: string;
  goggles?: string;
  /** Unique source URLs that actually returned grounding content. */
  returned_sources: number;
  sources: SearchSource[];
}

function truncateText(text: string, maxBytes = 50 * 1024): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  let truncated = text.slice(0, maxBytes);
  while (Buffer.byteLength(truncated, "utf8") > maxBytes)
    truncated = truncated.slice(0, -1);
  return `${truncated}\n\n[web-search output truncated to ${maxBytes} bytes. Refine the query, or lower max_tokens, max_urls, or max_tokens_per_url for a smaller result.]`;
}

function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  return Math.max(min, Math.min(max, n));
}

function optionalInt(
  value: unknown,
  min: number,
  max: number,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return clampInt(value, min, min, max);
}

/**
 * Brave reports `sources[url].age` as an array of renderings of the page's
 * most relevant date — e.g. ["Wednesday, January 15, 2025", "2025-01-15",
 * "392 days ago"], sometimes with an extra ISO date-time entry — or null. Brave
 * documents this as the page's *modification* date, so it is an approximate
 * publication signal, which is why it is labelled "Page date" downstream.
 *
 * Prefer the ISO-8601 entry and normalise it to YYYY-MM-DD so dates read
 * consistently everywhere regardless of how many renderings Brave sends, and
 * tolerate bare strings, missing values, and unexpected shapes without dropping
 * the source.
 */
function formatAge(age: unknown): string | undefined {
  const candidates = Array.isArray(age) ? age : [age];
  const strings = candidates
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (strings.length === 0) return undefined;
  const iso = strings.find((entry) => /^\d{4}-\d{2}-\d{2}/.test(entry));
  return iso ? iso.slice(0, 10) : strings[0];
}

/**
 * Flatten Brave's grounding container into one ordered list: generic results,
 * then the point of interest, then map results. Entries are consolidated by URL
 * and numbered once, so the numbers in the result body match the numbers in the
 * source list without losing content from duplicate POI/map records. Entries
 * without a URL stay in the body but cannot be cited.
 */
function collectEntries(data: BraveApiResponse): GroundingEntry[] {
  const grounding = data?.grounding;
  const poi = grounding?.poi;
  const candidates: Array<{ kind: GroundingKind; item?: BraveGroundingItem }> =
    [
      ...(grounding?.generic ?? []).map((item) => ({
        kind: "generic" as const,
        item,
      })),
      ...(poi ? [{ kind: "poi" as const, item: poi }] : []),
      ...(grounding?.map ?? []).map((item) => ({ kind: "map" as const, item })),
    ];

  const entries: GroundingEntry[] = [];
  const entryByUrl = new Map<string, GroundingEntry>();
  for (const { kind, item } of candidates) {
    if (!item) continue;
    if (item.url) {
      const existing = entryByUrl.get(item.url);
      if (existing) {
        mergeGroundingEntry(existing, kind, item);
        continue;
      }
    }
    const meta = (item.url ? data?.sources?.[item.url] : undefined) ?? {};
    const entry: GroundingEntry = {
      index: entries.length + 1,
      kind,
      item,
      meta,
      date: formatAge(meta.age),
    };
    entries.push(entry);
    if (item.url) entryByUrl.set(item.url, entry);
  }

  return entries;
}

function toSources(entries: GroundingEntry[]): SearchSource[] {
  return entries
    .filter((entry) => Boolean(entry.item.url))
    .map((entry) => ({
      index: entry.index,
      url: entry.item.url as string,
      title: entry.item.title ?? entry.item.name ?? entry.meta.title,
      hostname: entry.meta.hostname,
      age: entry.meta.age,
      date: entry.date,
    }));
}

function entryLabel(entry: GroundingEntry): string {
  const { item, kind, index } = entry;
  if (kind === "generic") return item.title || item.url || `Result ${index}`;
  const name = item.name ?? item.title ?? "Result";
  return kind === "poi" ? `Point of interest: ${name}` : `Map result: ${name}`;
}

function formatSnippetList(snippets: unknown): string {
  if (!Array.isArray(snippets) || snippets.length === 0) return "";
  return snippets
    .map((snippet) =>
      typeof snippet === "string" ? snippet.trim() : JSON.stringify(snippet),
    )
    .filter(Boolean)
    .map((snippet) => `- ${snippet}`)
    .join("\n");
}

/**
 * Render the numbered source list first, then the extracted content. Output is
 * truncated head-first, so leading with sources keeps citations attributable
 * even when a large result is cut short.
 */
function formatSearchResult(
  entries: GroundingEntry[],
  sources: SearchSource[],
): string {
  if (entries.length === 0) return "No web-search results found.";

  const sourceList =
    sources.length > 0
      ? sources
          .map(
            (source) =>
              `${source.index}. ${source.title ?? source.hostname ?? source.url}\n   ${source.url}${source.date ? `\n   Page date: ${source.date}` : ""}`,
          )
          .join("\n")
      : "No sources returned.";

  const header = [
    `## Sources (${sources.length} returned)`,
    sources.some((source) => source.date)
      ? "Page date is the date Brave reports for the page and may be a modification date rather than first publication."
      : "",
    sourceList,
  ]
    .filter(Boolean)
    .join("\n");

  const body = entries
    .map((entry) => {
      const heading = [
        `## ${entry.index}. ${entryLabel(entry)}`,
        entry.item.url ?? "",
        entry.date ? `Page date: ${entry.date}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const snippets = formatSnippetList(entry.item.snippets);
      return snippets ? `${heading}\n\n${snippets}` : heading;
    })
    .join("\n\n");

  return `${header}\n\n---\n\n${body}`;
}

async function braveLlmContext(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<{ text: string; details: SearchDetails }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error("BRAVE_SEARCH_API_KEY is not set");

  const query = params.query.trim();
  if (!query) throw new Error("query is required");
  if (query.length > 400)
    throw new Error("query must be at most 400 characters");
  if (query.split(/\s+/).length > 50)
    throw new Error("query must contain at most 50 words");

  const count = clampInt(params.count, 20, 1, 50);
  const maxTokens = clampInt(params.max_tokens, 8192, 1024, 32768);
  const threshold = params.threshold ?? "balanced";
  const goggles = params.goggles?.trim() || undefined;

  // Optional controls stay absent from the request so Brave's own defaults apply.
  const maxUrls = optionalInt(params.max_urls, 1, 50);
  const maxTokensPerUrl = optionalInt(params.max_tokens_per_url, 512, 8192);

  const freshness = params.freshness?.trim().toLowerCase() || undefined;
  if (freshness && !FRESHNESS_PATTERN.test(freshness)) {
    throw new Error(
      `freshness must be pd, pw, pm, py, or YYYY-MM-DDtoYYYY-MM-DD (got "${params.freshness}")`,
    );
  }

  const response = await fetch(BRAVE_LLM_CONTEXT_ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "X-Subscription-Token": apiKey,
    },
    body: JSON.stringify({
      q: query,
      count,
      maximum_number_of_tokens: maxTokens,
      context_threshold_mode: threshold,
      ...(maxUrls === undefined ? {} : { maximum_number_of_urls: maxUrls }),
      ...(maxTokensPerUrl === undefined
        ? {}
        : { maximum_number_of_tokens_per_url: maxTokensPerUrl }),
      ...(freshness ? { freshness } : {}),
      ...(goggles ? { goggles } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Brave LLM Context failed: ${response.status}${detail ? ` — ${detail.slice(0, 500)}` : ""}`,
    );
  }

  const data = (await response.json()) as BraveApiResponse;
  const entries = collectEntries(data);
  const sources = toSources(entries);
  return {
    text: truncateText(formatSearchResult(entries, sources)),
    details: {
      query,
      count,
      max_urls: maxUrls,
      max_tokens: maxTokens,
      max_tokens_per_url: maxTokensPerUrl,
      freshness,
      threshold,
      goggles,
      returned_sources: sources.length,
      sources,
    },
  };
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (!process.env.BRAVE_SEARCH_API_KEY) {
      ctx.ui.notify(
        "web-search: BRAVE_SEARCH_API_KEY is not set — web_search tool will fail.",
        "warning",
      );
    }
  });

  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description:
      "Search the web with Brave LLM Context and return extracted page content, snippets, and a ranked source list. Answers broad, current-fact, news, and research questions directly, with citable sources.",
    promptSnippet:
      "Search the web with Brave LLM Context and return extracted content plus sources",
    promptGuidelines: [
      "Use web_search as the default for questions you will answer and cite yourself — current information, recent events, external facts, product/docs lookups, or research that needs synthesis across several sources. Rewrite the request into a concise query, then cite the returned sources; pass goggles to boost, downrank, or restrict domains when the user wants specific or authoritative sources.",
      "Use freshness for 'latest', recent, and news requests (pd/pw/pm/py, or a YYYY-MM-DDtoYYYY-MM-DD range). Each result reports a 'Page date' from Brave — treat it as approximate, because it can be the page's last-modified date rather than its first publication date, and prefer a date stated in the page content when one matters.",
      "Use count for the candidate pool Brave ranks and max_urls for how many of those candidates may return content: at most min(count, max_urls) sources come back, and often fewer once Brave drops low-relevance pages. Budgets: simple lookup count=5, max_urls=3, max_tokens=2048; standard query count=20, max_tokens=8192; complex research count=50, max_urls=10, max_tokens=16384. Cap a verbose source with max_tokens_per_url so one page cannot dominate the context.",
      "Returned results already contain extracted page content. Do NOT scrape a returned URL unless the content needed to answer is absent, insufficient, or truncated.",
      "Do NOT repeat the same search or maximize count, max_urls, and token limits by default. Start with the task-sized budgets above; if results are weak, refine query, freshness, threshold, or goggles before broadening the candidate and context limits.",
    ],
    parameters: Type.Object({
      query: Type.String({
        minLength: 1,
        maxLength: 400,
        description:
          "Required web search query (1-400 characters, max 50 words).",
      }),
      count: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: 50,
          description:
            "Candidate pool width: how many search results Brave ranks before selecting context, 1-50. Default: 20. It does not set how many sources are returned — the returned sources are bounded by min(count, max_urls) and are often fewer. Use 5 for simple factual lookups, 20 for standard queries, and 50 for complex research.",
        }),
      ),
      max_urls: Type.Optional(
        Type.Integer({
          minimum: 1,
          maximum: 50,
          description:
            "Upper bound on how many ranked candidates contribute grounding content, 1-50. Brave's default is 20, so returned sources are bounded by min(count, max_urls) and can still be fewer when Brave drops low-relevance pages. Set below count (e.g. count=50, max_urls=10) to rank broadly while keeping returned context focused; use 3 for simple lookups. Omit to keep Brave's default.",
        }),
      ),
      max_tokens: Type.Optional(
        Type.Integer({
          minimum: 1024,
          maximum: 32768,
          description:
            "Total token budget across all returned sources, 1024-32768. Default: 8192. Use 2048 for simple factual lookups, 8192 for standard queries, and 16384 for complex research.",
        }),
      ),
      max_tokens_per_url: Type.Optional(
        Type.Integer({
          minimum: 512,
          maximum: 8192,
          description:
            "Per-source token budget, 512-8192. Brave's default is 4096. Lower it (e.g. 1024) so one verbose page cannot consume the whole token budget. Omit to keep Brave's default.",
        }),
      ),
      freshness: Type.Optional(
        Type.String({
          pattern: FRESHNESS_PATTERN.source,
          description:
            "Filter results by the date Brave reports for a page, which may be its publication or its last-modified date. Accepts pd (24 hours), pw (7 days), pm (31 days), py (365 days), or a custom range as YYYY-MM-DDtoYYYY-MM-DD (e.g. 2026-01-01to2026-03-31). Recommended for 'latest', recent, and news requests. Omit for timeless questions.",
        }),
      ),
      threshold: Type.Optional(
        StringEnum(["strict", "balanced", "lenient"] as const, {
          description:
            "Relevance threshold for included content. Default: balanced. Use strict when precision matters more than recall; use lenient when broader coverage is needed.",
        }),
      ),
      goggles: Type.Optional(
        Type.String({
          description:
            "Optional Brave Goggles URL or inline rules for custom ranking/filtering. Use to restrict, boost, downrank, or discard sources when the user asks for specific/authoritative sources. Inline syntax: $boost=N,site=example.com / $downrank=N,site=example.com (N is 1–10), or $discard,site=example.com. Separate multiple rules with %0A.",
        }),
      ),
    }),

    // Brave documents maximum_number_of_snippets_per_url, but live POST requests
    // currently return the same per-URL snippet counts for low, high, and omitted
    // values. Do not expose a control the service does not honor. Old recorded
    // max_snippets_per_url arguments remain harmless because extra properties are
    // ignored here and when rendering stored details.
    async execute(_toolCallId, params, signal) {
      const result = await braveLlmContext(params as SearchParams, signal);
      return {
        content: [{ type: "text", text: result.text }],
        details: result.details,
      };
    },

    renderCall(args, theme) {
      const query = String((args as SearchParams).query ?? "");
      const preview = query.length > 80 ? `${query.slice(0, 77)}...` : query;
      return new Text(
        theme.fg("toolTitle", theme.bold("web_search ")) +
          theme.fg("dim", preview),
        0,
        0,
      );
    },

    renderResult(result, { expanded, isPartial }, theme) {
      const details = result.details as
        | SearchDetails
        | { error?: string }
        | undefined;
      const isError = Boolean(details && "error" in details && details.error);
      const icon = isPartial
        ? theme.fg("warning", "⏳")
        : isError
          ? theme.fg("error", "✗")
          : theme.fg("success", "✓");
      const title = `${icon} ${theme.fg("toolTitle", theme.bold("web_search"))}`;

      if (expanded) {
        const container = new Container();
        container.addChild(
          new Text(
            title + (isError ? ` ${theme.fg("error", "[error]")}` : ""),
            0,
            0,
          ),
        );
        if (details && "query" in details) {
          container.addChild(new Spacer(1));
          container.addChild(
            new Text(theme.fg("muted", `Query: ${details.query}`), 0, 0),
          );
          container.addChild(
            new Text(
              theme.fg(
                "dim",
                `${details.sources.length} source(s) returned, count=${details.count}, max_urls=${details.max_urls ?? "default"}, max_tokens=${details.max_tokens}, max_tokens_per_url=${details.max_tokens_per_url ?? "default"}, freshness=${details.freshness ?? "unset"}, goggles=${details.goggles ? "yes" : "no"}`,
              ),
              0,
              0,
            ),
          );
        }
        container.addChild(new Spacer(1));
        const text = result.content[0];
        container.addChild(
          new Markdown(
            text?.type === "text" ? text.text : "",
            0,
            0,
            getMarkdownTheme(),
          ),
        );
        return container;
      }

      if (details && "query" in details) {
        const sourcePreview = details.sources
          .slice(0, 5)
          .map((source) => `→ ${source.hostname ?? source.title ?? source.url}`)
          .join("\n");
        return new Text(
          `${title} ${theme.fg("dim", `${details.sources.length} source(s) returned`)}${sourcePreview ? `\n${theme.fg("muted", sourcePreview)}` : ""}\n${theme.fg("muted", `(${keyHint("app.tools.expand", "to expand")})`)}`,
          0,
          0,
        );
      }

      const text = result.content[0];
      return new Text(
        `${title}\n${text?.type === "text" ? text.text : ""}`,
        0,
        0,
      );
    },
  });

  pi.registerCommand("web-search", {
    description:
      "Search the web with Brave LLM Context; the main agent rewrites the query and calls the web_search tool",
    handler: async (args, ctx: ExtensionContext) => {
      let request = args?.trim() || "";

      if (!request) {
        if (!ctx.hasUI) {
          ctx.ui.notify("Usage: /web-search <query>", "error");
          return;
        }

        const input = await ctx.ui.editor("What do you want to search?");
        if (!input?.trim()) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }
        request = input.trim();
      }

      pi.sendUserMessage(`Use the web_search tool to research: ${request}`, {
        deliverAs: "followUp",
      });
    },
  });
}
