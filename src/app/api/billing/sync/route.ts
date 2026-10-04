import { findCustomerId, syncCustomer, userFromRequest } from "@/lib/stripe";

/** Called when checkout returns, so Premium unlocks even if the webhook hasn't landed yet. */
export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const customerId = await findCustomerId(user.id);
  if (!customerId) return Response.json({ ok: true });

  try {
    await syncCustomer(customerId);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/sync]", err);
    return Response.json({ error: "Couldn't refresh your subscription." }, { status: 502 });
  }
}
