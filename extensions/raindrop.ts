/**
 * Raindrop Extension
 *
 * Registers a raindrop tool that lists, creates, or updates many Raindrop.io bookmarks and tags.
 *
 * Requires:
 *   RAINDROP_API_KEY - Raindrop.io API key or test token used as a Bearer token.
 */

import { StringEnum } from "@earendil-works/pi-ai";
import {
  type AgentToolResult,
  type ExtensionAPI,
  keyHint,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const RAINDROP_API_BASE_URL = "https://api.raindrop.io/rest/v1";
const RAINDROP_MAX_CREATE_ITEMS = 100;
const ERROR_BODY_LIMIT = 500;

const COMMANDS = [
  "list",
  "create",
  "update",
  "tags",
  "rename_tag",
  "merge_tags",
  "remove_tags",
] as const;

export type RaindropCommand = (typeof COMMANDS)[number];

export interface RaindropCollectionRef {
  $id: number;
}

export interface RaindropCreateItem {
  link: string;
  title?: string;
  excerpt?: string;
  note?: string;
  tags?: string[];
  important?: boolean;
  collection?: RaindropCollectionRef;
  cover?: string;
  type?: string;
  created?: string;
  pleaseParse?: Record<string, unknown>;
}

export interface RaindropUpdateBody {
  ids?: number[];
  important?: boolean;
  tags?: string[];
  replace?: string;
  media?: unknown[];
  cover?: string;
  collection?: RaindropCollectionRef;
}

export interface RaindropToolParams {
  command: RaindropCommand | string;
  items?: RaindropCreateItem[];
  collectionId?: number;
  search?: string;
  sort?: string;
  page?: number;
  perpage?: number;
  nested?: boolean;
  body?: RaindropUpdateBody;
}

export type RaindropValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export interface BuiltRaindropRequest {
  method: "GET" | "POST" | "PUT" | "DELETE";
  url: string;
  body?: unknown;
  count: number;
}

interface RaindropListItem {
  _id?: number | string;
  title?: string;
  link?: string;
  domain?: string;
  created?: string;
  lastUpdate?: string;
  type?: string;
  tags?: string[];
  important?: boolean;
  collection?: RaindropCollectionRef;
  collectionId?: number;
  excerpt?: string;
  note?: string;
  cover?: string;
}

interface RaindropApiResponse {
  result?: boolean;
  items?: unknown[];
  modified?: number;
}

interface RaindropTagItem {
  _id?: string;
  count?: number;
}

interface RaindropToolDetails {
  error?: string;
  command?: string;
  endpoint?: string;
  status?: number;
  count?: number;
  data?: RaindropApiResponse;
}

interface RaindropToolResult extends AgentToolResult<RaindropToolDetails> {
  isError: boolean;
}

function isCreateCommand(params: RaindropToolParams): boolean {
  return params.command === "create";
}

function isListCommand(params: RaindropToolParams): boolean {
  return params.command === "list";
}

function isUpdateCommand(params: RaindropToolParams): boolean {
  return params.command === "update";
}

function isTagsCommand(params: RaindropToolParams): boolean {
  return params.command === "tags";
}

function isRenameTagCommand(params: RaindropToolParams): boolean {
  return params.command === "rename_tag";
}

function isMergeTagsCommand(params: RaindropToolParams): boolean {
  return params.command === "merge_tags";
}

function isRemoveTagsCommand(params: RaindropToolParams): boolean {
  return params.command === "remove_tags";
}

function tagBodyTags(params: RaindropToolParams): string[] {
  return Array.isArray(params.body?.tags) ? params.body.tags : [];
}

function hasReplace(params: RaindropToolParams): boolean {
  return typeof params.body?.replace === "string" && params.body.replace !== "";
}

export function validateRaindropParams(
  params: RaindropToolParams,
): RaindropValidationResult {
  if (!COMMANDS.includes(params.command as RaindropCommand)) {
    return {
      ok: false,
      reason: `${params.command || "<empty>"} is not an allowed raindrop command`,
    };
  }

  if (isListCommand(params) || isTagsCommand(params)) {
    return { ok: true };
  } else if (isCreateCommand(params)) {
    if (!Array.isArray(params.items)) {
      return { ok: false, reason: "create requires items" };
    }
    if (params.items.length < 1) {
      return { ok: false, reason: "create requires at least 1 item" };
    }
    if (params.items.length > RAINDROP_MAX_CREATE_ITEMS) {
      return { ok: false, reason: "create accepts at most 100 items" };
    }
    return { ok: true };
  }

  if (isUpdateCommand(params)) {
    if (typeof params.collectionId !== "number") {
      return { ok: false, reason: "update requires collectionId" };
    }
    if (params.collectionId === 0) {
      return {
        ok: false,
        reason: "Raindrop batch update does not support collectionId 0",
      };
    }
    if (!params.body || typeof params.body !== "object") {
      return { ok: false, reason: "update requires body" };
    }
    return { ok: true };
  }

  if (isRenameTagCommand(params)) {
    if (tagBodyTags(params).length !== 1) {
      return { ok: false, reason: "rename_tag requires exactly one tag" };
    }
    if (!hasReplace(params)) {
      return { ok: false, reason: "rename_tag requires replace" };
    }
    return { ok: true };
  }

  if (isMergeTagsCommand(params)) {
    if (tagBodyTags(params).length < 1) {
      return { ok: false, reason: "merge_tags requires at least 1 tag" };
    }
    if (!hasReplace(params)) {
      return { ok: false, reason: "merge_tags requires replace" };
    }
    return { ok: true };
  }

  if (isRemoveTagsCommand(params)) {
    if (tagBodyTags(params).length < 1) {
      return { ok: false, reason: "remove_tags requires at least 1 tag" };
    }
    return { ok: true };
  }

  return {
    ok: false,
    reason: `${params.command || "<empty>"} is not an allowed raindrop command`,
  };
}

export function buildRaindropRequest(
  params: RaindropToolParams,
): BuiltRaindropRequest {
  if (params.command === "list") {
    const collectionId = params.collectionId ?? 0;
    const url = new URL(`${RAINDROP_API_BASE_URL}/raindrops/${collectionId}`);
    if (params.search) url.searchParams.set("search", params.search);
    if (typeof params.nested === "boolean") {
      url.searchParams.set("nested", String(params.nested));
    }
    if (params.sort) url.searchParams.set("sort", params.sort);
    if (typeof params.page === "number") {
      url.searchParams.set("page", String(params.page));
    }
    if (typeof params.perpage === "number") {
      url.searchParams.set("perpage", String(params.perpage));
    }

    return {
      method: "GET",
      url: url.toString(),
      count: 0,
    };
  }

  if (params.command === "create") {
    return {
      method: "POST",
      url: `${RAINDROP_API_BASE_URL}/raindrops`,
      body: { items: params.items ?? [] },
      count: params.items?.length ?? 0,
    };
  }

  if (params.command === "tags") {
    const collectionId = params.collectionId ?? 0;
    return {
      method: "GET",
      url: `${RAINDROP_API_BASE_URL}/tags/${collectionId}`,
      count: 0,
    };
  }

  if (
    params.command === "rename_tag" ||
    params.command === "merge_tags" ||
    params.command === "remove_tags"
  ) {
    const collectionId = params.collectionId ?? 0;
    const tags = tagBodyTags(params);
    return {
      method: params.command === "remove_tags" ? "DELETE" : "PUT",
      url: `${RAINDROP_API_BASE_URL}/tags/${collectionId}`,
      body: params.body ?? {},
      count: tags.length,
    };
  }

  const url = new URL(
    `${RAINDROP_API_BASE_URL}/raindrops/${params.collectionId}`,
  );
  if (params.search) url.searchParams.set("search", params.search);
  if (typeof params.nested === "boolean") {
    url.searchParams.set("nested", String(params.nested));
  }

  const ids = Array.isArray(params.body?.ids) ? params.body.ids : [];
  return {
    method: "PUT",
    url: url.toString(),
    body: params.body ?? {},
    count: ids.length,
  };
}

export function formatRaindropApiError(status: number, body: string): string {
  const trimmed = body.trim();
  const detail = trimmed ? ` - ${trimmed.slice(0, ERROR_BODY_LIMIT)}` : "";
  return `Raindrop API failed: ${status}${detail}`;
}

function isRaindropListItem(item: unknown): item is RaindropListItem {
  return typeof item === "object" && item !== null;
}

function isRaindropTagItem(item: unknown): item is RaindropTagItem {
  return typeof item === "object" && item !== null;
}

function trimString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatRaindropTagItem(item: RaindropTagItem): string | undefined {
  const name = trimString(item._id);
  if (!name) return undefined;
  return `${name} (${item.count ?? 0})`;
}

function formatRaindropListItem(item: RaindropListItem): string | undefined {
  const title = trimString(item.title);
  const tags = Array.isArray(item.tags)
    ? item.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .join(", ")
    : undefined;
  const fields = [
    item._id !== undefined && `   ID: ${item._id}`,
    trimString(item.link) && `   Link: ${trimString(item.link)}`,
    tags && `   Tags: ${tags}`,
    trimString(item.excerpt) && `   Excerpt: ${trimString(item.excerpt)}`,
    trimString(item.note) && `   Note: ${trimString(item.note)}`,
  ].filter(
    (field): field is string => typeof field === "string" && field.length > 0,
  );

  if (!title && fields.length === 0) return undefined;
  if (!title) {
    return fields
      .map((field, index) => (index === 0 ? field.replace(/^ {3}/, "") : field))
      .join("\n");
  }

  return [title, ...fields].join("\n");
}

function expandHint(): string {
  try {
    return keyHint("app.tools.expand", "to expand");
  } catch {
    return "Ctrl+O to expand";
  }
}

export function formatRaindropSuccess(
  command: RaindropCommand,
  data: RaindropApiResponse,
): string {
  if (command === "list") {
    const summary = `Found ${data.items?.length ?? 0} raindrop(s).`;
    const items = (data.items ?? [])
      .filter(isRaindropListItem)
      .map(formatRaindropListItem)
      .filter((item): item is string => item !== undefined)
      .map((item, index) => `${index + 1}. ${item}`);

    return items.length > 0 ? `${summary}\n\n${items.join("\n")}` : summary;
  }
  if (command === "tags") {
    const summary = `Found ${data.items?.length ?? 0} tag(s).`;
    const items = (data.items ?? [])
      .filter(isRaindropTagItem)
      .map(formatRaindropTagItem)
      .filter((item): item is string => item !== undefined)
      .map((item, index) => `${index + 1}. ${item}`);

    return items.length > 0 ? `${summary}\n\n${items.join("\n")}` : summary;
  }
  if (command === "create") {
    return `Created/imported ${data.items?.length ?? 0} raindrop(s).`;
  }
  if (
    command === "rename_tag" ||
    command === "merge_tags" ||
    command === "remove_tags"
  ) {
    return "Updated tag(s).";
  }
  return `Updated ${data.modified ?? 0} raindrop(s).`;
}

export async function executeRaindropTool(
  params: RaindropToolParams,
  signal?: AbortSignal,
): Promise<RaindropToolResult> {
  const validation = validateRaindropParams(params);
  if (!validation.ok) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: validation.reason }],
      details: { error: validation.reason },
    };
  }

  const apiKey = process.env.RAINDROP_API_KEY;
  if (!apiKey) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "RAINDROP_API_KEY is not set" }],
      details: { error: "RAINDROP_API_KEY is not set" },
    };
  }

  const request = buildRaindropRequest(params);
  const init: RequestInit = {
    method: request.method,
    signal,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };
  if (request.body !== undefined) init.body = JSON.stringify(request.body);

  const response = await fetch(request.url, init);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = formatRaindropApiError(response.status, body).replaceAll(
      apiKey,
      "[redacted]",
    );
    return {
      isError: true,
      content: [{ type: "text" as const, text: error }],
      details: {
        command: params.command,
        endpoint: request.url,
        status: response.status,
        count: request.count,
        error,
      },
    };
  }

  const data = (await response.json()) as RaindropApiResponse;
  const command = params.command as RaindropCommand;
  const text = formatRaindropSuccess(command, data);
  return {
    isError: false,
    content: [{ type: "text" as const, text }],
    details: {
      command,
      endpoint: request.url,
      status: response.status,
      count:
        command === "list" || command === "create"
          ? (data.items?.length ?? request.count)
          : (data.modified ?? request.count),
      data,
    },
  };
}

