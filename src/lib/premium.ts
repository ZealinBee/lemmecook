import "server-only";
import { ACTIVE_STATUSES } from "./plans";
import { userFromRequest } from "./stripe";
import { supabaseAdmin } from "./supabase/server";

/** Whether the request comes from a signed-in user with an active Stripe or Google Play subscription. */
export async function requestIsPremium(request: Request): Promise<boolean> {
  const user = await userFromRequest(request).catch(() => null);
  if (!user) return false;
  const [{ data: stripe }, { data: play }] = await Promise.all([
    supabaseAdmin.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
    supabaseAdmin.from("play_subscriptions").select("status").eq("user_id", user.id),
  ]);
  return [stripe, ...(play ?? [])].some((s) => !!s?.status && ACTIVE_STATUSES.has(s.status));
}
