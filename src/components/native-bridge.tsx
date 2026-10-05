"use client";

import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { currentUserId, refreshAccount } from "@/lib/account";
import { isAndroidApp } from "@/lib/native";
import { restorePlayPurchases } from "@/lib/play-billing";
import { supabase } from "@/lib/supabase/client";

/**
 * Android app glue; renders nothing and does nothing on the web.
 * - Sign-in returns to the app (Google via app.lemmecook://auth, magic links via an App Link to /premium)
 *   with the session in the URL fragment; we hand it to Supabase.
 * - On launch, re-sends any Play purchase the server hasn't confirmed yet.
 */
export function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isAndroidApp()) return;

    const finishSignIn = async (url: string) => {
      const u = new URL(url);
      const params = new URLSearchParams(u.hash.slice(1) || u.search.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      Browser.close().catch(() => {});
      if (access_token && refresh_token) await supabase.auth.setSession({ access_token, refresh_token });
      await refreshAccount();
      router.replace("/premium");
    };

    const listener = App.addListener("appUrlOpen", ({ url }) => void finishSignIn(url));
    // A cold start from a sign-in link doesn't fire appUrlOpen. The launch URL sticks around across
    // page loads, so remember we've used it.
    App.getLaunchUrl()
      .then((launch) => {
        const key = `lemme-cook:launch-handled:${launch?.url}`;
        if (!launch?.url || sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
        return finishSignIn(launch.url);
      })
      .catch(() => {});

    currentUserId()
      .then((id) => (id ? restorePlayPurchases(id) : 0))
      .catch(() => {});

    return () => void listener.then((l) => l.remove());
  }, [router]);

  return null;
}
