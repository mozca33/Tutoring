"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { PenTool } from "lucide-react";

const LessonBoard = dynamic(() => import("./lesson-board"), { ssr: false });

export default function BoardLauncher({
  lessonId, currentUserId, canDraw,
}: {
  lessonId: string;
  currentUserId: string;
  canDraw: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface transition-colors">
        <PenTool size={16} /> Quadro
      </button>
      {open && <LessonBoard lessonId={lessonId} currentUserId={currentUserId} canDraw={canDraw} onClose={() => setOpen(false)} />}
    </>
  );
}
