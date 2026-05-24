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
import {
  generateImages,
  getImageModel,
  getImageModels,
  StringEnum,
} from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const MODEL_IDS = getImageModels("openrouter")
  .map((m) => m.id)
  .filter((id) => id !== "openrouter/auto") as [string, ...string[]];

const DEFAULT_MODEL = "google/gemini-2.5-flash-image";

export default function imageGenExtension(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (!process.env.OPENROUTER_API_KEY) {
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
      "Generate an image from a text prompt using an OpenRouter image model (Gemini, FLUX, GPT-5 Image, etc.). " +
      "Returns the image inline and saves it to disk. " +
      "Use when the user asks to create, draw, or generate an image.",
    promptSnippet:
      "Generate an image from a text prompt using an OpenRouter image model. " +
      "Returns the image inline and saves it to disk. Optionally specify a save path.",
    promptGuidelines: [
      "When calling generate_image, write detailed, descriptive prompts — more detail yields better results.",
    ],
    renderCall(args, theme) {
      const modelId = args.model ?? DEFAULT_MODEL;
      const header =
        theme.fg("toolTitle", theme.bold("generate_image")) +
        " " +
        theme.fg("muted", modelId);
      const body = `\n${theme.fg("dim", args.prompt)}`;
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
      save_path: Type.Optional(
        Type.String({
          description:
            "File path to save the image. Accepts absolute or relative paths. " +
            "Defaults to a timestamped filename in the current working directory (e.g. 'image-1234567890.png').",
        }),
      ),
    }),

    async execute(_toolCallId, params, signal, onUpdate) {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey)
        throw new Error("OPENROUTER_API_KEY environment variable is not set.");

      const modelId = params.model ?? DEFAULT_MODEL;

      onUpdate?.({
        content: [{ type: "text", text: `Generating image with ${modelId}…` }],
        details: { modelId, prompt: params.prompt, status: "generating" },
      });

      const model = getImageModel("openrouter", modelId);
      if (!model) throw new Error(`Unknown image model: ${modelId}`);

      const result = await generateImages(
        model,
        { input: [{ type: "text", text: params.prompt }] },
        { apiKey, signal },
      );

      if (result.stopReason === "error")
        throw new Error(result.errorMessage ?? "Image generation failed");
      if (result.stopReason === "aborted")
        throw new Error("Image generation was aborted");

      const imageBlock = result.output.find((b) => b.type === "image");
      const textBlock = result.output.find((b) => b.type === "text");

      if (!imageBlock || imageBlock.type !== "image")
        throw new Error("No image was returned by the model");

      const ext = imageBlock.mimeType.split("/")[1] ?? "png";
      const defaultFilename = `image-${Date.now()}.${ext}`;
      const rawPath = params.save_path ?? defaultFilename;
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
        content: [
          { type: "text", text: summaryParts.join("\n") },
          {
            type: "image",
            data: imageBlock.data,
            mimeType: imageBlock.mimeType,
          },
        ],
        details: {
          modelId,
          prompt: params.prompt,
          mimeType: imageBlock.mimeType,
          savedPath,
          usage: result.usage,
        },
      };
    },
  });
}
