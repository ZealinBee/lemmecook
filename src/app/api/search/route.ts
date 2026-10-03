import { searchDish, searchMeals } from "@/lib/mealdb";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.slice(0, 80) ?? "";
  if (!q.trim()) return Response.json({ recipes: [] });
  try {
    // "loose": q came from a link we couldn't read, so it needs whittling down to the dish.
    if (params.has("loose")) return Response.json(await searchDish(q));
    return Response.json({ query: q, recipes: await searchMeals(q) });
  } catch (err) {
    console.error("[search]", err);
    return Response.json({ error: "Recipe search is unavailable right now." }, { status: 502 });
  }
}
