import { NextResponse } from "next/server";
import { WebhookReceiver, EgressStatus } from "livekit-server-sdk";
import { createClient as createAdmin } from "@supabase/supabase-js";

// Recebe webhooks do LiveKit. Configurar a URL em LiveKit Cloud → Settings → Webhooks:
//   https://<dominio>/api/livekit-webhook
export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "não configurado" }, { status: 500 });
  }

  const receiver = new WebhookReceiver(apiKey, apiSecret);
  const body = await req.text();
  const auth = req.headers.get("Authorization") ?? "";

  let event;
  try {
    event = await receiver.receive(body, auth);
  } catch {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  if (event.event === "egress_ended" || event.event === "egress_updated") {
    const info = event.egressInfo;
    const egressId = info?.egressId;
    if (egressId) {
      const ended = event.event === "egress_ended";
      const ok = info?.status === EgressStatus.EGRESS_COMPLETE;
      const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
      await admin.from("lessons")
        .update({ recording_status: ended ? (ok ? "done" : "failed") : "recording" })
        .eq("recording_egress_id", egressId);
    }
  }

  return NextResponse.json({ ok: true });
}
