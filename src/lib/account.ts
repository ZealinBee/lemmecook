"use client";

import { useSyncExternalStore } from "react";
import { ACTIVE_STATUSES, planForPlayBasePlan, planForPrice, type PlanId } from "./plans";
import { supabase } from "./supabase/client";

export type Account = {
  /** False until we've checked for a session. */
  ready: boolean;
  email: string | null;
  signedIn: boolean;
  premium: boolean;
  /** Where the subscription was bought: Stripe on the web, or Google Play in the Android app. */
  provider?: "stripe" | "google_play";
  plan?: PlanId;
  status?: string;
  periodEnd?: string;
  cancelAtPeriodEnd?: boolean;
};

// Remembered so a Premium user isn't paywalled for the moment it takes to check with Supabase.
const PREMIUM_KEY = "lemme-cook:premium";
const SIGNED_OUT: Account = { ready: false, email: null, signedIn: false, premium: false };

let state: Account = SIGNED_OUT;
let started = false;
const listeners = new Set<() => void>();

function set(next: Account) {
  state = next;
  try {
    localStorage.setItem(PREMIUM_KEY, next.premium ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

async function load(userId: string | undefined, email: string | null) {
  if (!userId) return set({ ...SIGNED_OUT, ready: true });
  const [{ data: stripe }, { data: play }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, price_id, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("play_subscriptions")
      .select("status, base_plan_id, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .order("current_period_end", { ascending: false, nullsFirst: false }),
  ]);
  const isActive = (status: string | null | undefined) => !!status && ACTIVE_STATUSES.has(status);
  const playSub = play?.find((p) => isActive(p.status)) ?? play?.[0];

  // Show whichever subscription grants Premium; Stripe first, as the older and more common one.
  const sub =
    isActive(stripe?.status) || (stripe?.status && !isActive(playSub?.status))
      ? { ...stripe!, provider: "stripe" as const, plan: planForPrice(stripe!.price_id) }
      : playSub
        ? { ...playSub, provider: "google_play" as const, plan: planForPlayBasePlan(playSub.base_plan_id) }
        : undefined;
  set({
    ready: true,
    email,
    signedIn: true,
    premium: isActive(sub?.status),
    provider: sub?.provider,
    plan: sub?.plan,
    status: sub?.status ?? undefined,
    periodEnd: sub?.current_period_end ?? undefined,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
  });
}

function start() {
  if (started) return;
  started = true;
  try {
    if (localStorage.getItem(PREMIUM_KEY) === "1") state = { ...state, premium: true };
  } catch {}
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED") return;
    // Defer: Supabase deadlocks if we query from inside this callback.
    setTimeout(() => load(session?.user.id, session?.user.email ?? null), 0);
  });
}

/** Re-read the subscription, e.g. after returning from checkout. */
export async function refreshAccount() {
  const { data } = await supabase.auth.getSession();
  await load(data.session?.user.id, data.session?.user.email ?? null);
}

/** The signed-in user's id, e.g. to tie a Google Play purchase to the account. */
export async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id;
}

/** Headers that identify the signed-in user to our API routes. */
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAccount() {
  return useSyncExternalStore(subscribe, () => state, () => SIGNED_OUT);
}
