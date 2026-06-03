import Stripe from "stripe";

// Cliente Stripe — só ativo se a chave estiver configurada (evita quebrar o build).
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
