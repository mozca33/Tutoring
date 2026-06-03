"use client";

import { useState } from "react";
import { MoreVertical, Eye, PencilLine, Download, Trash2 } from "lucide-react";

type Action = { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean };

export default function FileActionsMenu({
  onView, onAnnotate, onDownload, onRemove,
}: {
  onView?: () => void;
  onAnnotate?: () => void;
  onDownload?: () => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const actions: Action[] = [];
  if (onView) actions.push({ label: "Visualizar", icon: <Eye size={15} />, onClick: onView });
  if (onAnnotate) actions.push({ label: "Anotar", icon: <PencilLine size={15} />, onClick: onAnnotate });
  if (onDownload) actions.push({ label: "Baixar", icon: <Download size={15} />, onClick: onDownload });
  if (onRemove) actions.push({ label: "Remover", icon: <Trash2 size={15} />, onClick: onRemove, danger: true });

  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen((v) => !v)} aria-label="Mais ações"
        className="p-1.5 rounded-lg text-muted hover:bg-background hover:text-foreground transition-colors">
        <MoreVertical size={18} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 w-44 bg-surface border border-border rounded-lg shadow-xl py-1">
            {actions.map((a) => (
              <button key={a.label}
                onClick={() => { setOpen(false); a.onClick(); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-background transition-colors ${a.danger ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
