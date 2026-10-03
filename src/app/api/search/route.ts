import { searchMeals } from "@/lib/mealdb";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 80) ?? "";
  if (!q.trim()) return Response.json({ recipes: [] });
  try {
    return Response.json({ recipes: await searchMeals(q) });
  } catch (err) {
    console.error("[search]", err);
    return Response.json({ error: "Recipe search is unavailable right now." }, { status: 502 });
  }
}
