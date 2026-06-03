"use client";

import { useEffect, useState } from "react";
import { Download, Video, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RecordingSection({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

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
          <a href={url} download className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            <Download size={16} /> Baixar gravação
          </a>
        </>
      )}
    </section>
  );
}
