import "server-only";

export const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|\[?f[cd][0-9a-f]{2}:)/i;

export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Honour the page's charset — older sites (e.g. russianfood.com) still serve windows-1251. */
export function decodeHtml(buf: ArrayBuffer, contentType: string | null): string {
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

/**
 * The Wayback Machine's newest good snapshot of a page, for sites that wall off non-browser requests
 * (e.g. allrecipes.com answers every server fetch with a 402). `id_` serves a capture's original HTML and
 * status untouched. Recent captures are often the wall itself; then the (slow) index finds the latest 200.
 */
export async function fetchArchived(url: URL): Promise<string | undefined> {
  const snapshot = async (stamp: string) => {
    const res = await fetch(`https://web.archive.org/web/${stamp}id_/${url}`, { signal: AbortSignal.timeout(15_000) });
    return res.ok ? decodeHtml(await res.arrayBuffer(), res.headers.get("content-type")) : undefined;
  };
  try {
    const latest = await snapshot(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
    if (latest) return latest;
    const index = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url.toString())}` +
        "&filter=statuscode:200&fl=timestamp&limit=-1&fastLatest=true",
      { signal: AbortSignal.timeout(20_000) },
    );
    const stamp = index.ok ? (await index.text()).trim() : "";
    return /^\d{14}$/.test(stamp) ? await snapshot(stamp) : undefined;
  } catch {
    return undefined;
  }
}
