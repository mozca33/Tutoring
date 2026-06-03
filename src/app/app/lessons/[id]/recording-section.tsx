"use client";

import { useEffect, useState } from "react";
import { Download, Video, Loader2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RecordingSection({
  path, lessonId, isTeacher, transcript: initialTranscript,
}: {
  path: string;
  lessonId: string;
  isTeacher: boolean;
  transcript: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [transcribing, setTranscribing] = useState(false);
  const [tError, setTError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from("recordings").createSignedUrl(path, 3600);
      if (!active) return;
      if (error || !data) setError(true);
      else setUrl(data.signedUrl);
    })();
    return () => { active = false; };
  }, [path]);

  async function transcribe() {
    setTranscribing(true);
    setTError(null);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setTranscript(data.transcript);
    } catch (e) {
      setTError(e instanceof Error ? e.message : "Erro");
    }
    setTranscribing(false);
  }

  return (
    <section className="bg-surface border border-border rounded-xl p-6 space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2"><Video size={18} /> Gravação da aula</h2>
      {error ? (
        <p className="text-sm text-muted">A gravação ainda está sendo processada. Tente novamente em alguns minutos.</p>
      ) : !url ? (
        <div className="flex items-center gap-2 text-muted text-sm"><Loader2 size={16} className="animate-spin" /> Carregando…</div>
      ) : (
        <>
          <video controls src={url} className="w-full max-h-[60vh] rounded-lg bg-black" />
          <div className="flex items-center gap-4">
            <a href={url} download className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              <Download size={16} /> Baixar gravação
            </a>
            {isTeacher && !transcript && (
              <button onClick={transcribe} disabled={transcribing}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50">
                <FileText size={16} /> {transcribing ? "Transcrevendo…" : "Gerar transcrição"}
              </button>
            )}
          </div>
          {tError && <p className="text-sm text-red-600 dark:text-red-400">{tError}</p>}
        </>
      )}

      {transcript && (
        <div className="mt-2">
          <h3 className="text-sm font-medium mb-1 flex items-center gap-1.5"><FileText size={15} /> Transcrição</h3>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-background p-3 text-sm whitespace-pre-wrap">
            {transcript}
          </div>
        </div>
      )}
    </section>
  );
}
