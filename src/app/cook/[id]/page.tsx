import type { Metadata } from "next";
import { CookView } from "@/components/cook-view";
import { getDefaultRecipe } from "@/lib/default-recipes";
import { SITE_NAME, SITE_OPEN_GRAPH, SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/cook/[id]">): Promise<Metadata> {
  const { id } = await params;
  const recipe = getDefaultRecipe(id);
  // Imported recipes live only in the cook's browser, so there's nothing for a crawler to see.
  if (!recipe) return { title: "Cook", robots: { index: false } };
  const title = `${recipe.title}: cook it hands-free`;
  const description = `Cook ${recipe.title} step by step with voice control. Say “next”, set timers by voice and hear each step read aloud.`;
  const images = recipe.image ? [{ url: recipe.image, alt: recipe.title }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/cook/${id}` },
    openGraph: { ...SITE_OPEN_GRAPH, type: "article", title, description, url: `/cook/${id}`, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function CookPage({ params }: PageProps<"/cook/[id]">) {
  const { id } = await params;
  const recipe = getDefaultRecipe(id);
  const jsonLd = recipe && {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    image: recipe.image && [`${SITE_URL}${recipe.image}`],
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    recipeYield: recipe.yield,
    prepTime: recipe.prepMinutes ? `PT${recipe.prepMinutes}M` : undefined,
    cookTime: recipe.cookMinutes ? `PT${recipe.cookMinutes}M` : undefined,
    totalTime: recipe.totalMinutes ? `PT${recipe.totalMinutes}M` : undefined,
    keywords: recipe.tags?.join(", "),
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.steps.map((s) => ({ "@type": "HowToStep", text: s.text })),
  };
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <CookView id={id} />
    </>
  );
}
