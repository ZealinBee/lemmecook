export type PlanId = "monthly" | "yearly";

export const PLANS: Record<PlanId, { priceId: string; playBasePlanId: string; price: string; per: string; label: string }> = {
  monthly: { priceId: "price_1UN7YBLnkm23IhVvB0L87Ob5", playBasePlanId: "monthly", price: "$2.99", per: "month", label: "Monthly" },
  yearly: { priceId: "price_1UN7YTLnkm23IhVv7yOnttUo", playBasePlanId: "yearly", price: "$24.99", per: "year", label: "Yearly" },
};

/** The Google Play subscription product; each plan is one of its base plans. */
export const PLAY_PRODUCT_ID = "premium";

export function planForPrice(priceId: string | null | undefined): PlanId | undefined {
  return (Object.keys(PLANS) as PlanId[]).find((id) => PLANS[id].priceId === priceId);
}

export function planForPlayBasePlan(basePlanId: string | null | undefined): PlanId | undefined {
  return (Object.keys(PLANS) as PlanId[]).find((id) => PLANS[id].playBasePlanId === basePlanId);
}

/** Free users can open this many new recipes per calendar month. */
export const FREE_RECIPES_PER_MONTH = 5;

/**
 * Statuses that still get Premium. past_due keeps access while Stripe retries the card.
 * Google Play states are mapped onto these in lib/google-play.ts.
 */
export const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
