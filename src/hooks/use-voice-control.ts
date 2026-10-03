"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { KaldiRecognizer, Model } from "vosk-browser";
import { COMMAND_WORDS } from "@/lib/voice-commands";

/*
 * Two engines behind one hook:
 * - The browser's built-in recognizer starts instantly, but it ends its session after every phrase
 *   and some platforms (Android Chrome) play a "ding" on each restart.
 * - Vosk runs on-device with the mic held open, so it never restarts, and only listens for command
 *   words. Its model is ~40 MB, so it downloads in the background and takes over once it's ready.
 */

type Engine = { stop: () => void; reset: () => void };
type Callbacks = { onText: (text: string) => void; onFatal: (message: string) => void };

const BLOCKED = "Microphone access was blocked. Enable it in your browser settings.";

// ---------- Built-in Web Speech ----------

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

function startWebSpeech({ onText, onFatal }: Callbacks): Engine | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  let on = true;
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = false;
  rec.lang = "en-US";
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (!r.isFinal) continue;
      const text = r[0].transcript.trim();
      if (text) onText(text);
    }
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      on = false;
      onFatal(BLOCKED);
    }
  };
  // Browsers end sessions after silence; restart while it's wanted.
  // Speech synthesis can grab the audio session, so a restart may throw — keep retrying.
  const restart = (delay: number) =>
    setTimeout(() => {
      if (!on) return;
      try {
        rec.start();
      } catch (err) {
        // InvalidStateError means it's already running (or ending, and onend will call us again).
        if ((err as Error)?.name !== "InvalidStateError") restart(Math.min(delay * 2, 2000));
      }
    }, delay);
  rec.onend = () => {
    if (on) restart(250);
  };
  try {
    rec.start();
  } catch {}
  return {
    stop: () => {
      on = false;
      rec.abort();
    },
    // Drop the current session; onend starts a fresh one.
    reset: () => rec.abort(),
  };
}

// ---------- On-device Vosk ----------

// Self-hosted in /public so the browser caches it after the first download.
const MODEL_PATH = "/models/vosk-model-small-en-us-0.15.tar.gz";
const UNK = "[unk]";
// Only listen for command words; everything else (conversation, the radio) comes back as [unk].
const GRAMMAR = JSON.stringify([...COMMAND_WORDS, UNK]);

function voskSupported() {
  return (
    typeof window !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    Boolean(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)
  );
}

// One model per page load, shared across mounts. Dynamic import keeps the 6 MB engine out of the main bundle.
let modelPromise: Promise<Model> | null = null;
function loadModel() {
  modelPromise ??= import("vosk-browser")
    .then(({ createModel }) => createModel(new URL(MODEL_PATH, window.location.origin).href, -1))
    .catch((err) => {
      modelPromise = null;
      throw err;
    });
  return modelPromise;
}

/** Drop [unk] words; return "" when the phrase is mostly unrecognized chatter. */
function cleanTranscript(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const known = words.filter((w) => w !== UNK);
  if (!known.length || known.length < words.length / 2) return "";
  return known.join(" ");
}

async function startVosk(model: Model, { onText }: Callbacks): Promise<Engine> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  let rec: KaldiRecognizer;
  const makeRecognizer = () => {
    rec = new model.KaldiRecognizer(ctx.sampleRate, GRAMMAR);
    rec.on("result", (msg) => {
      if (msg.event !== "result") return;
      const text = cleanTranscript(msg.result.text);
      if (text) onText(text);
    });
  };
  makeRecognizer();
  node.onaudioprocess = (e) => {
    try {
      rec.acceptWaveform(e.inputBuffer);
    } catch {}
  };
  source.connect(node);
  node.connect(ctx.destination);
  return {
    stop: () => {
      node.onaudioprocess = null;
      source.disconnect();
      node.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
      rec.remove();
    },
    // Throw away whatever's half-heard and start the next phrase clean.
    reset: () => {
      rec.remove();
      makeRecognizer();
    },
  };
}

// ---------- Hook ----------

const noopSubscribe = () => () => {};

/** Continuous, hands-free listening. Starts on the built-in recognizer and upgrades to Vosk once it's downloaded. */
export function useVoiceControl(onTranscript: (text: string) => void) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(getRecognitionCtor()) || voskSupported(),
    () => false,
  );
  const [listening, setListening] = useState(false);
  // Only true when there's nothing to listen with until the model arrives (no built-in recognizer).
  const [loading, setLoading] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const handler = useRef(onTranscript);
  const engine = useRef<Engine | null>(null);
  // Bumped on every start/stop so a slow upgrade can tell it's been cancelled.
  const session = useRef(0);

  useEffect(() => {
    handler.current = onTranscript;
  });

  const stopEngine = useCallback(() => {
    engine.current?.stop();
    engine.current = null;
  }, []);

  const start = useCallback(() => {
    if (engine.current) return;
    const id = ++session.current;
    const callbacks: Callbacks = {
      onText: (text) => {
        if (id !== session.current) return;
        setLastHeard(text);
        handler.current(text);
      },
      onFatal: (message) => {
        if (id !== session.current) return;
        session.current++;
        stopEngine();
        setLoading(false);
        setListening(false);
        setError(message);
      },
    };
    setError(null);
    setListening(true);
    engine.current = startWebSpeech(callbacks);
    if (!voskSupported()) {
      if (!engine.current) setListening(false);
      return;
    }
    setLoading(!engine.current);
    loadModel()
      .then((model) => (id === session.current ? startVosk(model, callbacks) : null))
      .then((vosk) => {
        if (!vosk) return;
        if (id !== session.current) return vosk.stop();
        // Vosk is listening now, so dropping the built-in one leaves no gap.
        engine.current?.stop();
        engine.current = vosk;
        setLoading(false);
      })
      .catch((err) => {
        if (id !== session.current) return;
        setLoading(false);
        const name = (err as Error)?.name;
        if (name === "NotAllowedError" || name === "SecurityError") return callbacks.onFatal(BLOCKED);
        // Download failed: keep using the built-in recognizer if there is one.
        if (!engine.current) callbacks.onFatal("Couldn't load voice control. Check your connection and try again.");
      });
  }, [stopEngine]);

  const stop = useCallback(() => {
    session.current++;
    stopEngine();
    setLoading(false);
    setListening(false);
  }, [stopEngine]);

  const reset = useCallback(() => engine.current?.reset(), []);

  useEffect(
    () => () => {
      session.current++;
      engine.current?.stop();
      engine.current = null;
    },
    [],
  );

  return { supported, listening, loading, lastHeard, error, start, stop, reset };
}
