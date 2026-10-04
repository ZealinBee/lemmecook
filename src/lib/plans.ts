export type PlanId = "monthly" | "yearly";

export const PLANS: Record<PlanId, { priceId: string; price: string; per: string; label: string }> = {
  monthly: { priceId: "price_1UMomoLnkm23IhVvR62Kdqre", price: "$9.99", per: "month", label: "Monthly" },
  yearly: { priceId: "price_1UMon5Lnkm23IhVvXiX0vCqF", price: "$99.99", per: "year", label: "Yearly" },
};

export function planForPrice(priceId: string | null | undefined): PlanId | undefined {
  return (Object.keys(PLANS) as PlanId[]).find((id) => PLANS[id].priceId === priceId);
}

/** Free users can open this many new recipes per calendar month. */
export const FREE_RECIPES_PER_MONTH = 3;

/** Stripe statuses that still get Premium. past_due keeps access while Stripe retries the card. */
export const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
