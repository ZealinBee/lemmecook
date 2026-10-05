"use client";

import { Browser } from "@capacitor/browser";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowLeftIcon, CheckIcon, SparkIcon } from "@/components/icons";
import { authHeaders, currentUserId, refreshAccount, useAccount } from "@/lib/account";
import { isAndroidApp, NATIVE_AUTH_CALLBACK } from "@/lib/native";
import { buyOnPlay, managePlaySubscription, playPrices, restorePlayPurchases } from "@/lib/play-billing";
import { FREE_RECIPES_PER_MONTH, PLANS, type PlanId } from "@/lib/plans";
import { FREE_MAX, PREMIUM_MAX } from "@/lib/storage";
import { supabase } from "@/lib/supabase/client";
import { resetDate, useUsage } from "@/lib/usage";

const PERKS = [
  "Unlimited recipes, every month",
  "Remove recipes you're done with",
  `Keep up to ${PREMIUM_MAX} recipes on your device instead of ${FREE_MAX}`,
  "Support an independent cooking app",
];

const noopSubscribe = () => () => {};
/** False during SSR and hydration, so server and client render the same markup first. */
const useAndroidApp = () => useSyncExternalStore(noopSubscribe, isAndroidApp, () => false);

/** The Play sheet rejects with a "cancelled" error when the user backs out; that isn't worth an alert. */
const isCancel = (err: unknown) => err instanceof Error && /cancel/i.test(err.message);

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

