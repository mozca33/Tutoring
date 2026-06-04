import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";

// Abre o portal do Stripe para o professor gerenciar/cancelar a assinatura.
export async function POST() {
  if (!stripe) return NextResponse.json({ error: "Pagamentos não configurados." }, { status: 500 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: "Sem assinatura ativa." }, { status: 400 });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${SITE}/app/assinatura`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha ao abrir o portal." }, { status: 500 });
  }
}
