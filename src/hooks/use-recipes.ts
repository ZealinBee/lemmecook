"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseAll, snapshot, subscribe } from "@/lib/storage";

/** Saved recipes, newest first. `ready` is false during SSR/hydration. */
export function useRecipes() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => undefined);
  const recipes = useMemo(
    () => (raw === undefined ? [] : parseAll(raw).sort((a, b) => b.savedAt - a.savedAt)),
    [raw],
  );
  return { recipes, ready: raw !== undefined };
}
