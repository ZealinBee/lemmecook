"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognitionCtor(): (new () => Recognition) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, new () => Recognition>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const noopSubscribe = () => () => {};

/** Continuous, hands-free listening. Restarts itself after the browser's silence timeout. */
export function useVoiceControl(onTranscript: (text: string) => void) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(getRecognitionCtor()),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const wantOn = useRef(false);
  const handler = useRef(onTranscript);

  useEffect(() => {
    handler.current = onTranscript;
  });

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    wantOn.current = true;
    setError(null);
    if (recRef.current) {
      try { recRef.current.start(); } catch {}
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) continue;
        const text = r[0].transcript.trim();
        if (!text) continue;
        setLastHeard(text);
        handler.current(text);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantOn.current = false;
        setError("Microphone access was blocked. Enable it in your browser settings.");
      }
    };
    // Browsers end sessions after silence; restart while the user wants it on.
    rec.onend = () => {
      if (wantOn.current) {
        setTimeout(() => {
          if (wantOn.current) try { rec.start(); } catch {}
        }, 250);
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    wantOn.current = false;
    recRef.current?.abort();
    setListening(false);
  }, []);

  useEffect(() => () => {
    wantOn.current = false;
    recRef.current?.abort();
  }, []);

  return { supported, listening, lastHeard, error, start, stop };
}
