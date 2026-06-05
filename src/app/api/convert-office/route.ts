import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const CC = "https://api.cloudconvert.com/v2";

// Converte PPT/PPTX/DOC/DOCX (de lesson-files) para PDF via CloudConvert e
// guarda o PDF no Storage (pasta converted/). Retorna o storage_path do PDF.
// O arquivo da aula é enviado ao CloudConvert (serviço externo) durante a conversão.
export async function POST(req: Request) {
  const key = process.env.CLOUDCONVERT_API_KEY;
  if (!key) return NextResponse.json({ error: "Conversor não configurado (CLOUDCONVERT_API_KEY)." }, { status: 500 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Servidor não configurado." }, { status: 500 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`convert:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Muitas conversões em pouco tempo. Aguarde um minuto." }, { status: 429 });
  }

  const { storagePath } = await req.json().catch(() => ({}));
  if (!storagePath || typeof storagePath !== "string") {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }
  const lower = storagePath.toLowerCase();
  if (!/\.(pptx?|docx?)$/.test(lower)) {
    return NextResponse.json({ error: "Formato não suportado." }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  // Já convertido antes? Reaproveita.
  const outPath = `converted/${storagePath.replace(/[^a-zA-Z0-9/_-]/g, "_")}.pdf`;
  const { data: existing } = await admin.storage.from("lesson-files").list(outPath.split("/").slice(0, -1).join("/"), { search: outPath.split("/").pop() });
  if (existing && existing.some((f) => outPath.endsWith(f.name))) {
    return NextResponse.json({ storagePath: outPath });
  }

  // URL assinada do arquivo de origem para o CloudConvert importar.
  const { data: signed, error: signErr } = await admin.storage.from("lesson-files").createSignedUrl(storagePath, 600);
  if (signErr || !signed) return NextResponse.json({ error: "Não foi possível ler o arquivo." }, { status: 400 });

  // Cria o job (import → convert → export) e espera terminar (sync wait).
  const auth = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const jobRes = await fetch(`${CC}/jobs`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      tasks: {
        "import-1": { operation: "import/url", url: signed.signedUrl },
        "convert-1": { operation: "convert", input: "import-1", output_format: "pdf" },
        "export-1": { operation: "export/url", input: "convert-1", inline: false, archive_multiple_files: false },
      },
    }),
  });
  if (!jobRes.ok) return NextResponse.json({ error: "Falha ao iniciar a conversão." }, { status: 502 });
  const job = await jobRes.json();
  const jobId = job?.data?.id;
  if (!jobId) return NextResponse.json({ error: "Resposta inválida do conversor." }, { status: 502 });

  // Aguarda a conclusão do export-1 (polling com teto).
  let fileUrl: string | null = null;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const sres = await fetch(`${CC}/jobs/${jobId}?include=tasks`, { headers: { Authorization: `Bearer ${key}` } });
    const sjob = await sres.json();
    const status = sjob?.data?.status;
    if (status === "error") return NextResponse.json({ error: "Conversão falhou." }, { status: 502 });
    if (status === "finished") {
      const exp = (sjob.data.tasks ?? []).find((t: { name: string }) => t.name === "export-1");
      fileUrl = exp?.result?.files?.[0]?.url ?? null;
      break;
    }
  }
  if (!fileUrl) return NextResponse.json({ error: "Conversão demorou demais." }, { status: 504 });

  // Baixa o PDF e sobe no Storage.
  const pdfRes = await fetch(fileUrl);
  if (!pdfRes.ok) return NextResponse.json({ error: "Não foi possível baixar o PDF." }, { status: 502 });
  const bytes = new Uint8Array(await pdfRes.arrayBuffer());
  const { error: upErr } = await admin.storage.from("lesson-files").upload(outPath, bytes, { contentType: "application/pdf", upsert: true });
  if (upErr) return NextResponse.json({ error: "Falha ao salvar o PDF convertido." }, { status: 500 });

  return NextResponse.json({ storagePath: outPath });
}
