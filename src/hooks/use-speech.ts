"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function synth(): SpeechSynthesis | undefined {
  return typeof window !== "undefined" ? window.speechSynthesis : undefined;
}

/** Prefer the nicer voices browsers ship (Google, Apple "Enhanced", Edge "Natural") in the page's language. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = synth()?.getVoices() ?? [];
  const lang = (typeof navigator !== "undefined" ? navigator.language : "en-US").toLowerCase();
  const base = lang.split("-")[0];
  const inLang = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = inLang.length ? inLang : voices;
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase() === lang ? 4 : 0) +
    (/natural|neural|enhanced|premium/i.test(v.name) ? 3 : 0) +
    (/google|samantha|daniel|karen|moira/i.test(v.name) ? 2 : 0) +
    (v.default ? 1 : 0);
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

/** Chrome silently cuts utterances off after ~15s, so speak a sentence at a time. */
function chunks(text: string): string[] {
  return (text.match(/[^.!?;]+[.!?;]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

const words = (s: string) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];

/** Free, on-device text to speech via the browser's Web Speech API. Speaks only when `speak` is called. */
export function useSpeech() {
  const supported = useSyncExternalStore(noopSubscribe, () => Boolean(synth()), () => false);
  const [speaking, setSpeaking] = useState(false);
  const voice = useRef<SpeechSynthesisVoice | undefined>(undefined);
  // What we last said and when we stopped, so the mic can ignore our own voice.
  const spoken = useRef({ text: "", until: 0 });

  useEffect(() => {
    const s = synth();
    if (!s) return;
    const load = () => (voice.current = pickVoice());
    load();
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

  const speak = useCallback((text: string) => {
    const s = synth();
    if (!s || !text.trim()) return;
    s.cancel();
    voice.current ??= pickVoice();
    spoken.current = { text, until: Number.POSITIVE_INFINITY };
    const parts = chunks(text);
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      if (voice.current) {
        u.voice = voice.current;
        u.lang = voice.current.lang;
      }
      u.rate = 0.95;
      if (i === 0) u.onstart = () => setSpeaking(true);
      if (i === parts.length - 1) {
        u.onend = u.onerror = () => {
          setSpeaking(false);
          spoken.current.until = Date.now() + 1200;
        };
      }
      s.speak(u);
    });
  }, []);

  /** True when the mic most likely picked up our own speech rather than the cook. */
  const isEcho = useCallback((heard: string) => {
    const { text, until } = spoken.current;
    if (Date.now() > until) return false;
    const said = new Set(words(text));
    const h = words(heard);
    return h.length > 0 && h.filter((w) => said.has(w)).length / h.length >= 0.7;
  }, []);

  return { supported, speaking, speak, stop, isEcho };
}
