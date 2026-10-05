import "server-only";
import { BROWSER_HEADERS, decodeHtml } from "../fetch-page";
import { clean } from "../parse-recipe";
import { parseRecipeText } from "../parse-text";
import type { Recipe } from "../types";

type Parsed = Omit<Recipe, "id" | "savedAt">;

export type Platform = "TikTok" | "Instagram" | "Facebook";

/** A post's caption plus whatever else the platform tells us about it. */
export type Post = {
  platform: Platform;
  caption: string;
  author?: string;
  image?: string;
};

export function socialPlatform(url: URL): Platform | undefined {
  const host = url.hostname.replace(/^(www|m|vm|vt)\./, "");
  if (/(^|\.)tiktok\.com$/.test(host)) return "TikTok";
  if (/(^|\.)(instagram\.com|instagr\.am)$/.test(host)) return "Instagram";
  if (/(^|\.)(facebook\.com|fb\.watch|fb\.com)$/.test(host)) return "Facebook";
  return undefined;
}

const CRAWLER_HEADERS = { ...BROWSER_HEADERS, "User-Agent": "facebookexternalhit/1.1" };

async function get(url: string, headers: Record<string, string> = BROWSER_HEADERS) {
  const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return undefined;
  return { html: decodeHtml(await res.arrayBuffer(), res.headers.get("content-type")), url: res.url };
}

function meta(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content="([^"]*)"`, "i");
  return html.match(re)?.[1];
}

/** Undo JSON string escaping for a value pulled out of inline page data with a regex. */
function jsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

/** Keep line breaks; `clean` would collapse the whole caption onto one line. */
function cleanLines(text: string): string {
  return text
    .split(/\r?\n/)
    .map(clean)
    .join("\n")
    .trim();
}

async function tiktok(url: URL): Promise<Post | undefined> {
  // The page's inline data keeps the caption's line breaks; oEmbed flattens them.
  const page = await get(url.toString()).catch(() => undefined);
  const desc = page?.html.match(/"desc":"((?:[^"\\]|\\.)*)"/)?.[1];
  const cover = page?.html.match(/"(?:originCover|cover)":"((?:[^"\\]|\\.)*)"/)?.[1];
  const oembed = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(page?.url ?? url.toString())}`, {
    signal: AbortSignal.timeout(8_000),
  })
    .then((r) => (r.ok ? (r.json() as Promise<{ title?: string; author_name?: string; thumbnail_url?: string }>) : undefined))
    .catch(() => undefined);
  const caption = desc ? jsonString(desc) : oembed?.title;
  if (!caption) return undefined;
  return {
    platform: "TikTok",
    caption,
    author: oembed?.author_name,
    image: oembed?.thumbnail_url ?? (cover ? jsonString(cover) : undefined),
  };
}

async function instagram(url: URL): Promise<Post | undefined> {
  const code = url.pathname.match(/\/(?:p|reels?|tv)\/([\w-]+)/)?.[1];
  if (!code) return undefined;
  // The public embed page carries the full caption without a login wall.
  const page = await get(`https://www.instagram.com/p/${code}/embed/captioned/`).catch(() => undefined);
  const block = page?.html.match(/<div class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments"/i)?.[1];
  if (!block) return undefined;
  const author = clean(block.match(/class="CaptionUsername"[^>]*>([\s\S]*?)<\/a>/i)?.[1]) || undefined;
  const caption = cleanLines(
    block
      .replace(/<a class="CaptionUsername"[\s\S]*?<\/a>/i, "")
      .replace(/<br\s*\/?>/gi, "\n"),
  );
  const image = page?.html.match(/<img class="EmbeddedMediaImage"[^>]*src="([^"]+)"/i)?.[1];
  return { platform: "Instagram", caption, author, image: image && clean(image) };
}

