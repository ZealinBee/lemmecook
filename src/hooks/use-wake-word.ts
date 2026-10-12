"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "lemme-cook:wake-word";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Whether voice commands must start with "chef". Off by default; remembered on this device. */
export function useWakeWord(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((next: boolean) => {
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  return [on, set];
}
