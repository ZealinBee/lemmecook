import "server-only";
import Stripe from "stripe";
import { ACTIVE_STATUSES } from "./plans";
import { supabaseAdmin } from "./supabase/server";

let client: Stripe | undefined;
/** Created on first use so builds don't need STRIPE_SECRET_KEY. */
export function stripe() {
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY!));
}

/** The signed-in Supabase user behind a request's `Authorization: Bearer <access token>`. */
export async function userFromRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user;
}

export async function findCustomerId(userId: string): Promise<string | undefined> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.stripe_customer_id;
}

/**
 * Copy a customer's current subscription from Stripe into Supabase. Called from the webhook and
 * right after checkout, so it reads Stripe fresh instead of trusting event order.
 */
export async function syncCustomer(customerId: string) {
  const { data: subs } = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  const sub = subs.find((s) => ACTIVE_STATUSES.has(s.status)) ?? subs[0];
  const item = sub?.items.data[0];
  const row = {
    stripe_subscription_id: sub?.id ?? null,
    status: sub?.status ?? null,
    price_id: item?.price.id ?? null,
    current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabaseAdmin
    .from("subscriptions")
    .update(row)
    .eq("stripe_customer_id", customerId)
    .select("user_id");
  if (error) throw error;
  if (updated.length) return;

  // No row yet (e.g. the customer was made outside our checkout): fall back to the customer's metadata.
  const customer = await stripe().customers.retrieve(customerId);
  const userId = !customer.deleted ? customer.metadata.supabase_user_id : undefined;
  if (!userId) return;
  const { error: upsertError } = await supabaseAdmin
    .from("subscriptions")
    .upsert({ user_id: userId, stripe_customer_id: customerId, ...row });
  if (upsertError) throw upsertError;
}
