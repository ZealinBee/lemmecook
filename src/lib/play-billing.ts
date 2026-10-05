"use client";

import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import { authHeaders, refreshAccount } from "./account";
import { PLANS, PLAY_PRODUCT_ID, type PlanId } from "./plans";

/** Localized prices from Google Play, one per plan that's set up in the Play Console. */
export async function playPrices(): Promise<Partial<Record<PlanId, string>>> {
  const { products } = await NativePurchases.getProducts({ productIdentifiers: [PLAY_PRODUCT_ID], productType: PURCHASE_TYPE.SUBS });
  const prices: Partial<Record<PlanId, string>> = {};
  for (const id of Object.keys(PLANS) as PlanId[]) {
    // One entry per base plan/offer; the base plan itself has no offerId.
    const offers = products.filter((p) => p.planIdentifier === PLANS[id].playBasePlanId);
    const base = offers.find((p) => !p.offerId) ?? offers[0];
    if (base) prices[id] = base.priceString;
  }
  return prices;
}

/** Ask our server to check a token with Google, grant Premium and acknowledge it. */
async function confirm(purchaseToken: string) {
  const res = await fetch("/api/billing/play", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ purchaseToken }) });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't confirm your purchase.");
}

/** Run the Play purchase sheet. Resolves once Premium is unlocked; throws if cancelled or it fails. */
export async function buyOnPlay(plan: PlanId, userId: string) {
  const tx = await NativePurchases.purchaseProduct({
    productIdentifier: PLAY_PRODUCT_ID,
    planIdentifier: PLANS[plan].playBasePlanId,
    productType: PURCHASE_TYPE.SUBS,
    // Ties the purchase to this account so renewals and refunds reach the right user.
    appAccountToken: userId,
    // Our server acknowledges after it has verified the token.
    autoAcknowledgePurchases: false,
  });
  if (!tx.purchaseToken) throw new Error("Google Play didn't return a purchase.");
  await confirm(tx.purchaseToken);
  await refreshAccount();
}

/**
 * Re-send any Play subscriptions on this device. Picks up a purchase whose confirmation didn't reach us
 * (app closed, offline) before Play's 3-day acknowledgement deadline. Returns how many were confirmed.
 */
export async function restorePlayPurchases(userId: string): Promise<number> {
  const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS, appAccountToken: userId });
  let confirmed = 0;
  for (const p of purchases) {
    if (!p.purchaseToken) continue;
    try {
      await confirm(p.purchaseToken);
      confirmed++;
    } catch {}
  }
  if (confirmed) await refreshAccount();
  return confirmed;
}

export const managePlaySubscription = () => NativePurchases.manageSubscriptions();
