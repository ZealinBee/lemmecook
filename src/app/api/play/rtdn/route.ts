import { timingSafeEqual } from "node:crypto";
import { syncPlayPurchase } from "@/lib/google-play";

const secretMatches = (given: string | null) => {
  const want = process.env.PLAY_RTDN_SECRET;
  if (!want || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Google Play Real-time Developer Notifications, pushed by Pub/Sub to
 * /api/play/rtdn?secret=PLAY_RTDN_SECRET. Renewals, cancellations and refunds land here.
 * We only take the token from the message and re-read its state from Google.
 */
export async function POST(request: Request) {
  if (!secretMatches(new URL(request.url).searchParams.get("secret"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { message?: { data?: string } } | null;
  let note: { subscriptionNotification?: { purchaseToken?: string }; voidedPurchaseNotification?: { purchaseToken?: string } };
  try {
    note = JSON.parse(Buffer.from(body?.message?.data ?? "", "base64").toString("utf8"));
  } catch {
    return Response.json({ ignored: true }); // Malformed: acknowledge so Pub/Sub doesn't redeliver forever.
  }

  const token = note.subscriptionNotification?.purchaseToken ?? note.voidedPurchaseNotification?.purchaseToken;
  if (!token) return Response.json({ received: true }); // e.g. testNotification

  try {
    await syncPlayPurchase(token);
  } catch (err) {
    console.error("[play/rtdn]", err);
    return new Response("Sync failed", { status: 500 }); // Pub/Sub will retry.
  }
  return Response.json({ received: true });
}
