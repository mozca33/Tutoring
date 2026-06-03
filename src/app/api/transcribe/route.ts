import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

// Gera a transcrição da gravação via OpenAI Whisper.
export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Transcrição não configurada (OPENAI_API_KEY)." }, { status: 500 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { lessonId } = await req.json().catch(() => ({}));
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, teacher_id, recording_path")
    .eq("id", lessonId)
    .single();
  if (!lesson || lesson.teacher_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!lesson.recording_path) return NextResponse.json({ error: "Sem gravação para transcrever." }, { status: 400 });

  await supabase.from("lessons").update({ transcript_status: "processing" }).eq("id", lessonId);

  try {
    const { data: signed } = await supabase.storage.from("recordings").createSignedUrl(lesson.recording_path, 600);
    if (!signed) throw new Error("Falha ao acessar a gravação");

    const fileRes = await fetch(signed.signedUrl);
    const blob = await fileRes.blob();

    const form = new FormData();
    form.append("file", blob, "aula.mp4");
    form.append("model", "whisper-1");
    form.append("language", "pt");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const transcript = data.text as string;

    await supabase.from("lessons").update({ transcript, transcript_status: "done" }).eq("id", lessonId);
    return NextResponse.json({ ok: true, transcript });
  } catch (e) {
    await supabase.from("lessons").update({ transcript_status: "failed" }).eq("id", lessonId);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha na transcrição" }, { status: 500 });
  }
}