const CollectionRefSchema = Type.Object({
  $id: Type.Number({
    description: "Raindrop collection id.",
  }),
});

const CreateItemSchema = Type.Object({
  link: Type.String({
    description: "Bookmark URL. Required for create.",
  }),
  title: Type.Optional(Type.String({ description: "Bookmark title." })),
  excerpt: Type.Optional(Type.String({ description: "Bookmark excerpt." })),
  note: Type.Optional(Type.String({ description: "Bookmark note." })),
  tags: Type.Optional(Type.Array(Type.String({ description: "Tag name." }))),
  important: Type.Optional(
    Type.Boolean({ description: "Whether the bookmark is marked favorite." }),
  ),
  collection: Type.Optional(CollectionRefSchema),
  cover: Type.Optional(Type.String({ description: "Cover image URL." })),
  type: Type.Optional(Type.String({ description: "Raindrop item type." })),
  created: Type.Optional(
    Type.String({ description: "Creation timestamp accepted by Raindrop." }),
  ),
  pleaseParse: Type.Optional(
    Type.Record(Type.String(), Type.Unknown(), {
      description: "Optional Raindrop parsing options.",
    }),
  ),
});

const UpdateBodySchema = Type.Object({
  ids: Type.Optional(Type.Array(Type.Number({ description: "Raindrop id." }))),
  important: Type.Optional(
    Type.Boolean({ description: "Set or unset favorite status." }),
  ),
  tags: Type.Optional(Type.Array(Type.String({ description: "Tag name." }))),
  replace: Type.Optional(Type.String({ description: "Replacement tag name." })),
  media: Type.Optional(
    Type.Array(Type.Unknown({ description: "Media item to append." })),
  ),
  cover: Type.Optional(
    Type.String({
      description:
        "Cover URL, or <screenshot> to set screenshots for matching raindrops.",
    }),
  ),
  collection: Type.Optional(CollectionRefSchema),
});

