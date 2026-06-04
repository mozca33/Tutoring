import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { validateEmail, validateName } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";

// Professor convida um aluno por e-mail: cria a conta + vincula + GERA o link de primeiro acesso
// (não envia e-mail — o professor envia o link manualmente). Infra de e-mail mantida para o futuro.
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Servidor não configurado." }, { status: 500 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`invite:${user.id}`, 20, 60_000)) return NextResponse.json({ error: "Muitos convites em pouco tempo. Aguarde um minuto." }, { status: 429 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "teacher") return NextResponse.json({ error: "Apenas professores convidam alunos." }, { status: 403 });

  const { name, email } = await req.json().catch(() => ({}));
  const mail = validateEmail(email ?? "");
  if (!mail.ok) return NextResponse.json({ error: mail.error }, { status: 400 });

  // Nome é OPCIONAL. Se vier, valida; senão, fica nulo (a app mostra o e-mail no lugar).
  let fullName: string | undefined;
  if (name && String(name).trim()) {
    const nm = validateName(name);
    if (!nm.ok) return NextResponse.json({ error: nm.error }, { status: 400 });
    fullName = nm.value;
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  let studentId: string | null = null;
  let alreadyExisted = false;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: mail.value,
    email_confirm: true,
    password: crypto.randomUUID(),
    user_metadata: fullName ? { full_name: fullName, role: "student" } : { role: "student" },
  });

  if (createErr) {
    const { data: existing } = await admin.from("profiles").select("id").ilike("email", mail.value).maybeSingle();
    if (!existing) return NextResponse.json({ error: createErr.message }, { status: 400 });
    studentId = existing.id;
    alreadyExisted = true;
  } else {
    studentId = created.user?.id ?? null;
    if (studentId) await admin.from("profiles").update({ invited_pending: true }).eq("id", studentId);
  }
  if (!studentId) return NextResponse.json({ error: "Falha ao criar conta." }, { status: 500 });

  await admin.from("relationships").upsert(
    { teacher_id: user.id, student_id: studentId },
    { onConflict: "teacher_id,student_id", ignoreDuplicates: true },
  );

  // Gera o link de definição de senha (sem enviar e-mail)
  let link: string | null = null;
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: mail.value,
    options: { redirectTo: `${SITE}/reset-password` },
  });
  if (linkErr) console.error("[invite-student] generateLink:", linkErr.message);
  else link = linkData?.properties?.action_link ?? null;

  return NextResponse.json({ ok: true, alreadyExisted, link });
}
