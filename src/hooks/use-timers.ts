"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Timer = {
  id: string;
  label: string;
  duration: number; // seconds
  endsAt: number; // epoch ms
  done: boolean;
};

function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = [880, 1174.66, 1567.98];
    for (let round = 0; round < 3; round++) {
      notes.forEach((freq, i) => {
        const t = ctx.currentTime + round * 0.9 + i * 0.16;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.55);
      });
    }
    setTimeout(() => ctx.close(), 3500);
  } catch {}
  navigator.vibrate?.([300, 120, 300, 120, 300]);
}

export function useTimers(onDone: (t: Timer) => void) {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  const timersRef = useRef(timers);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  const running = timers.some((t) => !t.done);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const finished = timersRef.current.filter((t) => !t.done && t.endsAt <= n);
      if (!finished.length) return;
      const ids = new Set(finished.map((t) => t.id));
      // Mark immediately so the next tick can't fire them twice.
      timersRef.current = timersRef.current.map((t) => (ids.has(t.id) ? { ...t, done: true } : t));
      setTimers(timersRef.current);
      chime();
      finished.forEach((t) => doneRef.current({ ...t, done: true }));
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const add = useCallback((seconds: number, label = "Timer") => {
    const t: Timer = {
      id: crypto.randomUUID(),
      label,
      duration: seconds,
      endsAt: Date.now() + seconds * 1000,
      done: false,
    };
    setNow(Date.now());
    setTimers((prev) => [...prev, t]);
    return t;
  }, []);

  const remove = useCallback((id: string) => setTimers((prev) => prev.filter((t) => t.id !== id)), []);
  const clearAll = useCallback(() => setTimers([]), []);
  const remaining = useCallback((t: Timer) => Math.max(0, (t.endsAt - now) / 1000), [now]);

  return { timers, add, remove, clearAll, remaining };
}
