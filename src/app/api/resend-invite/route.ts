import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tutoringlive.vercel.app";

// Gera novamente o link de primeiro acesso/definição de senha para um aluno do professor.
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Servidor não configurado." }, { status: 500 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { studentId } = await req.json().catch(() => ({}));
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const { data: rel } = await supabase.from("relationships")
    .select("id").eq("teacher_id", user.id).eq("student_id", studentId).maybeSingle();
  if (!rel) return NextResponse.json({ error: "Aluno não vinculado a você." }, { status: 403 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: prof } = await admin.from("profiles").select("email").eq("id", studentId).single();
  if (!prof?.email) return NextResponse.json({ error: "Aluno sem e-mail." }, { status: 400 });

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: prof.email,
    options: { redirectTo: `${SITE}/reset-password` },
  });
  if (error) { console.error("[resend-invite] generateLink:", error.message); return NextResponse.json({ error: "Não foi possível gerar o link." }, { status: 400 }); }

  return NextResponse.json({ ok: true, link: linkData?.properties?.action_link ?? null });
}
