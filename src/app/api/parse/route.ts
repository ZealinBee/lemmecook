import { extractRecipe } from "@/lib/parse-recipe";
import { extractRussianFood } from "@/lib/sites/russianfood";
import { BROWSER_HEADERS, decodeHtml, PRIVATE_HOST } from "@/lib/fetch-page";

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
