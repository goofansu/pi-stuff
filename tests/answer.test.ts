import assert from "node:assert/strict";
import test from "node:test";
import { getModel } from "@earendil-works/pi-ai/compat";
import type { ModelRegistry } from "@earendil-works/pi-coding-agent";
import { extractQuestions } from "../extensions/answer.ts";

const codexModel = getModel("openai-codex", "gpt-5.6-luna");
assert.ok(codexModel);

const exeModel = {
  ...codexModel,
  provider: "exe-dev-openai",
  id: "gpt-5.6-luna@llm",
};

const currentModel = {
  ...codexModel,
  provider: "anthropic",
  id: "current-model",
};

function successfulResponse(question: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ questions: [{ question }] }),
      },
    ],
    stopReason: "stop" as const,
  };
}

function findPreferredModel(provider: string, id: string) {
  if (provider === exeModel.provider && id === exeModel.id) return exeModel;
  if (provider === codexModel.provider && id === codexModel.id) {
    return codexModel;
  }
  return undefined;
}

test("question extraction resolves the Codex model first", async () => {
  const attempts: string[] = [];
  const modelRegistry = {
    find: findPreferredModel,
    async getApiKeyAndHeaders() {
      return { ok: true as const };
    },
    async complete(model: typeof codexModel) {
      attempts.push(`${model.provider}/${model.id}`);
      return successfulResponse("Codex worked?");
    },
  } as unknown as ModelRegistry;

  const outcome = await extractQuestions(
    modelRegistry,
    currentModel,
    "Continue?",
  );

  assert.deepEqual(attempts, ["openai-codex/gpt-5.6-luna"]);
  assert.deepEqual(outcome, {
    status: "ok",
    result: { questions: [{ question: "Codex worked?" }] },
  });
});

test("question extraction resolves exe.dev when Codex has no auth", async () => {
  const attempts: string[] = [];
  const modelRegistry = {
    find: findPreferredModel,
    async getApiKeyAndHeaders(model: typeof codexModel) {
      return model.provider === "exe-dev-openai"
        ? { ok: true as const }
        : { ok: false as const, error: "not configured" };
    },
    async complete(model: typeof codexModel) {
      attempts.push(`${model.provider}/${model.id}`);
      return successfulResponse("exe.dev worked?");
    },
  } as unknown as ModelRegistry;

  const outcome = await extractQuestions(
    modelRegistry,
    currentModel,
    "Continue?",
  );

  assert.deepEqual(attempts, ["exe-dev-openai/gpt-5.6-luna"]);
  assert.deepEqual(outcome, {
    status: "ok",
    result: { questions: [{ question: "exe.dev worked?" }] },
  });
});

test("question extraction resolves the current model when preferred models are invalid", async () => {
  const attempts: string[] = [];
  const modelRegistry = {
    find: findPreferredModel,
    async getApiKeyAndHeaders() {
      return { ok: false as const, error: "not configured" };
    },
    async complete(model: typeof codexModel) {
      attempts.push(`${model.provider}/${model.id}`);
      return successfulResponse("Current model worked?");
    },
  } as unknown as ModelRegistry;

  const outcome = await extractQuestions(
    modelRegistry,
    currentModel,
    "Continue?",
  );

  assert.deepEqual(attempts, ["anthropic/current-model"]);
  assert.deepEqual(outcome, {
    status: "ok",
    result: { questions: [{ question: "Current model worked?" }] },
  });
});

test("question extraction does not retry after the selected model request fails", async () => {
  const attempts: string[] = [];
  const modelRegistry = {
    find: findPreferredModel,
    async getApiKeyAndHeaders() {
      return { ok: true as const };
    },
    async complete(model: typeof codexModel) {
      attempts.push(`${model.provider}/${model.id}`);
      return {
        content: [],
        stopReason: "error",
        errorMessage: "request failed",
      };
    },
  } as unknown as ModelRegistry;

  const outcome = await extractQuestions(
    modelRegistry,
    currentModel,
    "Continue?",
  );

  assert.deepEqual(attempts, ["openai-codex/gpt-5.6-luna"]);
  assert.deepEqual(outcome, {
    status: "error",
    message: "openai-codex/gpt-5.6-luna: request failed",
  });
});
