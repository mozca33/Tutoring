import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

// Atualiza o status da assinatura a partir dos eventos do Stripe.
export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return NextResponse.json({ error: `Assinatura inválida: ${e instanceof Error ? e.message : ""}` }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  async function setStatus(userId: string, status: string, fields: Record<string, unknown> = {}) {
    await admin.from("profiles").update({ subscription_status: status, ...fields }).eq("id", userId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = (s.metadata?.user_id as string) || (s.client_reference_id as string);
      if (userId) {
        await setStatus(userId, "active", {
          stripe_customer_id: s.customer as string,
          stripe_subscription_id: s.subscription as string,
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id as string | undefined;
      const status =
        sub.status === "active" || sub.status === "trialing" ? "active"
          : sub.status === "past_due" ? "past_due"
            : "canceled";
      if (userId) await setStatus(userId, status, { stripe_subscription_id: sub.id });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
