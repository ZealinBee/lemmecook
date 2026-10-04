import { findCustomerId, stripe, userFromRequest } from "@/lib/stripe";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const customerId = await findCustomerId(user.id);
  if (!customerId) return Response.json({ error: "No subscription found." }, { status: 404 });

  try {
    const portal = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${new URL(request.url).origin}/premium`,
    });
    return Response.json({ url: portal.url });
  } catch (err) {
    console.error("[billing/portal]", err);
    return Response.json({ error: "Couldn't open billing. Try again in a moment." }, { status: 502 });
  }
}
