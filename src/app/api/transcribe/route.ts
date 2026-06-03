import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Transcreve a gravação usando a API do Gemini (Files API + generateContent).
async function geminiTranscribe(blob: Blob, mimeType: string, apiKey: string): Promise<string> {
  const size = blob.size;

  // 1) Inicia upload resumável
  const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(size),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "aula" } }),
  });
  const uploadUrl = start.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) throw new Error("Falha ao iniciar upload no Gemini");

  // 2) Envia os bytes
  const up = await fetch(uploadUrl, {
    method: "POST",
    headers: { "X-Goog-Upload-Command": "upload, finalize", "X-Goog-Upload-Offset": "0", "Content-Length": String(size) },
    body: blob,
  });
  const upJson = await up.json();
  let file = upJson.file;
  if (!file?.name) throw new Error("Upload do Gemini sem arquivo");

  // 3) Aguarda processamento
  let tries = 0;
  while (file.state === "PROCESSING" && tries < 40) {
    await sleep(3000);
    tries++;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`);
    file = await r.json();
  }
  if (file.state !== "ACTIVE") throw new Error("Gemini não processou o arquivo a tempo");

  // 4) Gera a transcrição
  const gen = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { file_data: { mime_type: mimeType, file_uri: file.uri } },
          { text: "Transcreva integralmente o áudio desta aula em português do Brasil, com pontuação e parágrafos. Responda apenas com a transcrição, sem comentários." },
        ],
      }],
    }),
  });
  const genJson = await gen.json();
  if (!gen.ok) throw new Error(`Gemini: ${JSON.stringify(genJson).slice(0, 300)}`);
  const text = genJson.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Transcrição vazia");
  return text;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Transcrição não configurada (GEMINI_API_KEY)." }, { status: 500 });

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
    const mime = lesson.recording_path.endsWith(".mp4") ? "video/mp4" : (blob.type || "video/mp4");

    const transcript = await geminiTranscribe(blob, mime, apiKey);

    await supabase.from("lessons").update({ transcript, transcript_status: "done" }).eq("id", lessonId);
    return NextResponse.json({ ok: true, transcript });
  } catch (e) {
    await supabase.from("lessons").update({ transcript_status: "failed" }).eq("id", lessonId);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha na transcrição" }, { status: 500 });
  }
}
