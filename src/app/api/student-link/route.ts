import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Vincula o aluno (autenticado, ex.: via Google) a um professor pelo código.
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Servidor não configurado." }, { status: 500 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  const teacherCode = String(code ?? "").trim().toUpperCase();
  if (teacherCode.length < 4) return NextResponse.json({ error: "Informe o código do professor." }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: teacher } = await admin
    .from("profiles").select("id").eq("teacher_code", teacherCode).eq("role", "teacher").maybeSingle();
  if (!teacher) return NextResponse.json({ error: "Código do professor inválido." }, { status: 404 });
  if (teacher.id === user.id) return NextResponse.json({ error: "Você não pode usar o próprio código." }, { status: 400 });

  await admin.from("profiles").update({ role: "student", role_confirmed: true, subscription_status: "none", trial_ends_at: null }).eq("id", user.id);
  await admin.from("relationships").upsert(
    { teacher_id: teacher.id, student_id: user.id },
    { onConflict: "teacher_id,student_id", ignoreDuplicates: true },
  );

  return NextResponse.json({ ok: true });
}
