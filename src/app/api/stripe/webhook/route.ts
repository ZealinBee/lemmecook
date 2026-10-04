import type Stripe from "stripe";
import { stripe, syncCustomer } from "@/lib/stripe";

const customerOf = (obj: { customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null }) =>
  typeof obj.customer === "string" ? obj.customer : obj.customer?.id;

export async function POST(request: Request) {
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(
      await request.text(),
      request.headers.get("stripe-signature") ?? "",
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[stripe/webhook] bad signature", err);
    return new Response("Bad signature", { status: 400 });
  }

  let customerId: string | undefined;
  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      customerId = customerOf(event.data.object);
      break;
  }

  if (customerId) {
    try {
      await syncCustomer(customerId);
    } catch (err) {
      console.error("[stripe/webhook]", event.type, err);
      return new Response("Sync failed", { status: 500 }); // Stripe will retry.
    }
  }
  return Response.json({ received: true });
}
