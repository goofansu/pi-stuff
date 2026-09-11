import assert from "node:assert/strict";
import test from "node:test";
import { getModel } from "@earendil-works/pi-ai/compat";
import type { ModelRegistry } from "@earendil-works/pi-coding-agent";
import { extractQuestions } from "../extensions/answer.ts";

test("question extraction falls back after the first model request fails", async () => {
  const codexModel = getModel("openai-codex", "gpt-5.6-luna");
  assert.ok(codexModel);

  const exeModel = {
    ...codexModel,
    provider: "exe-dev-openai",
    id: "gpt-5.6-luna@llm",
  };
  const attempts: string[] = [];
  const modelRegistry = {
    find(provider: string, id: string) {
      if (provider === codexModel.provider && id === codexModel.id) {
        return codexModel;
      }
      if (provider === exeModel.provider && id === exeModel.id) {
        return exeModel;
      }
      return undefined;
    },
    async getApiKeyAndHeaders() {
      return { ok: true as const };
    },
    async complete(model: typeof codexModel) {
      attempts.push(`${model.provider}/${model.id}`);
      if (model.provider === "openai-codex") {
        return {
          content: [],
          stopReason: "error",
          errorMessage: "No API key for provider: openai-codex",
        };
      }
      return {
        content: [
          {
            type: "text",
            text: '{"questions":[{"question":"Fallback worked?"}]}',
          },
        ],
        stopReason: "stop",
      };
    },
  } as unknown as ModelRegistry;

  const outcome = await extractQuestions(
    modelRegistry,
    "Do you want to continue?",
  );

  assert.deepEqual(attempts, [
    "openai-codex/gpt-5.6-luna",
    "exe-dev-openai/gpt-5.6-luna@llm",
  ]);
  assert.deepEqual(outcome, {
    status: "ok",
    result: { questions: [{ question: "Fallback worked?" }] },
  });
});
