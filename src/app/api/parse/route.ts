import { extractRecipe } from "@/lib/parse-recipe";
import { extractRussianFood } from "@/lib/sites/russianfood";

const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|\[?f[cd][0-9a-f]{2}:)/i;

/** Honour the page's charset — older sites (e.g. russianfood.com) still serve windows-1251. */
function decodeHtml(buf: ArrayBuffer, contentType: string | null): string {
  const sniff = new TextDecoder("latin1").decode(buf.slice(0, 4096));
  const charset =
    contentType?.match(/charset=["']?([\w-]+)/i)?.[1] ??
    sniff.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 404 || res.status === 410) {
      return Response.json({ error: "That page doesn't exist anymore. Check the link." }, { status: 502 });
    }
    if (!res.ok) {
      // 401/402/403/429/503 from a live page almost always means a bot wall, not a broken link.
      return Response.json(
        { error: "This site doesn't let apps read its pages.", tryInBrowser: true },
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
      // Could be a roundup, or a page that only renders its recipe with JavaScript.
      { error: "No recipe found on that page. Try the recipe's own page rather than a roundup.", tryInBrowser: true },
      { status: 422 },
    );
  }
  return Response.json({ recipe });
}
