"use client";

import { useEffect, useState } from "react";
import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { Video, Clock, Lock } from "lucide-react";
import RoomControls from "./room-controls";

// Janela de entrada: abre 10 min antes e fecha 30 min após o término.
const OPEN_BEFORE_MS = 10 * 60 * 1000;
const GRACE_AFTER_MS = 30 * 60 * 1000;

export default function LessonRoom({
  lessonId,
  scheduledAt,
  durationMinutes,
  status,
}: {
  lessonId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Reavalia a janela a cada 30s para liberar o botão na hora certa.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(scheduledAt).getTime();
  const end = start + durationMinutes * 60 * 1000;
  const opensAt = start - OPEN_BEFORE_MS;
  const closed = status === "cancelled" || status === "completed";
  const tooEarly = now < opensAt;
  const tooLate = now > end + GRACE_AFTER_MS;
  const joinable = !closed && !tooEarly && !tooLate;

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/livekit-token?lessonId=${lessonId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao obter token");
      setToken(data.token);
      setWsUrl(data.wsUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setJoining(false);
    }
  }

  function leave() {
    setToken(null);
    setWsUrl(null);
  }

  // Erros de dispositivo (câmera/microfone em uso) não devem derrubar a sala.
  function onRoomError(e: Error) {
    setError(`Não foi possível iniciar a câmera/microfone: ${e.message}. Verifique se outro app está usando a câmera e permita o acesso no navegador.`);
  }

  if (!token || !wsUrl) {
    return (
      <div className="bg-slate-900 text-white rounded-xl p-10 text-center">
        <div className="mx-auto mb-3 w-fit">
          {joinable ? <Video size={32} className="text-indigo-400" /> : <Lock size={32} className="text-slate-400" />}
        </div>
        <p className="mb-1 text-lg">Sala de aula ao vivo</p>

        {joinable ? (
          <>
            <button onClick={join} disabled={joining}
              className="mt-3 bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-medium disabled:opacity-50 transition-colors">
              {joining ? "Entrando..." : "Entrar na sala"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-300 flex items-center justify-center gap-1.5">
            <Clock size={15} />
            {closed
              ? "Esta aula não está mais disponível."
              : tooEarly
                ? `A sala abre 10 minutos antes do horário (${new Date(opensAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}).`
                : "Esta aula já terminou."}
          </p>
        )}
        {error && <p className="text-red-300 text-sm mt-3 max-w-md mx-auto">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-sm px-3 py-2">
          {error}
        </div>
      )}
      <div style={{ height: "70vh" }} className="rounded-xl overflow-hidden flex flex-col">
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect
          data-lk-theme="default"
          video
          audio
          onDisconnected={leave}
          onError={onRoomError}
          style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
        >
          <RoomControls />
          <div style={{ flex: 1, minHeight: 0 }}>
            <VideoConference />
          </div>
        </LiveKitRoom>
      </div>
    </div>
  );
}
