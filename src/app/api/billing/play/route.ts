import { PlayOwnershipError, syncPlayPurchase } from "@/lib/google-play";
import { userFromRequest } from "@/lib/stripe";

/** The Android app sends each Play purchase token here; we check it with Google before granting Premium. */
export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const { purchaseToken } = (await request.json().catch(() => ({}))) as { purchaseToken?: string };
  if (!purchaseToken) return Response.json({ error: "Missing purchase." }, { status: 400 });

  try {
    const found = await syncPlayPurchase(purchaseToken, user.id);
    if (!found) return Response.json({ error: "Google Play doesn't know this purchase." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof PlayOwnershipError) return Response.json({ error: err.message }, { status: 409 });
    console.error("[billing/play]", err);
    return Response.json({ error: "Couldn't confirm your purchase. Try again in a moment." }, { status: 502 });
  }
}
