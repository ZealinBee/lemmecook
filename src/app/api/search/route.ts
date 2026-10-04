import { fuzzyQuery } from "@/lib/fuzzy";
import { searchDish, searchMeals } from "@/lib/mealdb";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.slice(0, 80) ?? "";
  if (!q.trim()) return Response.json({ recipes: [] });
  try {
    // "loose": q came from a link we couldn't read, so it needs whittling down to the dish.
    if (params.has("loose")) return Response.json(await searchDish(q));
    const recipes = await searchMeals(q);
    if (!recipes.length) {
      // "mapotofu", "lasgna": try what they probably meant.
      const guess = await fuzzyQuery(q);
      if (guess) return Response.json({ query: guess, recipes: await searchMeals(guess) });
    }
    return Response.json({ query: q, recipes });
  } catch (err) {
    console.error("[search]", err);
    return Response.json({ error: "Recipe search is unavailable right now." }, { status: 502 });
  }
}
