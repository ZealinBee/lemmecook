import { fuzzyQuery } from "@/lib/fuzzy";
import { searchWeb } from "@/lib/web-search";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 80) ?? "";
  if (!q.trim()) return Response.json({ recipes: [] });
  try {
    const recipes = await searchWeb(q);
    if (!recipes.length) {
      const guess = await fuzzyQuery(q);
      if (guess) return Response.json({ query: guess, recipes: await searchWeb(guess) });
    }
    return Response.json({ query: q, recipes });
  } catch (err) {
    console.error("[search/web]", err);
    return Response.json({ error: "Web search is unavailable right now." }, { status: 502 });
  }
}
