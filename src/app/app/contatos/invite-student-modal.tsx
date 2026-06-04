"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import AddContactForm from "./add-contact-form";

export default function InviteStudentModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium transition-colors">
        <UserPlus size={16} /> Convidar aluno
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold">Convidar aluno</h3>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-muted hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-muted">Informe o e-mail (e o nome, se quiser). O aluno recebe um link para criar a senha — a conta já fica vinculada a você.</p>
              <AddContactForm />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
