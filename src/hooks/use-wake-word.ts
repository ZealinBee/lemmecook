"use client";

import { useCallback, useSyncExternalStore } from "react";
import { WAKE_WORD } from "@/lib/voice-commands";

const ENABLED_KEY = "lemme-cook:wake-word";
const WORD_KEY = "lemme-cook:wake-word-custom";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((l) => l());
}

/** Lowercase letters, at most two words, so it can go straight into the recognizer's grammar. "" when unusable. */
export function normalizeWakeWord(raw: string): string {
  const words = raw
    .toLowerCase()
    .replace(/[^a-z' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const word = words.join(" ");
  return word.length >= 2 && word.length <= 24 ? word : "";
}

/**
 * Whether voice commands must start with a wake word, and which one. Off and "chef" by default; remembered
 * on this device. `custom` is set only when the cook picked their own (a Premium feature, enforced by the caller).
 */
export function useWakeWord() {
  const enabled = useSyncExternalStore(subscribe, () => get(ENABLED_KEY) === "1", () => false);
  const custom = useSyncExternalStore(subscribe, () => normalizeWakeWord(get(WORD_KEY) ?? ""), () => "");
  const setEnabled = useCallback((on: boolean) => set(ENABLED_KEY, on ? "1" : "0"), []);
  const setCustom = useCallback((raw: string) => set(WORD_KEY, normalizeWakeWord(raw)), []);
  return { enabled, setEnabled, custom, word: custom || WAKE_WORD, setCustom };
}
