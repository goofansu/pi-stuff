/**
 * Image Generation Extension
 *
 * Registers a generate_image tool that lets the LLM generate images
 * via OpenRouter image models (Gemini, FLUX, GPT-5 Image, etc.).
 *
 * Requires:
 *   OPENROUTER_API_KEY — API key from https://openrouter.ai
 */

import { writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { builtinImagesModels } from "@earendil-works/pi-ai/providers/all";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

type ImageModel = { id: string };
type ImageOutputBlock =
  | { type: "image"; data: string; mimeType: string }
  | { type: "text"; text: string };
type ImageGenerationResult = {
  stopReason?: string;
  errorMessage?: string;
  output: ImageOutputBlock[];
  usage?: { cost: { total: number } };
};
type ImagesModels = {
  getModels(provider?: string): readonly ImageModel[];
  getModel(provider: string, id: string): ImageModel | undefined;
  getAuth(model: ImageModel): Promise<unknown | undefined>;
  generateImages(
    model: ImageModel,
    context: { input: { type: "text"; text: string }[] },
    options?: { signal?: AbortSignal },
  ): Promise<ImageGenerationResult>;
};

function StringEnum<T extends readonly string[]>(
  values: T,
  options?: { description?: string; default?: T[number] },
): ReturnType<typeof Type.Unsafe> {
  return Type.Unsafe({
    type: "string",
    enum: values,
    ...(options?.description ? { description: options.description } : {}),
    ...(options?.default ? { default: options.default } : {}),
  });
}

const imagesModels = builtinImagesModels() as ImagesModels;

const MODEL_IDS = imagesModels
  .getModels("openrouter")
  .map((m) => m.id)
  .filter((id) => id !== "openrouter/auto") as [string, ...string[]];

const DEFAULT_MODEL = "google/gemini-3.1-flash-image";

export default function imageGenExtension(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const defaultModel = imagesModels.getModel("openrouter", DEFAULT_MODEL);
    const auth = defaultModel
      ? await imagesModels.getAuth(defaultModel)
      : undefined;
    if (!auth) {
      ctx.ui.notify(
        "image-gen: OPENROUTER_API_KEY is not set — generate_image tool will fail.",
        "warning",
      );
    }
  });

  pi.registerTool({
    name: "generate_image",
    label: "Generate Image",
    description:
      "Generate an image from a text prompt using an OpenRouter image model (Gemini, FLUX, GPT-5 Image, etc.). Saves the image to disk and returns the file path.",
    promptSnippet:
      "Generate an image from a text prompt using an OpenRouter image model and save it to disk",
    promptGuidelines: [
      "Use generate_image when the user asks to create, draw, or generate an image. Write detailed, descriptive prompts — more detail yields better results — and tell the user the saved path.",
      "Do NOT use generate_image to edit or analyze existing images — it only generates from a text prompt.",
    ],
    renderCall(args, theme) {
      const modelId =
        typeof args.model === "string" ? args.model : DEFAULT_MODEL;
      const prompt = typeof args.prompt === "string" ? args.prompt : "";
      const header =
        theme.fg("toolTitle", theme.bold("generate_image")) +
        " " +
        theme.fg("muted", modelId);
      const body = `\n${theme.fg("dim", prompt)}`;
      return new Text(`${header}${body}`, 0, 0);
    },

    parameters: Type.Object({
      prompt: Type.String({
        description: "Detailed text description of the image to generate.",
      }),
      model: Type.Optional(
        StringEnum(MODEL_IDS, {
          description: `Image model to use. Defaults to ${DEFAULT_MODEL}.`,
        }),
      ),
      savePath: Type.Optional(
        Type.String({
          description:
            "File path to save the image. Accepts absolute or relative paths. " +
            "Defaults to a timestamped filename in the current working directory (e.g. 'image-1234567890.png').",
        }),
      ),
    }),

    async execute(_toolCallId, params, signal, onUpdate) {
      const modelId =
        typeof params.model === "string" ? params.model : DEFAULT_MODEL;
      const prompt = typeof params.prompt === "string" ? params.prompt : "";

      onUpdate?.({
        content: [{ type: "text", text: `Generating image with ${modelId}…` }],
        details: { modelId, prompt, status: "generating" },
      });

      const model = imagesModels.getModel("openrouter", modelId);
      if (!model) throw new Error(`Unknown image model: ${modelId}`);

      const auth = await imagesModels.getAuth(model);
      if (!auth) throw new Error("OPENROUTER_API_KEY is not set");

      const result = await imagesModels.generateImages(
        model,
        { input: [{ type: "text", text: prompt }] },
        { signal },
      );

      if (result.stopReason === "error")
        throw new Error(result.errorMessage ?? "Image generation failed");
      if (result.stopReason === "aborted")
        throw new Error("Image generation was aborted");

      const imageBlock = result.output.find((b) => b.type === "image");
      const textBlock = result.output.find((b) => b.type === "text");

      if (imageBlock?.type !== "image")
        throw new Error("No image was returned by the model");

      const ext = imageBlock.mimeType.split("/")[1] ?? "png";
      const defaultFilename = `image-${Date.now()}.${ext}`;
      const rawPath = params.savePath ?? defaultFilename;
      const filePath = isAbsolute(rawPath)
        ? rawPath
        : join(process.cwd(), rawPath);
      const buffer = Buffer.from(imageBlock.data, "base64");
      writeFileSync(filePath, buffer);
      const savedPath = filePath;

      const summaryParts: string[] = [];
      if (textBlock?.type === "text") summaryParts.push(textBlock.text);
      summaryParts.push(`Image saved to: ${savedPath}`);
      summaryParts.push(`Model: ${modelId}`);
      if (result.usage)
        summaryParts.push(`Cost: $${result.usage.cost.total.toFixed(4)}`);

      return {
        content: [{ type: "text", text: summaryParts.join("\n") }],
        details: {
          modelId,
          prompt,
          mimeType: imageBlock.mimeType,
          savedPath,
          usage: result.usage,
        },
      };
    },
  });
}
