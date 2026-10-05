import "server-only";
import { createSign } from "node:crypto";
import { PLAY_PRODUCT_ID } from "./plans";
import { supabaseAdmin } from "./supabase/server";

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

export const PLAY_PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "app.lemmecook";

let cachedToken: { value: string; expires: number } | undefined;

/** OAuth token for the Play Developer API, from the service account in GOOGLE_PLAY_SERVICE_ACCOUNT (its JSON key). */
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const key = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT!) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function play(path: string, init?: RequestInit) {
  return fetch(`${API}/${PLAY_PACKAGE_NAME}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...init?.headers },
  });
}

/** The parts of purchases.subscriptionsv2 we use. */
type PlaySubscription = {
  subscriptionState: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  lineItems?: { productId: string; expiryTime?: string; autoRenewingPlan?: { autoRenewEnabled?: boolean }; offerDetails?: { basePlanId?: string } }[];
};

/** Play states in Stripe's vocabulary, so ACTIVE_STATUSES covers both. */
function statusFor(sub: PlaySubscription, expiry: Date | null): string {
  switch (sub.subscriptionState) {
    case "SUBSCRIPTION_STATE_ACTIVE":
      return "active";
    case "SUBSCRIPTION_STATE_CANCELED":
      // Cancelled but paid up: keeps Premium until the period ends.
      return expiry && expiry > new Date() ? "active" : "canceled";
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":
      return "past_due";
    case "SUBSCRIPTION_STATE_ON_HOLD":
      return "unpaid";
    case "SUBSCRIPTION_STATE_PAUSED":
      return "paused";
    case "SUBSCRIPTION_STATE_PENDING":
      return "incomplete";
    default:
      return "canceled";
  }
}

export class PlayOwnershipError extends Error {}

/**
 * Read a purchase token from Google and copy it into Supabase, acknowledging it if needed
 * (Play refunds purchases that aren't acknowledged within 3 days).
 *
 * `userId` is who is claiming the token (from the app). Webhooks pass nothing and the owner comes
 * from the account id set at purchase time, or from the row we already have.
 * Returns false when the token can't be tied to any user.
 */
export async function syncPlayPurchase(purchaseToken: string, userId?: string): Promise<boolean> {
  const res = await play(`purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`);
  if (res.status === 404 || res.status === 410) return false;
  if (!res.ok) throw new Error(`Play subscriptionsv2 failed: ${res.status} ${await res.text()}`);
  const sub = (await res.json()) as PlaySubscription;

  const item = sub.lineItems?.find((l) => l.productId === PLAY_PRODUCT_ID) ?? sub.lineItems?.[0];
  if (!item) return false;

  const { data: existing } = await supabaseAdmin
    .from("play_subscriptions")
    .select("user_id")
    .eq("purchase_token", purchaseToken)
    .maybeSingle();
  const purchaser = sub.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  const owner = existing?.user_id ?? purchaser ?? userId;
  if (!owner) return false;
  // A token belongs to whoever bought it; another account can't take it over.
  if (userId && (owner !== userId || (purchaser && purchaser !== userId))) {
    throw new PlayOwnershipError("This Google Play subscription belongs to a different Lemme Cook account.");
  }

  const expiry = item.expiryTime ? new Date(item.expiryTime) : null;
  const { error } = await supabaseAdmin.from("play_subscriptions").upsert({
    purchase_token: purchaseToken,
    user_id: owner,
    product_id: item.productId,
    base_plan_id: item.offerDetails?.basePlanId ?? null,
    status: statusFor(sub, expiry),
    current_period_end: expiry?.toISOString() ?? null,
    cancel_at_period_end: item.autoRenewingPlan?.autoRenewEnabled === false,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  // An upgrade or resubscribe replaces the old token; stop it from granting Premium too.
  if (sub.linkedPurchaseToken) {
    await supabaseAdmin
      .from("play_subscriptions")
      .update({ status: "replaced", updated_at: new Date().toISOString() })
      .eq("purchase_token", sub.linkedPurchaseToken);
  }

  if (sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING" && sub.subscriptionState !== "SUBSCRIPTION_STATE_PENDING") {
    const ack = await play(
      `purchases/subscriptions/${encodeURIComponent(item.productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
      { method: "POST", body: "{}" },
    );
    if (!ack.ok) throw new Error(`Play acknowledge failed: ${ack.status} ${await ack.text()}`);
  }
  return true;
}
