"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { PenTool, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LessonBoard = dynamic(() => import("./lesson-board"), { ssr: false });

export default function BoardLauncher({
  lessonId, currentUserId, isTeacher, lessonActive, initialAllowed = false,
}: {
  lessonId: string;
  currentUserId: string;
  isTeacher: boolean;
  lessonActive: boolean;
  initialAllowed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chRef = useRef<any>(null);

  // Sinal de abertura do quadro (professor abre → aluno é avisado)
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`boardsignal:${lessonId}`);
    ch.on("broadcast", { event: "open" }, () => { if (!isTeacher) setInvite(true); }).subscribe();
    chRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [lessonId, isTeacher]);

  function openBoard() {
    setOpen(true);
    setInvite(false);
    if (isTeacher) chRef.current?.send({ type: "broadcast", event: "open", payload: {} });
  }

  return (
    <>
      <button onClick={openBoard}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface transition-colors">
        <PenTool size={16} /> Quadro
      </button>

      {invite && !open && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-surface border border-border rounded-xl shadow-xl px-4 py-3">
          <span className="text-sm">O professor abriu o <strong>quadro branco</strong>.</span>
          <button onClick={openBoard} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-sm font-medium">Abrir</button>
          <button onClick={() => setInvite(false)} className="text-muted hover:text-foreground"><X size={16} /></button>
        </div>
      )}

      {open && <LessonBoard lessonId={lessonId} currentUserId={currentUserId} isTeacher={isTeacher} lessonActive={lessonActive} initialAllowed={initialAllowed} onClose={() => setOpen(false)} />}
    </>
  );
}
