"use client";

import { useState } from "react";
import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

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

  if (!token || !wsUrl) {
    return (
      <div className="bg-slate-900 text-white rounded-xl p-10 text-center">
        <p className="mb-4 text-lg">Sala de aula ao vivo</p>
        <button onClick={join} disabled={joining}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-medium disabled:opacity-50">
          {joining ? "Entrando..." : "Entrar na sala"}
        </button>
        {error && <p className="text-red-300 text-sm mt-3">{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ height: "70vh" }} className="rounded-xl overflow-hidden">
      <LiveKitRoom token={token} serverUrl={wsUrl} connect data-lk-theme="default" video audio>
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
