import { PLANS, type PlanId } from "@/lib/plans";
import { findCustomerId, stripe, userFromRequest } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to subscribe." }, { status: 401 });

  const { plan } = (await request.json().catch(() => ({}))) as { plan?: PlanId };
  if (!plan || !(plan in PLANS)) return Response.json({ error: "Pick a plan." }, { status: 400 });

  const origin = new URL(request.url).origin;
  try {
    let customerId = await findCustomerId(user.id);
    if (customerId) {
      // Already subscribed: send them to manage it rather than paying twice.
      const { data: active } = await stripe().subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (active.length) {
        const portal = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/premium` });
        return Response.json({ url: portal.url });
      }
    } else {
      const customer = await stripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .insert({ user_id: user.id, stripe_customer_id: customerId });
      if (error) throw error;
    }

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/premium?checkout=success`,
      cancel_url: `${origin}/premium`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return Response.json({ error: "Couldn't start checkout. Try again in a moment." }, { status: 502 });
  }
}
