import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "Pagamentos ainda não configurados." }, { status: 500 });
  }

  const { plan } = await req.json().catch(() => ({}));
  const price = plan === "annual" && process.env.STRIPE_PRICE_ID_ANNUAL
    ? process.env.STRIPE_PRICE_ID_ANNUAL
    : process.env.STRIPE_PRICE_ID;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") {
    return NextResponse.json({ error: "Apenas professores assinam." }, { status: 403 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : (profile?.email ?? user.email ?? undefined),
    client_reference_id: user.id,
    success_url: `${origin}/app/assinatura?success=1`,
    cancel_url: `${origin}/app/assinatura?canceled=1`,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  });

  return NextResponse.json({ url: session.url });
}
