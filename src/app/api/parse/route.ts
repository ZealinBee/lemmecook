import { extractRecipe } from "@/lib/parse-recipe";
import { extractRussianFood } from "@/lib/sites/russianfood";
import { fetchPost, linkInCaption, recipeFromPost, socialPlatform, tidyCaption, type Platform } from "@/lib/sites/social";
import { BROWSER_HEADERS, decodeHtml, fetchArchived, PRIVATE_HOST } from "@/lib/fetch-page";
import { canTranscribe, recipeFromVideo } from "@/lib/video-recipe";

/** Room for downloading and transcribing a video when the caption isn't enough. */
export const maxDuration = 60;

/** "/recipe/24074/alysias-basic-meat-lasagna/" → "alysias basic meat lasagna". */
function dishFromUrl(url: URL): string | undefined {
  const slug = url.pathname
    .split("/")
    .map((s) => decodeURIComponent(s).replace(/\.\w+$/, ""))
    .filter((s) => /[-_]/.test(s) && /[a-z]/i.test(s))
    .sort((a, b) => b.length - a.length)[0];
  const dish = slug
    ?.replace(/[-_]/g, " ")
    .replace(/\b(\d+|recipes?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return dish || undefined;
}

/** TikTok, Instagram and Facebook have no recipe markup: the recipe, if any, is in the caption. */
async function importPost(url: URL, platform: Platform): Promise<Response> {
  const post = await fetchPost(url, platform).catch(() => undefined);
  if (!post) {
    return Response.json(
      { error: `Couldn't read that ${platform} post. It may be private or deleted.`, suggestPaste: true },
      { status: 502 },
    );
  }
  const recipe = recipeFromPost(post, url.toString());
  if (recipe) return Response.json({ recipe });

  // "Full recipe on my blog: https://…" — the linked page usually has the real thing.
  const link = linkInCaption(post.caption);
  if (link && !PRIVATE_HOST.test(link.hostname)) {
    const res = await importPage(link);
    if (res.ok) return res;
  }

  // Last resort: listen to the video.
  if (canTranscribe(post)) {
    const fromVideo = await recipeFromVideo(post, url.toString());
    if (fromVideo) return Response.json({ recipe: fromVideo });
  }
  return Response.json(
    {
      error: `That ${platform} post doesn't write out the whole recipe. Here's its caption. Fill in what's missing from the video.`,
      suggestPaste: true,
      text: tidyCaption(post.caption),
    },
    { status: 422 },
  );
}

export async function POST(request: Request) {
  let url: URL;
  try {
    const body = (await request.json()) as { url?: string };
    url = new URL(String(body.url ?? "").trim());
  } catch {
    return Response.json({ error: "That doesn't look like a link." }, { status: 400 });
  }
  if (!/^https?:$/.test(url.protocol) || PRIVATE_HOST.test(url.hostname)) {
    return Response.json({ error: "Only public http(s) links are supported." }, { status: 400 });
  }

  const platform = socialPlatform(url);
  return platform ? importPost(url, platform) : importPage(url);
}

async function importPage(url: URL): Promise<Response> {
  let html: string;
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 404 || res.status === 410) {
      return Response.json({ error: "That page doesn't exist anymore. Check the link." }, { status: 502 });
    }
    if (!res.ok) {
      // 401/402/403/429/503 from a live page almost always means a bot wall, not a broken link.
      // The archived copy is usually readable, and the recipe rarely changes.
      const archived = await fetchArchived(url);
      const recipe = archived && (extractRecipe(archived, url.toString()) ?? extractRussianFood(archived, url.toString()));
      if (recipe) return Response.json({ recipe });
      return Response.json(
        { error: "This site doesn't let apps read its recipes.", suggestPaste: true, dish: dishFromUrl(url) },
        { status: 502 },
      );
    }
    html = decodeHtml(await res.arrayBuffer(), res.headers.get("content-type"));
  } catch {
    return Response.json({ error: "Couldn't reach that page. Check the link and try again." }, { status: 502 });
  }

  const recipe = extractRecipe(html, url.toString()) ?? extractRussianFood(html, url.toString());
  if (!recipe) {
    return Response.json(
      { error: "No recipe found on that page. Try the recipe's own page rather than a roundup.", suggestPaste: true },
      { status: 422 },
    );
  }
  return Response.json({ recipe });
}
