"use client";

import { useEffect, useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

// Parser CSV simples (lida com aspas e vírgulas dentro de campos).
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.slice(0, 200); // limita para não travar
}

export default function FilePreview({
  fileName,
  storagePath,
  bucket = "lesson-files",
  onClose,
}: {
  fileName: string;
  storagePath: string;
  bucket?: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [csv, setCsv] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ext = extOf(fileName);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);
      if (!active) return;
      if (error || !data) { setError("Não foi possível abrir o arquivo."); return; }
      setUrl(data.signedUrl);
      if (ext === "csv") {
        try {
          const res = await fetch(data.signedUrl);
          const text = await res.text();
          if (active) setCsv(parseCSV(text));
        } catch { if (active) setError("Falha ao ler o CSV."); }
      }
    })();
    return () => { active = false; };
  }, [storagePath, bucket, ext]);

  function body() {
    if (error) return <p className="text-red-600 dark:text-red-400 p-6 text-sm">{error}</p>;
    if (!url) return <div className="flex items-center justify-center h-full text-muted"><Loader2 className="animate-spin" /></div>;

    if (["mp3", "wav", "m4a", "ogg"].includes(ext)) {
      return <div className="p-8"><audio controls src={url} className="w-full" /></div>;
    }
    if (["mp4", "webm", "mov"].includes(ext)) {
      return <video controls src={url} className="w-full max-h-[75vh] bg-black" />;
    }
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={url} alt={fileName} className="max-h-[75vh] mx-auto object-contain" />;
    }
    if (ext === "pdf") {
      return <iframe src={url} title={fileName} className="w-full h-[75vh]" />;
    }
    if (ext === "csv") {
      if (!csv) return <div className="flex items-center justify-center h-40 text-muted"><Loader2 className="animate-spin" /></div>;
      return (
        <div className="overflow-auto max-h-[75vh] p-2">
          <table className="text-sm border-collapse w-full">
            <tbody>
              {csv.map((r, i) => (
                <tr key={i} className={i === 0 ? "font-semibold bg-background" : ""}>
                  {r.map((c, j) => <td key={j} className="border border-border px-2 py-1 whitespace-nowrap">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) {
      // Visualizador do Office (busca a URL assinada pública).
      const office = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
      return <iframe src={office} title={fileName} className="w-full h-[75vh]" />;
    }
    return (
      <div className="p-8 text-center text-muted text-sm">
        Não há pré-visualização para este tipo de arquivo.
        <a href={url} target="_blank" rel="noreferrer" className="block mt-2 text-indigo-600 dark:text-indigo-400 hover:underline">Abrir/baixar</a>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-4xl bg-surface border border-border rounded-xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="font-medium truncate">{fileName}</p>
          <div className="flex items-center gap-3 shrink-0">
            {url && <a href={url} target="_blank" rel="noreferrer" className="text-muted hover:text-foreground" title="Baixar"><Download size={18} /></a>}
            <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-foreground"><X size={20} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">{body()}</div>
      </div>
    </div>
  );
}
