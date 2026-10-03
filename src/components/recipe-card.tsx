import type { Recipe } from "@/lib/types";
import { formatMinutes } from "@/lib/voice-commands";
import { ClockIcon } from "./icons";
import { RecipeCover } from "./recipe-cover";

function Meta({ recipe }: { recipe: Recipe }) {
  const time = formatMinutes(recipe.totalMinutes);
  const servings = recipe.yield && /^\d+$/.test(recipe.yield) ? `${recipe.yield} servings` : recipe.yield;
  return (
    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted">
      {time ? (
        <>
          <ClockIcon width={12} height={12} /> {time}
        </>
      ) : (
        recipe.description ?? recipe.siteName
      )}
      {time && servings && <span aria-hidden>·</span>}
      {time && servings}
    </p>
  );
}

/** Tall card for horizontal carousels and grids. */
export function RecipeCard({
  recipe,
  onOpen,
  className = "",
}: {
  recipe: Recipe;
  onOpen: (r: Recipe) => void;
  className?: string;
}) {
  return (
    <button onClick={() => onOpen(recipe)} className={`group text-left active:scale-[0.98] transition ${className}`}>
      <RecipeCover recipe={recipe} className="aspect-[4/5] w-full rounded-3xl" />
      <p className="mt-2.5 line-clamp-2 font-serif text-[1.05rem] leading-tight">{recipe.title}</p>
      <Meta recipe={recipe} />
    </button>
  );
}

/** Compact list row. */
export function RecipeRow({
  recipe,
  onOpen,
  trailing,
}: {
  recipe: Recipe;
  onOpen: (r: Recipe) => void;
  trailing?: React.ReactNode;
}) {
  return (
    <li className="flex items-center">
      <button onClick={() => onOpen(recipe)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left active:bg-paper">
        <RecipeCover recipe={recipe} variant="thumb" className="size-14 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <p className="truncate font-serif text-[1.1rem] leading-tight">{recipe.title}</p>
          <Meta recipe={recipe} />
        </div>
      </button>
      {trailing}
    </li>
  );
}
