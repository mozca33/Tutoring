import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateEmail, validateName } from "@/lib/validation";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Servidor não configurado." }, { status: 500 });
  }

  const { name, email, code } = await req.json().catch(() => ({}));
  const nm = validateName(name ?? "");
  if (!nm.ok) return NextResponse.json({ error: nm.error }, { status: 400 });
  const mail = validateEmail(email ?? "");
  if (!mail.ok) return NextResponse.json({ error: mail.error }, { status: 400 });
  const teacherCode = String(code ?? "").trim().toUpperCase();
  if (teacherCode.length < 4) return NextResponse.json({ error: "Informe o código do professor." }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // 1) Acha o professor pelo código
  const { data: teacher } = await admin
    .from("profiles").select("id").eq("teacher_code", teacherCode).eq("role", "teacher").maybeSingle();
  if (!teacher) return NextResponse.json({ error: "Código do professor inválido." }, { status: 404 });

  // 2) Convida (cria a conta e envia e-mail para definir a senha)
  let studentId: string | null = null;
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(mail.value, {
    data: { full_name: nm.value, role: "student" },
    redirectTo: `${SITE}/auth/callback?next=/reset-password`,
  });

  if (inviteErr) {
    // Já existe conta com esse e-mail → apenas vincula
    const { data: existing } = await admin.from("profiles").select("id").ilike("email", mail.value).maybeSingle();
    if (!existing) return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    studentId = existing.id;
  } else {
    studentId = invited.user?.id ?? null;
  }
  if (!studentId) return NextResponse.json({ error: "Falha ao criar conta." }, { status: 500 });

  // 3) Vincula ao professor
  await admin.from("relationships").upsert(
    { teacher_id: teacher.id, student_id: studentId },
    { onConflict: "teacher_id,student_id", ignoreDuplicates: true },
  );

  return NextResponse.json({ ok: true, invited: !inviteErr });
}
