"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { X, MessageSquarePlus, Trash2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Annotation = {
  id: string;
  file_id: string;
  author_id: string;
  page: number;
  x: number;
  y: number;
  content: string;
  created_at: string;
};

export default function PdfAnnotator({
  fileId,
  fileName,
  storagePath,
  currentUserId,
  onClose,
}: {
  fileId: string;
  fileName: string;
  storagePath: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [addMode, setAddMode] = useState(false);
  const [draft, setDraft] = useState<{ page: number; x: number; y: number } | null>(null);
  const [draftText, setDraftText] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [width, setWidth] = useState(680);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.storage.from("lesson-files").createSignedUrl(storagePath, 3600);
      if (on && data) setUrl(data.signedUrl);
      const { data: ann } = await supabase.from("file_annotations").select("*").eq("file_id", fileId).order("created_at");
      if (on && ann) setAnnotations(ann as Annotation[]);
    })();
    return () => { on = false; };
  }, [storagePath, fileId]);

  // Realtime das anotações
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`ann:${fileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "file_annotations", filter: `file_id=eq.${fileId}` },
        (p) => {
          if (p.eventType === "INSERT") setAnnotations((prev) => prev.some((a) => a.id === (p.new as Annotation).id) ? prev : [...prev, p.new as Annotation]);
          else if (p.eventType === "DELETE") setAnnotations((prev) => prev.filter((a) => a.id !== (p.old as { id: string }).id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fileId]);

  useEffect(() => {
    function measure() {
      if (containerRef.current) setWidth(Math.min(containerRef.current.clientWidth - 32, 820));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [url]);

  function onPageClick(e: React.MouseEvent, page: number) {
    if (!addMode) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDraft({ page, x, y });
    setDraftText("");
    setAddMode(false);
  }

  async function saveDraft() {
    if (!draft || !draftText.trim()) { setDraft(null); return; }
    const supabase = createClient();
    const { data, error } = await supabase.from("file_annotations").insert({
      file_id: fileId, author_id: currentUserId, page: draft.page, x: draft.x, y: draft.y, content: draftText.trim(),
    }).select("*").single();
    setDraft(null);
    if (!error && data) setAnnotations((prev) => prev.some((a) => a.id === data.id) ? prev : [...prev, data as Annotation]);
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("file_annotations").delete().eq("id", id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }

  const numbered = annotations.map((a, i) => ({ ...a, n: i + 1 }));

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60">
      {/* PDF */}
      <div ref={containerRef} className="flex-1 overflow-y-auto bg-slate-800 p-4">
        <div className="flex items-center justify-between mb-3 sticky top-0 bg-slate-800 py-2 z-10">
          <p className="text-white font-medium truncate">{fileName}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setAddMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${addMode ? "bg-indigo-600 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}>
              <MessageSquarePlus size={16} /> {addMode ? "Clique no PDF…" : "Adicionar anotação"}
            </button>
            <button onClick={onClose} className="text-white/80 hover:text-white lg:hidden"><X size={22} /></button>
          </div>
        </div>

        {url && (
          <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<p className="text-white/70 text-sm">Carregando PDF…</p>}
            error={<p className="text-red-300 text-sm">Não foi possível carregar o PDF.</p>}>
            {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
              <div key={page} className="relative mx-auto mb-4 shadow-lg" style={{ width }}>
                <div onClick={(e) => onPageClick(e, page)} className={addMode ? "cursor-crosshair" : ""}>
                  <Page pageNumber={page} width={width} renderTextLayer renderAnnotationLayer={false} />
                </div>
                {/* Marcadores */}
                {numbered.filter((a) => a.page === page).map((a) => (
                  <button key={a.id} onClick={() => setActive(a.id === active ? null : a.id)}
                    style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-full h-6 w-6 rounded-full text-xs font-bold text-white grid place-items-center shadow ${a.id === active ? "bg-amber-500 ring-2 ring-amber-300" : "bg-indigo-600"}`}>
                    {a.n}
                  </button>
                ))}
                {/* Rascunho */}
                {draft?.page === page && (
                  <div style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
                    className="absolute -translate-x-1/2 mt-1 w-60 bg-surface border border-border rounded-lg shadow-xl p-2 z-20">
                    <textarea autoFocus value={draftText} onChange={(e) => setDraftText(e.target.value)}
                      className="w-full rounded border border-border bg-surface px-2 py-1 text-sm text-foreground" rows={3}
                      placeholder="Escreva a anotação…" />
                    <div className="flex justify-end gap-2 mt-1">
                      <button onClick={() => setDraft(null)} className="text-xs px-2 py-1 rounded border border-border">Cancelar</button>
                      <button onClick={saveDraft} className="text-xs px-2 py-1 rounded bg-indigo-600 text-white">Salvar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Document>
        )}
      </div>

      {/* Painel de anotações */}
      <aside className="w-80 shrink-0 bg-surface border-l border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold">Anotações ({annotations.length})</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {annotations.length === 0 ? (
            <p className="text-sm text-muted">Clique em “Adicionar anotação” e depois no ponto do PDF para criar uma.</p>
          ) : (
            numbered.map((a) => (
              <div key={a.id} onClick={() => setActive(a.id === active ? null : a.id)}
                className={`rounded-lg border p-3 cursor-pointer transition-colors ${a.id === active ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40" : "border-border hover:bg-background"}`}>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-muted"><MapPin size={12} /> Pág. {a.page} · #{a.n}</span>
                  {a.author_id === currentUserId && (
                    <button onClick={(e) => { e.stopPropagation(); remove(a.id); }} className="text-red-600 dark:text-red-400"><Trash2 size={14} /></button>
                  )}
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{a.content}</p>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
