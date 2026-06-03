import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";

// Reenvia o link de primeiro acesso/definição de senha para um aluno do professor.
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Servidor não configurado." }, { status: 500 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { studentId } = await req.json().catch(() => ({}));
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  // Confirma que o aluno é vinculado a este professor (RLS rel_read permite ao professor)
  const { data: rel } = await supabase.from("relationships")
    .select("id").eq("teacher_id", user.id).eq("student_id", studentId).maybeSingle();
  if (!rel) return NextResponse.json({ error: "Aluno não vinculado a você." }, { status: 403 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: prof } = await admin.from("profiles").select("email").eq("id", studentId).single();
  if (!prof?.email) return NextResponse.json({ error: "Aluno sem e-mail." }, { status: 400 });

  // Envia e-mail de definição de senha (recovery)
  const anon = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await anon.auth.resetPasswordForEmail(prof.email, { redirectTo: `${SITE}/auth/callback?next=/reset-password` });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
