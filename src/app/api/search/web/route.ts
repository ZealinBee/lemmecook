import { searchWeb } from "@/lib/web-search";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 80) ?? "";
  if (!q.trim()) return Response.json({ recipes: [] });
  try {
    return Response.json({ recipes: await searchWeb(q) });
  } catch (err) {
    console.error("[search/web]", err);
    return Response.json({ error: "Web search is unavailable right now." }, { status: 502 });
  }
}
