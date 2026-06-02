"use client";

import { useState } from "react";
import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { Video } from "lucide-react";

export default function LessonRoom({ lessonId }: { lessonId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // Fecha a sala e volta para a tela de entrada
    setToken(null);
    setWsUrl(null);
  }

  function onRoomError(e: Error) {
    setError(`Falha na conexão de vídeo: ${e.message}`);
    leave();
  }

  if (!token || !wsUrl) {
    return (
      <div className="bg-slate-900 text-white rounded-xl p-10 text-center">
        <Video size={32} className="mx-auto mb-3 text-indigo-400" />
        <p className="mb-4 text-lg">Sala de aula ao vivo</p>
        <button onClick={join} disabled={joining}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-medium disabled:opacity-50 transition-colors">
          {joining ? "Entrando..." : "Entrar na sala"}
        </button>
        {error && <p className="text-red-300 text-sm mt-3">{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ height: "70vh" }} className="rounded-xl overflow-hidden">
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect
        data-lk-theme="default"
        video
        audio
        onDisconnected={leave}
        onError={onRoomError}
        style={{ height: "100%" }}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
