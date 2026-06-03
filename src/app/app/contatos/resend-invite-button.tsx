"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export default function ResendInviteButton({ studentId }: { studentId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function resend() {
    setState("sending");
    const res = await fetch("/api/resend-invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    setState(res.ok ? "sent" : "idle");
  }

  return (
    <button onClick={resend} disabled={state !== "idle"}
      className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-60">
      <Send size={12} /> {state === "sent" ? "Convite reenviado" : state === "sending" ? "Enviando..." : "Reenviar convite"}
    </button>
  );
}