export function PremiumView({
  reason,
  checkoutSuccess,
}: {
  reason?: "limit" | "remove";
  checkoutSuccess: boolean;
}) {
  const account = useAccount();
  const used = useUsage();
  const [plan, setPlan] = useState<PlanId>("yearly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(checkoutSuccess);
  // In the Android app Premium is sold through Google Play, at Play's localized prices.
  const android = useAndroidApp();
  const [prices, setPrices] = useState<Partial<Record<PlanId, string>>>({});

  useEffect(() => {
    if (android) playPrices().then(setPrices, () => {});
  }, [android]);

  // Back from Stripe: pull the subscription straight from Stripe so Premium unlocks right away.
  useEffect(() => {
    if (!checkoutSuccess || !account.signedIn) return;
    (async () => {
      await fetch("/api/billing/sync", { method: "POST", headers: await authHeaders() }).catch(() => {});
      await refreshAccount();
      setSyncing(false);
      window.history.replaceState(null, "", "/premium");
    })();
  }, [checkoutSuccess, account.signedIn]);

  async function go(path: string, body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST", headers: await authHeaders(), body: JSON.stringify(body ?? {}) });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Something went wrong.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const userId = await currentUserId();
      if (!userId) throw new Error("Sign in first.");
      await buyOnPlay(plan, userId);
    } catch (err) {
      if (!isCancel(err)) setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    setError(null);
    try {
      const userId = await currentUserId();
      if (userId && !(await restorePlayPurchases(userId))) setError("No Google Play subscription found on this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const reset = fmtDate(resetDate());
  const left = used === undefined ? undefined : Math.max(0, FREE_RECIPES_PER_MONTH - used);

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-10">
      <header className="flex items-center justify-between py-3">
        <Link href="/" aria-label="Back" className="-ml-2 rounded-full p-2 text-ink-soft active:bg-oat">
          <ArrowLeftIcon />
        </Link>
        {account.signedIn && (
          <button onClick={() => supabase.auth.signOut()} className="rounded-full px-3 py-2 text-sm text-muted active:bg-oat">
            Sign out
          </button>
        )}
      </header>

      <section className="rise pt-4">
        <p className="text-xs font-medium tracking-[0.12em] text-clay uppercase">Lemme Cook Premium</p>
        <h1 className="mt-2 font-serif text-[2.4rem] leading-[1.05] tracking-[-0.02em]">
          {account.premium ? (
            <>You&apos;re <em className="text-clay italic">Premium</em></>
          ) : (
            <>Cook <em className="text-clay italic">everything</em> you find</>
          )}
        </h1>
      </section>

      {!account.premium && reason === "limit" && (
        <Notice>
          You&apos;ve cooked your {FREE_RECIPES_PER_MONTH} free recipes this month. Wait until <b>{reset}</b> for{" "}
          {FREE_RECIPES_PER_MONTH} more, or go Premium to keep cooking now.
        </Notice>
      )}
      {!account.premium && reason === "remove" && (
        <Notice>
          Removing recipes is a Premium feature. Free recipes count toward your monthly {FREE_RECIPES_PER_MONTH} whether
          you keep them or not.
        </Notice>
      )}
      {syncing && account.signedIn && <Notice tone="calm">Payment received. Unlocking Premium…</Notice>}

      {account.premium ? (
        <section className="mt-6 rounded-3xl border border-line bg-card p-5">
          <div className="flex items-center gap-2 text-sage">
            <CheckIcon width={18} height={18} />
            <span className="font-medium">
              {account.plan ? `${PLANS[account.plan].label} plan` : "Premium"} · unlimited recipes
            </span>
          </div>
          {account.periodEnd && (
            <p className="mt-2 text-sm text-muted">
              {account.cancelAtPeriodEnd ? "Ends" : "Renews"} on {fmtDate(account.periodEnd)}
              {account.status === "past_due" && ". Your last payment failed, so please update your card."}
            </p>
          )}
          {account.email && <p className="mt-1 text-sm text-muted">Signed in as {account.email}</p>}
          {account.provider === "google_play" && !android ? (
            <p className="mt-4 text-sm text-muted">Billed through Google Play. Manage it in the Play Store app on your phone.</p>
          ) : account.provider !== "google_play" && android ? (
            // Play policy: no links out to other payment flows from the app.
            <p className="mt-4 text-sm text-muted">Billed through our website. Manage it there from any browser.</p>
          ) : (
            <button
              onClick={() => (android ? managePlaySubscription().catch(() => {}) : go("/api/billing/portal"))}
              disabled={busy}
              className="mt-4 h-12 w-full rounded-full border border-line text-[0.95rem] font-medium text-ink active:bg-oat disabled:opacity-50"
            >
              Manage subscription
            </button>
          )}
          <Link href="/" className="mt-2 block h-12 w-full rounded-full bg-ink text-center text-[0.95rem] leading-[3rem] font-medium text-ivory">
            Start cooking
          </Link>
        </section>
      ) : (
        <>
          {left !== undefined && !reason && (
            <p className="mt-4 text-muted">
              You have {left} of {FREE_RECIPES_PER_MONTH} free recipes left this month. They reset on {reset}.
            </p>
          )}

          <ul className="mt-6 grid gap-3">
            {PERKS.map((p) => (
              <li key={p} className="flex gap-3 text-ink-soft">
                <SparkIcon width={18} height={18} className="mt-0.5 shrink-0 text-clay" />
                {p}
              </li>
            ))}
          </ul>

          <div role="radiogroup" aria-label="Plan" className="mt-8 grid grid-cols-2 gap-3">
            {(Object.keys(PLANS) as PlanId[]).map((id) => {
              const p = PLANS[id];
              const selected = plan === id;
              return (
                <button
                  key={id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPlan(id)}
                  className={`relative rounded-3xl border p-4 text-left transition ${
                    selected ? "border-clay bg-clay-wash/40 ring-1 ring-clay" : "border-line bg-card"
                  }`}
                >
                  {id === "yearly" && !android && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-clay px-2 py-0.5 text-[0.7rem] font-medium text-white">
                      Save 17%
                    </span>
                  )}
                  <span className="text-sm text-muted">{p.label}</span>
                  <span className="mt-1 block font-serif text-[1.7rem] leading-none text-ink">
                    {android ? (prices[id] ?? "…") : p.price}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    per {p.per}
                    {id === "yearly" && !android && " · $8.33/mo"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {!account.ready ? (
              <div className="h-12" />
            ) : account.signedIn ? (
              <>
                <button
                  onClick={() => (android ? buy() : go("/api/billing/checkout", { plan }))}
                  disabled={busy || (android && !prices[plan])}
                  className="h-12 w-full rounded-full bg-ink text-[0.95rem] font-medium text-ivory transition active:scale-[0.98] disabled:opacity-50"
                >
                  {busy
                    ? "Opening checkout…"
                    : `Get Premium · ${android ? (prices[plan] ?? "…") : PLANS[plan].price}/${PLANS[plan].per}`}
                </button>
                <p className="mt-3 text-center text-xs text-muted">
                  Signed in as {account.email}. Cancel anytime.{" "}
                  {android ? "Billed through Google Play." : "Secure payment by Stripe."}
                </p>
                {android && (
                  <button onClick={restore} disabled={busy} className="mt-1 w-full py-2 text-center text-xs text-muted underline disabled:opacity-50">
                    Restore purchase
                  </button>
                )}
              </>
            ) : (
              <SignIn />
            )}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-clay-wash px-4 py-3 text-sm text-clay-deep">
          {error}
        </p>
      )}
    </main>
  );
}

function Notice({ children, tone = "warn" }: { children: React.ReactNode; tone?: "warn" | "calm" }) {
  return (
    <p
      role="status"
      className={`mt-5 rounded-2xl px-4 py-3 text-[0.95rem] leading-relaxed ${
        tone === "warn" ? "bg-clay-wash text-clay-deep" : "bg-paper text-ink-soft"
      }`}
    >
      {children}
    </p>
  );
}

/** Premium is tied to an account so it follows you to every device. */
function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectTo = () => `${window.location.origin}/premium`;

  async function google() {
    // Google refuses sign-in inside a WebView, so the app opens it in a Custom Tab that returns via NATIVE_AUTH_CALLBACK.
    if (isAndroidApp()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: NATIVE_AUTH_CALLBACK, skipBrowserRedirect: true },
      });
      if (error) setError(error.message);
      else if (data.url) await Browser.open({ url: data.url });
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) setError(error.message);
  }

  async function magicLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <p className="rounded-2xl bg-paper px-4 py-3 text-center text-ink-soft">
        Check <b>{email}</b> for a sign-in link, then come back here to finish.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-center text-sm text-muted">Sign in so Premium works on all your devices.</p>
      <button
        onClick={google}
        className="h-12 w-full rounded-full bg-ink text-[0.95rem] font-medium text-ivory transition active:scale-[0.98]"
      >
        Continue with Google
      </button>
      <form onSubmit={magicLink} className="mt-3 flex gap-2">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 min-w-0 flex-1 rounded-full border border-line bg-card px-4 text-[1rem] text-ink outline-none focus:border-clay/60"
        />
        <button type="submit" className="h-12 shrink-0 rounded-full border border-line px-5 text-sm font-medium text-ink active:bg-oat">
          Email me a link
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-center text-sm text-clay-deep">{error}</p>}
    </div>
  );
}
