"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import FilePreview from "@/components/file-preview";
import PdfAnnotator from "@/components/pdf-annotator-dynamic";
import FileActionsMenu from "@/components/file-actions-menu";

export type MaterialGroup = {
  lessonId: string;
  lessonTitle: string;
  scheduledAt: string;
  files: {
    id: string;
    file_name: string;
    storage_path: string;
    size_bytes: number | null;
    created_at: string;
  }[];
};

const PAGE = 10;

export default function MaterialsList({ groups, currentUserId }: { groups: MaterialGroup[]; currentUserId: string }) {
  const [preview, setPreview] = useState<{ name: string; path: string } | null>(null);
  const [annotate, setAnnotate] = useState<{ id: string; name: string; path: string } | null>(null);
  const [shown, setShown] = useState(PAGE);

  async function download(path: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("lesson-files").createSignedUrl(path, 60);
    if (error || !data) return alert("Erro ao gerar link");
    window.open(data.signedUrl, "_blank");
  }

  if (groups.length === 0) {
    return <p className="text-muted text-sm">Nenhum material enviado nas suas aulas ainda.</p>;
  }

  const visible = groups.slice(0, shown);

  return (
    <div className="space-y-6">
      {visible.map((g) => (
        <section key={g.lessonId} className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="min-w-0">
              <Link href={`/app/lessons/${g.lessonId}`} className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400 truncate block">
                {g.lessonTitle}
              </Link>
              <p className="text-xs text-muted">{new Date(g.scheduledAt).toLocaleDateString("pt-BR")}</p>
            </div>
            <span className="text-xs text-muted shrink-0">{g.files.length} arquivo{g.files.length > 1 ? "s" : ""}</span>
          </div>
          <ul className="divide-y divide-border">
            {g.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3 hover:bg-background transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.file_name}</p>
                    <p className="text-xs text-muted">
                      {f.size_bytes ? `${(f.size_bytes / 1024).toFixed(1)} KB · ` : ""}
                      {new Date(f.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <FileActionsMenu
                  onView={() => setPreview({ name: f.file_name, path: f.storage_path })}
                  onAnnotate={f.file_name.toLowerCase().endsWith(".pdf") ? () => setAnnotate({ id: f.id, name: f.file_name, path: f.storage_path }) : undefined}
                  onDownload={() => download(f.storage_path)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {shown < groups.length && (
        <div className="text-center">
          <button onClick={() => setShown((s) => s + PAGE)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface transition-colors">
            Ver mais ({groups.length - shown})
          </button>
        </div>
      )}
      {preview && (
        <FilePreview fileName={preview.name} storagePath={preview.path} onClose={() => setPreview(null)} />
      )}
      {annotate && (
        <PdfAnnotator fileId={annotate.id} fileName={annotate.name} storagePath={annotate.path}
          currentUserId={currentUserId} onClose={() => setAnnotate(null)} />
      )}
    </div>
  );
}
