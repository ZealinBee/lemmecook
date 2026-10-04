import type { Recipe } from "./types";

const KEY = "lemme-cook:recipes";
/** How many recipes are kept on the device. */
export const FREE_MAX = 20;
export const PREMIUM_MAX = 200;

export function parseAll(raw: string | null): Recipe[] {
  try {
    return JSON.parse(raw ?? "[]") as Recipe[];
  } catch {
    return [];
  }
}

function readAll(): Recipe[] {
  try {
    return parseAll(localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function listRecipes(): Recipe[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function getRecipe(id: string): Recipe | undefined {
  return readAll().find((r) => r.id === id);
}

export function saveRecipe(recipe: Recipe, max = FREE_MAX) {
  const rest = readAll().filter((r) => r.id !== recipe.id && (!recipe.sourceUrl || r.sourceUrl !== recipe.sourceUrl));
  try {
    localStorage.setItem(KEY, JSON.stringify([recipe, ...rest].slice(0, max)));
    emit();
  } catch {
    // Storage full or disabled — the recipe still works for this session via memory.
  }
}

/** Already saved on this device, so opening it again doesn't use up the free allowance. */
export function isSaved(recipe: Pick<Recipe, "id" | "sourceUrl">) {
  return readAll().some((r) => r.id === recipe.id || (!!recipe.sourceUrl && r.sourceUrl === recipe.sourceUrl));
}

export function removeRecipe(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(readAll().filter((r) => r.id !== id)));
    emit();
  } catch {}
}

// --- React binding (useSyncExternalStore) ---
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
export function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
export function snapshot(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