export default function raindropExtension(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    if (!process.env.RAINDROP_API_KEY) {
      ctx.ui.notify(
        "raindrop: RAINDROP_API_KEY is not set - raindrop tool will fail.",
        "warning",
      );
    }
  });

  pi.registerTool({
    name: "raindrop",
    label: "Raindrop",
    description:
      "A Raindrop.io batch bookmark and tag tool to list, create, update, rename, merge, or remove items.",
    promptSnippet:
      "List, create, update, rename, merge, or remove Raindrop.io data",
    promptGuidelines: [
      "Use raindrop with command=list when the user wants to find existing Raindrop bookmarks. Default to collectionId 0 with a search query for broad multi-item lookups.",
      "Use raindrop with command=create when the user wants to save new bookmarks to Raindrop. Provide 1-100 items; each item must include link and may include title, excerpt, note, tags, important, collection, cover, type, created, or pleaseParse.",
      "Use raindrop with command=update when the user wants to modify existing Raindrop bookmarks. Always constrain the target set with body.ids or an intentional search query.",
      "Use raindrop with command=tags when the user wants to list tags. Omit collectionId, or set collectionId to limit tags to one collection.",
      "Use raindrop with command=rename_tag with body.tags containing exactly one tag and body.replace containing the new tag name.",
      "Use raindrop with command=merge_tags with body.tags containing source tags and body.replace containing the destination tag name.",
      "Use raindrop with command=remove_tags with body.tags containing the tags to remove.",
      "The raindrop tool only accepts structured input: set command to list, create, update, tags, rename_tag, merge_tags, or remove_tags; put create records in items; and put bookmark/tag update fields in body.",
      "Do NOT use raindrop for deleting bookmarks, and do NOT use collectionId 0 for bookmark update because Raindrop batch update does not support it.",
    ],
    parameters: Type.Object({
      command: StringEnum(COMMANDS, {
        description:
          "Operation to perform: list, create, update, tags, rename_tag, merge_tags, or remove_tags.",
      }),
      items: Type.Optional(
        Type.Array(CreateItemSchema, {
          description: "Create items. Required for command=create. Max 100.",
        }),
      ),
      collectionId: Type.Optional(
        Type.Number({
          description:
            "Collection id. Required for command=update. Optional for tag commands. Do not use 0 for update.",
        }),
      ),
      search: Type.Optional(
        Type.String({
          description:
            "Optional Raindrop search query for command=list or to constrain command=update.",
        }),
      ),
      sort: Type.Optional(
        Type.String({
          description:
            "Optional sort for command=list, such as -created, created, title, -title, domain, or -domain.",
        }),
      ),
      page: Type.Optional(
        Type.Number({
          description: "Optional zero-based page number for command=list.",
        }),
      ),
      perpage: Type.Optional(
        Type.Number({
          description:
            "Optional page size for command=list. Raindrop max is 50.",
        }),
      ),
      nested: Type.Optional(
        Type.Boolean({
          description:
            "When true, list or update also considers bookmarks in nested collections.",
        }),
      ),
      body: Type.Optional(UpdateBodySchema),
    }),
    async execute(_toolCallId, params, signal) {
      return executeRaindropTool(params as RaindropToolParams, signal);
    },
    renderCall(args, theme) {
      const params = args as RaindropToolParams;
      const summary =
        params.command === "list"
          ? `list collection ${params.collectionId ?? 0}`
          : params.command === "create"
            ? `create ${params.items?.length ?? 0} item(s)`
            : params.command === "update"
              ? `update collection ${params.collectionId ?? "?"}`
              : params.command === "tags"
                ? `tags collection ${params.collectionId ?? 0}`
                : `${params.command} collection ${params.collectionId ?? 0}`;
      return new Text(
        `${theme.fg("toolTitle", theme.bold("raindrop "))}${theme.fg("dim", summary)}`,
        0,
        0,
      );
    },
    renderResult(result, { expanded }, theme, context) {
      const isError =
        context.isError || (result as { isError?: boolean }).isError === true;
      const icon = isError ? theme.fg("error", "✗") : theme.fg("success", "✓");
      const title = `${icon} ${theme.fg("toolTitle", theme.bold("raindrop"))}`;
      const text = result.content[0];
      const content = text?.type === "text" ? text.text : "";
      const details = result.details as RaindropToolDetails | undefined;

      if (
        !expanded &&
        !isError &&
        details?.command === "list" &&
        content.includes("\n")
      ) {
        const summary = content.split("\n", 1)[0] ?? "";
        return new Text(
          `${title}\n${summary}\n${theme.fg("dim", `(${expandHint()})`)}`,
          0,
          0,
        );
      }

      return new Text(`${title}\n${content}`, 0, 0);
    },
  });
}
