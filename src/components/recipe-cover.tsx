import type { Recipe } from "@/lib/types";
import { SparkIcon } from "./icons";

const FALLBACK = ["#d97757", "#788c5d", "#c8a07f", "#3f7d7a", "#a87b4f"];

function accentFor(recipe: Recipe) {
  if (recipe.accent) return recipe.accent;
  let h = 0;
  for (const c of recipe.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return FALLBACK[Math.abs(h) % FALLBACK.length];
}

/**
 * Photo when the recipe has one; otherwise an editorial color card with the
 * title set in serif, so built-in recipes look intentional rather than missing.
 */
export function RecipeCover({
  recipe,
  className = "",
  variant = "card",
}: {
  recipe: Recipe;
  className?: string;
  variant?: "thumb" | "card" | "hero" | "plain";
}) {
  if (recipe.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts
      <img src={recipe.image} alt="" loading="lazy" className={`bg-oat object-cover ${className}`} />
    );
  }

  const accent = accentFor(recipe);
  const words = recipe.title.split(" ");
  return (
    <div
      aria-hidden
      className={`relative isolate overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 85% 10%, color-mix(in oklab, ${accent} 70%, white) 0%, ${accent} 55%, color-mix(in oklab, ${accent} 75%, black) 100%)` }}
    >
      <SparkIcon
        className="absolute -right-[12%] -bottom-[18%] text-white/15"
        style={{ width: "70%", height: "auto" }}
      />
      {variant === "plain" ? null : variant === "thumb" ? (
        <span className="absolute inset-0 grid place-items-center font-serif text-2xl text-white/95 italic">
          {recipe.title.charAt(0)}
        </span>
      ) : (
        <span
          className={`absolute inset-x-0 bottom-0 p-4 font-serif leading-[1.02] tracking-[-0.02em] text-white ${
            variant === "hero" ? "text-[2.6rem] p-6" : "p-3 text-[1.2rem]"
          }`}
        >
          {words.slice(0, -1).join(" ")} <em className="italic">{words.at(-1)}</em>
        </span>
      )}
    </div>
  );
}
