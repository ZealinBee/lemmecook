import { extractRecipe } from "@/lib/parse-recipe";

const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|\[?f[cd][0-9a-f]{2}:)/i;

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
    if (!res.ok) {
      return Response.json(
        { error: `The site responded with ${res.status}. It may block automated readers.` },
        { status: 502 },
      );
    }
    html = await res.text();
  } catch {
    return Response.json({ error: "Couldn't reach that page. Check the link and try again." }, { status: 502 });
  }

  const recipe = extractRecipe(html, url.toString());
  if (!recipe) {
    return Response.json(
      { error: "No recipe found on that page. Try the recipe's own page rather than a roundup." },
      { status: 422 },
    );
  }
  return Response.json({ recipe });
}
