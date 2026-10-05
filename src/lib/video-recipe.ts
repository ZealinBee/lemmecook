import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Post } from "./sites/social";
import type { Recipe } from "./types";

type Parsed = Omit<Recipe, "id" | "savedAt">;

/** Groq's upload limit on the free tier; recipe videos are a few MB. */
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export function canTranscribe(post: Post): boolean {
  return !!post.video && !!process.env.GROQ_API_KEY && !!process.env.ANTHROPIC_API_KEY;
}

async function download(video: NonNullable<Post["video"]>): Promise<Blob | undefined> {
  const res = await fetch(video.url, { headers: video.headers, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return undefined;
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > MAX_VIDEO_BYTES) return undefined;
  const blob = await res.blob();
  return blob.size && blob.size <= MAX_VIDEO_BYTES ? blob : undefined;
}

/** Speech in the video, as plain text. Groq's Whisper accepts the mp4 as-is. */
async function transcribe(video: Blob): Promise<string | undefined> {
  const form = new FormData();
  form.append("file", video, "video.mp4");
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "text");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    console.error("[video-recipe] transcription failed", res.status, await res.text().catch(() => ""));
    return undefined;
  }
  return (await res.text()).trim() || undefined;
}

const RecipeSchema = z.object({
  isRecipe: z.boolean().describe("False if the video doesn't actually show how to make a dish."),
  title: z.string().describe("Short dish name, e.g. 'Baked feta pasta'. No emoji."),
  description: z.string().nullable().describe("One sentence about the dish, or null."),
  servings: z.string().nullable().describe("e.g. 'Serves 4', only if stated."),
  totalMinutes: z.number().int().nullable().describe("Total time in minutes, only if stated."),
  ingredients: z.array(z.string()).describe("One per item with quantity first, e.g. '2 pints cherry tomatoes'."),
  steps: z.array(z.string()).describe("Method in order, one action per step, written as instructions."),
});

const SYSTEM = `You turn cooking videos into recipes a home cook can follow step by step.
You get the post's caption and a transcript of what's said in the video. Combine them: the caption often lists ingredients, the voiceover usually explains the method.
- Use only what the caption or transcript says. Never invent quantities, temperatures or times; leave a quantity out if it isn't given.
- Write steps as clear instructions ("Bake at 400°F for 40 minutes"), not narration ("so now I'm just gonna pop it in").
- Drop chatter, sponsor reads, and calls to follow, like or comment.
- Keep the language of the video.`;

const client = new Anthropic();

/** Transcribe the post's video and have Claude write the recipe it describes. */
export async function recipeFromVideo(post: Post, sourceUrl: string): Promise<Parsed | null> {
  if (!post.video) return null;
  const video = await download(post.video).catch(() => undefined);
  const transcript = video && (await transcribe(video).catch(() => undefined));
  if (!transcript) return null;

  let parsed: z.infer<typeof RecipeSchema> | null;
  try {
    const response = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `<caption>\n${post.caption}\n</caption>\n\n<transcript>\n${transcript}\n</transcript>`,
        },
      ],
      output_config: { format: zodOutputFormat(RecipeSchema) },
    });
    parsed = response.stop_reason === "end_turn" ? response.parsed_output : null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error("[video-recipe] Claude error", err.status, err.message);
    else console.error("[video-recipe]", err);
    return null;
  }
  if (!parsed?.isRecipe || !parsed.ingredients.length || !parsed.steps.length) return null;

  const handle = post.author && !post.author.includes(" ") ? `@${post.author}` : post.author;
  return {
    origin: "link",
    sourceUrl,
    siteName: post.platform,
    title: parsed.title || `${post.platform} recipe`,
    description: parsed.description ?? undefined,
    image: post.image,
    author: handle,
    yield: parsed.servings ?? undefined,
    totalMinutes: parsed.totalMinutes ?? undefined,
    ingredients: parsed.ingredients,
    steps: parsed.steps.map((text) => ({ text })),
  };
}
