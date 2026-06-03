"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  Pencil, ArrowUpRight, Circle, Type, Undo2, Trash2, X, ChevronLeft, ChevronRight, ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Tool = "pen" | "arrow" | "ellipse" | "text";
type StrokeData = { points?: number[][]; x1?: number; y1?: number; x2?: number; y2?: number; text?: string };
type Stroke = { id: string; author_id: string; tool: Tool; color: string; data: StrokeData };
type Material = { id: string; file_name: string; storage_path: string; lessonTitle?: string | null };

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#111827", "#ffffff"];

export default function LessonBoard({
  lessonId, currentUserId, canDraw, onClose,
}: {
  lessonId: string;
  currentUserId: string;
  canDraw: boolean;
  onClose: () => void;
}) {
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ef4444");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [live, setLive] = useState<Record<string, Stroke>>({});
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [bg, setBg] = useState<{ kind: "none" | "image" | "pdf"; url?: string; page: number; numPages: number }>({ kind: "none", page: 1, numPages: 1 });
  const [showBgPicker, setShowBgPicker] = useState(false);

  const surfaceRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chanRef = useRef<any>(null);
  const lastSent = useRef(0);

  // Carrega traços salvos + materiais
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.from("board_strokes").select("id, author_id, tool, color, data").eq("lesson_id", lessonId).order("created_at");
      if (data) setStrokes(data as Stroke[]);
      // Todos os materiais acessíveis (RLS já restringe às aulas do usuário),
      // tanto desta aula quanto das demais.
      const { data: files } = await supabase
        .from("lesson_files")
        .select("id, file_name, storage_path, lesson_id, lesson:lesson_id(title)")
        .order("created_at", { ascending: false })
        .returns<{ id: string; file_name: string; storage_path: string; lesson_id: string; lesson: { title: string } | null }[]>();
      setMaterials((files ?? []).map((f) => ({
        id: f.id, file_name: f.file_name, storage_path: f.storage_path,
        lessonTitle: f.lesson_id === lessonId ? "Esta aula" : (f.lesson?.title ?? null),
      })));
    })();
  }, [lessonId]);

  // Realtime: broadcast (ao vivo) + postgres_changes (persistido)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`board:${lessonId}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "progress" }, ({ payload }) => {
        setLive((prev) => ({ ...prev, [payload.author_id]: payload as Stroke }));
      })
      .on("broadcast", { event: "end" }, ({ payload }) => {
        setLive((prev) => { const n = { ...prev }; delete n[payload.author_id]; return n; });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "board_strokes", filter: `lesson_id=eq.${lessonId}` }, (p) => {
        const s = p.new as Stroke;
        setStrokes((prev) => prev.some((x) => x.id === s.id) ? prev : [...prev, s]);
        setLive((prev) => { const n = { ...prev }; delete n[s.author_id]; return n; });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "board_strokes", filter: `lesson_id=eq.${lessonId}` }, (p) => {
        const old = p.old as { id: string };
        setStrokes((prev) => prev.filter((x) => x.id !== old.id));
      })
      .subscribe();
    chanRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [lessonId]);

  function pt(e: React.PointerEvent): [number, number] {
    const r = surfaceRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  const broadcast = useCallback((s: Stroke) => {
    const now = Date.now();
    if (now - lastSent.current < 35) return;
    lastSent.current = now;
    chanRef.current?.send({ type: "broadcast", event: "progress", payload: s });
  }, []);

  function onDown(e: React.PointerEvent) {
    if (!canDraw) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const [x, y] = pt(e);
    if (tool === "text") { setTextDraft({ x, y, value: "" }); return; }
    const id = crypto.randomUUID();
    const base: Stroke = { id, author_id: currentUserId, tool, color, data: {} };
    if (tool === "pen") base.data = { points: [[x, y]] };
    else base.data = { x1: x, y1: y, x2: x, y2: y };
    setDraft(base);
  }

  function onMove(e: React.PointerEvent) {
    if (!draft) return;
    const [x, y] = pt(e);
    let next: Stroke;
    if (draft.tool === "pen") next = { ...draft, data: { points: [...(draft.data.points ?? []), [x, y]] } };
    else next = { ...draft, data: { ...draft.data, x2: x, y2: y } };
    setDraft(next);
    broadcast(next);
  }

  async function commit(s: Stroke) {
    chanRef.current?.send({ type: "broadcast", event: "end", payload: { author_id: currentUserId } });
    setStrokes((prev) => [...prev, s]);
    await createClient().from("board_strokes").insert({ id: s.id, lesson_id: lessonId, author_id: currentUserId, tool: s.tool, color: s.color, data: s.data });
  }

  function onUp() {
    if (!draft) return;
    commit(draft);
    setDraft(null);
  }

  async function commitText() {
    if (!textDraft || !textDraft.value.trim()) { setTextDraft(null); return; }
    const s: Stroke = { id: crypto.randomUUID(), author_id: currentUserId, tool: "text", color, data: { x1: textDraft.x, y1: textDraft.y, text: textDraft.value.trim() } };
    setTextDraft(null);
    await commit(s);
  }

  async function undo() {
    const mine = [...strokes].reverse().find((s) => s.author_id === currentUserId);
    if (!mine) return;
    setStrokes((prev) => prev.filter((x) => x.id !== mine.id));
    await createClient().from("board_strokes").delete().eq("id", mine.id);
  }

  async function clearAll() {
    if (!confirm("Limpar todo o quadro?")) return;
    setStrokes([]);
    await createClient().from("board_strokes").delete().eq("lesson_id", lessonId);
  }

  async function pickBackground(m: Material) {
    setShowBgPicker(false);
    const { data } = await createClient().storage.from("lesson-files").createSignedUrl(m.storage_path, 3600);
    if (!data) return;
    const isPdf = m.file_name.toLowerCase().endsWith(".pdf");
    setBg({ kind: isPdf ? "pdf" : "image", url: data.signedUrl, page: 1, numPages: 1 });
  }

  // ===== Render helpers =====
  function renderStroke(s: Stroke, W: number, H: number, key: string) {
    const c = s.color;
    if (s.tool === "pen" && s.data.points) {
      return <polyline key={key} points={s.data.points.map(([x, y]) => `${x * W},${y * H}`).join(" ")} fill="none" stroke={c} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />;
    }
    if (s.tool === "arrow") {
      return <line key={key} x1={(s.data.x1 ?? 0) * W} y1={(s.data.y1 ?? 0) * H} x2={(s.data.x2 ?? 0) * W} y2={(s.data.y2 ?? 0) * H} stroke={c} strokeWidth={3} markerEnd={`url(#ah-${c.replace("#", "")})`} />;
    }
    if (s.tool === "ellipse") {
      const x1 = (s.data.x1 ?? 0) * W, y1 = (s.data.y1 ?? 0) * H, x2 = (s.data.x2 ?? 0) * W, y2 = (s.data.y2 ?? 0) * H;
      return <ellipse key={key} cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={Math.abs(x2 - x1) / 2} ry={Math.abs(y2 - y1) / 2} fill="none" stroke={c} strokeWidth={3} />;
    }
    if (s.tool === "text") {
      return <text key={key} x={(s.data.x1 ?? 0) * W} y={(s.data.y1 ?? 0) * H} fill={c} fontSize={18} fontWeight={600}>{s.data.text}</text>;
    }
    return null;
  }

  const [size, setSize] = useState({ w: 1, h: 1 });
  useEffect(() => {
    function measure() { if (surfaceRef.current) setSize({ w: surfaceRef.current.clientWidth, h: surfaceRef.current.clientHeight }); }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [bg.kind, bg.url]);

  const allStrokes = [...strokes, ...Object.values(live), ...(draft ? [draft] : [])];
  const usedColors = Array.from(new Set(allStrokes.filter((s) => s.tool === "arrow").map((s) => s.color)));

  const toolBtn = (t: Tool, icon: React.ReactNode, label: string) => (
    <button onClick={() => setTool(t)} title={label} disabled={!canDraw}
      className={`p-2 rounded-lg disabled:opacity-40 ${tool === t ? "bg-indigo-600 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}>{icon}</button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 flex-wrap">
        {canDraw ? (
          <>
            {toolBtn("pen", <Pencil size={18} />, "Caneta")}
            {toolBtn("arrow", <ArrowUpRight size={18} />, "Seta")}
            {toolBtn("ellipse", <Circle size={18} />, "Círculo")}
            {toolBtn("text", <Type size={18} />, "Texto")}
            <div className="flex items-center gap-1 ml-1">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{ background: c }}
                  className={`h-6 w-6 rounded-full border ${color === c ? "ring-2 ring-white" : "border-white/30"}`} />
              ))}
            </div>
            <button onClick={undo} title="Desfazer" className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"><Undo2 size={18} /></button>
            <button onClick={clearAll} title="Limpar" className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"><Trash2 size={18} /></button>
            <button onClick={() => setShowBgPicker((v) => !v)} title="Fundo" className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"><ImageIcon size={18} /></button>
          </>
        ) : (
          <span className="text-white/70 text-sm">Quadro da aula (somente leitura)</span>
        )}
        {bg.kind === "pdf" && (
          <div className="flex items-center gap-1 text-white text-sm">
            <button onClick={() => setBg((b) => ({ ...b, page: Math.max(1, b.page - 1) }))} className="p-1 rounded bg-white/10"><ChevronLeft size={16} /></button>
            {bg.page}/{bg.numPages}
            <button onClick={() => setBg((b) => ({ ...b, page: Math.min(b.numPages, b.page + 1) }))} className="p-1 rounded bg-white/10"><ChevronRight size={16} /></button>
          </div>
        )}
        <button onClick={onClose} className="ml-auto p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"><X size={18} /></button>

        {showBgPicker && (
          <div className="absolute top-12 left-3 z-50 w-64 bg-surface border border-border rounded-lg shadow-xl p-2 max-h-72 overflow-y-auto">
            <button onClick={() => { setBg({ kind: "none", page: 1, numPages: 1 }); setShowBgPicker(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-background">Quadro em branco</button>
            {materials.length === 0 && <p className="text-xs text-muted px-2 py-1">Sem materiais para usar de fundo.</p>}
            {materials.map((m) => (
              <button key={m.id} onClick={() => pickBackground(m)} className="w-full text-left px-2 py-1.5 rounded hover:bg-background">
                <span className="block text-sm truncate">{m.file_name}</span>
                {m.lessonTitle && <span className="block text-[11px] text-muted truncate">{m.lessonTitle}</span>}
              </button>
            ))}
            <p className="text-[11px] text-muted px-2 pt-1">PPT/DOCX: exporte para PDF para usar de fundo.</p>
          </div>
        )}
      </div>

      {/* Surface */}
      <div className="flex-1 overflow-auto grid place-items-center p-4">
        <div ref={surfaceRef} className="relative bg-white shadow-lg" style={{ width: "min(90vw, 1000px)", aspectRatio: "16/10" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
          {bg.kind === "image" && bg.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bg.url} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
          )}
          {bg.kind === "pdf" && bg.url && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <Document file={bg.url} onLoadSuccess={({ numPages }) => setBg((b) => ({ ...b, numPages }))}>
                <Page pageNumber={bg.page} width={size.w} renderTextLayer={false} renderAnnotationLayer={false} />
              </Document>
            </div>
          )}
          <svg className="absolute inset-0 w-full h-full" style={{ touchAction: "none", cursor: canDraw ? "crosshair" : "default" }}>
            <defs>
              {usedColors.map((c) => (
                <marker key={c} id={`ah-${c.replace("#", "")}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                  <path d="M0,0 L8,3 L0,6 Z" fill={c} />
                </marker>
              ))}
            </defs>
            {allStrokes.map((s, i) => renderStroke(s, size.w, size.h, s.id + i))}
          </svg>
          {textDraft && (
            <input autoFocus value={textDraft.value}
              onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") commitText(); if (e.key === "Escape") setTextDraft(null); }}
              onBlur={commitText}
              style={{ left: `${textDraft.x * 100}%`, top: `${textDraft.y * 100}%`, color }}
              className="absolute -translate-y-1/2 bg-transparent border-b border-current outline-none text-base font-semibold" placeholder="texto…" />
          )}
        </div>
      </div>
    </div>
  );
}
