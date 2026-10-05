"use client";

import { KeepAwake } from "@capacitor-community/keep-awake";
import { useEffect, useState } from "react";
import { isAndroidApp } from "@/lib/native";

/** Keeps the screen on while `enabled`. Re-acquires after the tab regains focus. */
export function useWakeLock(enabled: boolean) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Android's WebView has no Wake Lock API; the app keeps the screen on natively instead.
    if (enabled && isAndroidApp()) {
      let cancelled = false;
      KeepAwake.keepAwake()
        .then(() => !cancelled && setActive(true))
        .catch(() => {});
      return () => {
        cancelled = true;
        setActive(false);
        KeepAwake.allowSleep().catch(() => {});
      };
    }
    if (!enabled || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release();
          return;
        }
        setActive(true);
        sentinel.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);

  return active;
}
