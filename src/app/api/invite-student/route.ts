import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { validateEmail, validateName } from "@/lib/validation";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";

// Professor convida um aluno por e-mail: cria a conta + vincula + envia link de primeiro acesso.
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Servidor não configurado." }, { status: 500 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "teacher") return NextResponse.json({ error: "Apenas professores convidam alunos." }, { status: 403 });

  const { name, email } = await req.json().catch(() => ({}));
  const nm = validateName(name ?? "");
  if (!nm.ok) return NextResponse.json({ error: nm.error }, { status: 400 });
  const mail = validateEmail(email ?? "");
  if (!mail.ok) return NextResponse.json({ error: mail.error }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  let studentId: string | null = null;
  let alreadyExisted = false;

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(mail.value, {
    data: { full_name: nm.value, role: "student" },
    redirectTo: `${SITE}/auth/callback?next=/reset-password`,
  });

  if (error) {
    // Já existe conta com esse e-mail → apenas vincula
    const { data: existing } = await admin.from("profiles").select("id").ilike("email", mail.value).maybeSingle();
    if (!existing) return NextResponse.json({ error: error.message }, { status: 400 });
    studentId = existing.id;
    alreadyExisted = true;
  } else {
    studentId = invited.user?.id ?? null;
    if (studentId) await admin.from("profiles").update({ invited_pending: true }).eq("id", studentId);
  }
  if (!studentId) return NextResponse.json({ error: "Falha ao criar conta." }, { status: 500 });

  await admin.from("relationships").upsert(
    { teacher_id: user.id, student_id: studentId },
    { onConflict: "teacher_id,student_id", ignoreDuplicates: true },
  );

  return NextResponse.json({ ok: true, alreadyExisted });
}