async function facebook(url: URL): Promise<Post | undefined> {
  // Facebook only serves post metadata to link-preview crawlers.
  const page = await get(url.toString(), CRAWLER_HEADERS).catch(() => undefined);
  if (!page) return undefined;
  // Inline data has the untruncated text when it's there; og:description is the fallback.
  const message = page.html.match(/"message":\{"text":"((?:[^"\\]|\\.)*)"/)?.[1];
  const caption = message ? jsonString(message) : cleanLines(meta(page.html, "og:description") ?? "");
  if (!caption) return undefined;
  const title = clean(meta(page.html, "og:title"));
  return {
    platform: "Facebook",
    caption,
    // "2.8M views · 1.2K reactions | Caption… | Page name"
    author: title.split(" | ").at(-1)?.replace(/^Facebook$/, "") || undefined,
    image: clean(meta(page.html, "og:image")) || undefined,
  };
}

export async function fetchPost(url: URL, platform: Platform): Promise<Post | undefined> {
  if (platform === "TikTok") return tiktok(url);
  if (platform === "Instagram") return instagram(url);
  return facebook(url);
}

/** Calls to action that fill recipe captions but aren't part of the recipe. */
const CTA = [
  /\b(comment|dm|message)\b.{0,30}\b(recipe|link|me)\b/i,
  /\b(link|recipe)s? (is )?in (my )?bio\b/i,
  /^(full )?recipe (below|here|👇)/i,
  /\b(follow|save|share|like) (this|me|for|@)/i,
  /^(tag|send this to) /i,
  // Credits: "Recipe from @x", "Inspo: @y", "Thanks to Z for this recipe!"
  /^(inspo|inspired by|credit|thanks to|recipe by)\b/i,
  /\b(recipe|inspo|inspired|credit)s? (from|by)\s*@/i,
];

/** Hashtags, @mentions and emoji bullets out; the rest left for the text parser. */
export function tidyCaption(caption: string): string {
  // Captions flattened onto one line keep their breaks as runs of spaces.
  const text = caption.includes("\n") ? caption : caption.replace(/ {2,}/g, "\n");
  const isCta = (line: string) => CTA.some((re) => re.test(line));
  return (
    text
      .split("\n")
      // Before and after tidying: credits need their @handle, other CTAs hide behind emoji.
      .filter((line) => !isCta(line))
      .map((line) =>
        line
          .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "")
          .replace(/(^|\s)@[\w.]+/g, "")
          .replace(/^[\s\p{Extended_Pictographic}\p{Emoji_Modifier}\u{FE0F}\u{200D}▪▫◾◽■□●○◆◇➡→✔✅⭐️]+/gu, "")
          .trim(),
      )
      .filter((line) => !isCta(line))
      .join("\n")
  );
}

/** First http(s) link in the caption that points off the platform: usually the creator's blog. */
export function linkInCaption(caption: string): URL | undefined {
  for (const [raw] of caption.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
    try {
      const url = new URL(raw.replace(/[.,!?]+$/, ""));
      if (!socialPlatform(url)) return url;
    } catch {}
  }
  return undefined;
}

/** A recipe from the caption itself, if it spells one out. */
export function recipeFromPost(post: Post, sourceUrl: string): Parsed | null {
  const parsed = parseRecipeText(tidyCaption(post.caption));
  // An ingredient list with no method usually means "watch the video" — not enough to cook from.
  if (!parsed || !parsed.ingredients.length || !parsed.steps.length) return null;
  const handle = post.author && !post.author.includes(" ") ? `@${post.author}` : post.author;
  // Captions open with a hook, not a title. Keep it only if it reads like one.
  const first = parsed.title.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").trim();
  const title =
    first &&
    first.length <= 60 &&
    !/[.!?]$/.test(first) &&
    !/\b(makes|serves|servings?|prep|cook time|total time|minutes)\b/i.test(first) &&
    first !== "Untitled recipe"
      ? first
      : `${post.platform} recipe${handle ? ` from ${handle}` : ""}`;
  return {
    ...parsed,
    origin: "link",
    sourceUrl,
    siteName: post.platform,
    title,
    author: handle,
    image: post.image,
  };
}
