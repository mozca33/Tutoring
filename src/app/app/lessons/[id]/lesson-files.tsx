"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FileRow = {
  id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  uploader_id: string;
  created_at: string;
};

export default function LessonFiles({
  lessonId,
  currentUserId,
  initial,
}: {
  lessonId: string;
  currentUserId: string;
  initial: FileRow[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${lessonId}/${crypto.randomUUID()}_${safeName}`;
    const { error: upErr } = await supabase.storage.from("lesson-files").upload(path, file);
    if (upErr) { setUploading(false); setError(upErr.message); return; }

    const { data, error: insertErr } = await supabase
      .from("lesson_files")
      .insert({
        lesson_id: lessonId,
        uploader_id: currentUserId,
        storage_path: path,
        file_name: file.name,
        size_bytes: file.size,
        mime_type: file.type,
      })
      .select()
      .single();
    setUploading(false);
    e.target.value = "";
    if (insertErr || !data) { setError(insertErr?.message ?? "Erro"); return; }
    setFiles([data as FileRow, ...files]);
    router.refresh();
  }

  async function download(f: FileRow) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("lesson-files")
      .createSignedUrl(f.storage_path, 60);
    if (error || !data) return alert("Erro ao gerar link");
    window.open(data.signedUrl, "_blank");
  }

  async function remove(f: FileRow) {
    if (!confirm(`Remover "${f.file_name}"?`)) return;
    const supabase = createClient();
    await supabase.storage.from("lesson-files").remove([f.storage_path]);
    await supabase.from("lesson_files").delete().eq("id", f.id);
    setFiles(files.filter((x) => x.id !== f.id));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-700">
          {uploading ? "Enviando..." : "Enviar arquivo"}
        </span>
        <input type="file" className="hidden" onChange={onFileChange} disabled={uploading} />
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {files.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhum material enviado.</p>
      ) : (
        <ul className="divide-y border rounded-lg">
          {files.map((f) => (
            <li key={f.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{f.file_name}</p>
                <p className="text-xs text-slate-500">
                  {f.size_bytes ? `${(f.size_bytes / 1024).toFixed(1)} KB` : ""}
                  {f.mime_type ? ` · ${f.mime_type}` : ""}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => download(f)} className="text-indigo-600 hover:underline">Baixar</button>
                {f.uploader_id === currentUserId && (
                  <button onClick={() => remove(f)} className="text-red-600 hover:underline">Remover</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
