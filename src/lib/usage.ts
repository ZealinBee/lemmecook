import { useSyncExternalStore } from "react";
import { FREE_RECIPES_PER_MONTH } from "./plans";
import type { Recipe } from "./types";

const KEY = "lemme-cook:usage";

type Usage = { month: string; keys: string[] };

const monthOf = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** The same recipe opened twice in a month only counts once. */
const keyOf = (r: Pick<Recipe, "id" | "sourceUrl">) => r.sourceUrl ?? r.id;

function read(): Usage {
  try {
    const u = JSON.parse(localStorage.getItem(KEY) ?? "null") as Usage | null;
    if (u && u.month === monthOf()) return u;
  } catch {}
  return { month: monthOf(), keys: [] };
}

export function usedThisMonth() {
  return read().keys.length;
}

/** Whether a free user may open this recipe without going over the monthly allowance. */
export function canOpenFree(recipe: Pick<Recipe, "id" | "sourceUrl">) {
  const u = read();
  return u.keys.includes(keyOf(recipe)) || u.keys.length < FREE_RECIPES_PER_MONTH;
}

export function recordOpen(recipe: Pick<Recipe, "id" | "sourceUrl">) {
  const u = read();
  const key = keyOf(recipe);
  if (u.keys.includes(key)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ month: u.month, keys: [...u.keys, key] }));
    listeners.forEach((l) => l());
  } catch {}
}

/** First day of next month, when the free allowance resets. */
export function resetDate(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Recipes used this month, or undefined during SSR. */
export function useUsage() {
  return useSyncExternalStore(subscribe, usedThisMonth, () => undefined);
}
