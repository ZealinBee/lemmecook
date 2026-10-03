"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function synth(): SpeechSynthesis | undefined {
  return typeof window !== "undefined" ? window.speechSynthesis : undefined;
}

/** Prefer the nicer voices browsers ship (Google, Apple "Enhanced", Edge "Natural") in the given language. */
function pickVoice(want?: string): SpeechSynthesisVoice | undefined {
  const voices = synth()?.getVoices() ?? [];
  const nav = (typeof navigator !== "undefined" ? navigator.language : "en-US").toLowerCase();
  const base = (want ?? nav).toLowerCase().split("-")[0];
  // The user's own regional variant if it matches (en-GB for a British user), else any.
  const lang = nav.startsWith(base) ? nav : base;
  const inLang = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(base));
  if (!inLang.length && want) return undefined; // let the browser fall back via utterance.lang
  const pool = inLang.length ? inLang : voices;
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase().replace("_", "-") === lang ? 4 : 0) +
    (/natural|neural|enhanced|premium/i.test(v.name) ? 3 : 0) +
    (/google|samantha|daniel|karen|moira/i.test(v.name) ? 2 : 0) +
    (v.default ? 1 : 0);
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

/** Chrome silently cuts utterances off after ~15s, so speak a sentence at a time. Keeps "1.5" together. */
function chunks(text: string): string[] {
  return text.split(/(?<=[.!?;。！？])\s+/).map((s) => s.trim()).filter(Boolean);
}

const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];

/** Free, on-device text to speech via the browser's Web Speech API. Speaks only when `speak` is called. */
export function useSpeech() {
  const supported = useSyncExternalStore(noopSubscribe, () => Boolean(synth()), () => false);
  const [speaking, setSpeaking] = useState(false);
  // Best voice per language, rebuilt when the browser's voice list loads.
  const voices = useRef(new Map<string, SpeechSynthesisVoice | undefined>());
  // What we last said and when we stopped, so the mic can ignore our own voice.
  const spoken = useRef({ text: "", until: 0 });
  // Chrome garbage-collects unreferenced utterances and then never fires their onend.
  const queue = useRef<SpeechSynthesisUtterance[]>([]);

  useEffect(() => {
    const s = synth();
    if (!s) return;
    const load = () => voices.current.clear();
    s.addEventListener("voiceschanged", load);
    return () => {
      s.removeEventListener("voiceschanged", load);
      s.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    synth()?.cancel();
    setSpeaking(false);
    spoken.current.until = Date.now() + 800;
  }, []);

  /** `lang` is the text's language ("ru", "de"…); omit to use the browser's. */
  const speak = useCallback((text: string, lang?: string) => {
    const s = synth();
    if (!s || !text.trim()) return;
    s.cancel();
    const key = lang ?? "";
    if (!voices.current.has(key)) voices.current.set(key, pickVoice(lang));
    const voice = voices.current.get(key);
    spoken.current = { text, until: Number.POSITIVE_INFINITY };
    const parts = chunks(text);
    queue.current = [];
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else if (lang) {
        u.lang = lang;
      }
      u.rate = 0.95;
      if (i === 0) u.onstart = () => setSpeaking(true);
      if (i === parts.length - 1) {
        u.onend = u.onerror = () => {
          setSpeaking(false);
          spoken.current.until = Date.now() + 1200;
          queue.current = [];
        };
      }
      queue.current.push(u);
      s.speak(u);
    });
  }, []);

  /** True when the mic most likely picked up our own speech rather than the cook. */
  const isEcho = useCallback((heard: string) => {
    // Don't trust onend alone: if it never fired, the mic would ignore the cook forever.
    const s = synth();
    if (spoken.current.until === Number.POSITIVE_INFINITY && !s?.speaking && !s?.pending) {
      spoken.current.until = Date.now() + 1200;
      setSpeaking(false);
    }
    const { text, until } = spoken.current;
    if (Date.now() > until) return false;
    const said = new Set(words(text));
    const h = words(heard);
    return h.length > 0 && h.filter((w) => said.has(w)).length / h.length >= 0.7;
  }, []);

  return { supported, speaking, speak, stop, isEcho };
}
