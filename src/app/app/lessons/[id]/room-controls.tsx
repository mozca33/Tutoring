"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomContext, useMediaDeviceSelect } from "@livekit/components-react";
import { Track, RoomEvent, type RemoteParticipant, type LocalAudioTrack } from "livekit-client";
import { Volume2, VolumeX, Sparkles, Headphones, Circle, Square } from "lucide-react";

export default function RoomControls({ lessonId, isTeacher, initialRecording = false }: { lessonId: string; isTeacher: boolean; initialRecording?: boolean }) {
  const room = useRoomContext();
  const [recording, setRecording] = useState(initialRecording);
  const [recBusy, setRecBusy] = useState(false);

  async function toggleRecording() {
    setRecBusy(true);
    try {
      const endpoint = recording ? "/api/livekit-egress/stop" : "/api/livekit-egress/start";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setRecording(!recording);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Erro na gravação");
    }
    setRecBusy(false);
  }
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [noise, setNoise] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterRef = useRef<any>(null);

  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: "audiooutput", room });

  function applyVolume(p: RemoteParticipant, muted: boolean) {
    try { p.setVolume(muted ? 0 : 1); } catch {}
  }

  function toggleSpeaker() {
    const next = !speakerMuted;
    setSpeakerMuted(next);
    room.remoteParticipants.forEach((p) => applyVolume(p, next));
  }

  // Mantém novos participantes no estado de mudo escolhido.
  useEffect(() => {
    const handler = (p: RemoteParticipant) => applyVolume(p, speakerMuted);
    room.on(RoomEvent.ParticipantConnected, handler);
    return () => { room.off(RoomEvent.ParticipantConnected, handler); };
  }, [room, speakerMuted]);

  async function toggleNoise() {
    setNote(null);
    setBusy(true);
    try {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const track = pub?.audioTrack as LocalAudioTrack | undefined;
      if (!track) { setNote("Ligue o microfone primeiro."); setBusy(false); return; }

      const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import("@livekit/krisp-noise-filter");
      if (!isKrispNoiseFilterSupported()) { setNote("Supressor de ruído não suportado neste navegador."); setBusy(false); return; }

      if (!noise) {
        if (!filterRef.current) filterRef.current = KrispNoiseFilter();
        await track.setProcessor(filterRef.current);
        setNoise(true);
      } else {
        await track.stopProcessor();
        setNoise(false);
      }
    } catch {
      setNote("Não foi possível alterar o supressor de ruído.");
    }
    setBusy(false);
  }

  const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-900 text-white px-3 py-2">
      {isTeacher && (
        <button onClick={toggleRecording} disabled={recBusy} className={`${btn} disabled:opacity-50 ${recording ? "bg-red-600 hover:bg-red-700" : "bg-white/10 hover:bg-white/20"}`}>
          {recording ? <Square size={16} /> : <Circle size={16} className="text-red-500" />}
          {recBusy ? "..." : recording ? "Parar gravação" : "Gravar"}
        </button>
      )}

      <button onClick={toggleSpeaker} className={`${btn} ${speakerMuted ? "bg-red-600 hover:bg-red-700" : "bg-white/10 hover:bg-white/20"}`}>
        {speakerMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        {speakerMuted ? "Áudio mudo" : "Áudio dos outros"}
      </button>

      <button onClick={toggleNoise} disabled={busy} className={`${btn} disabled:opacity-50 ${noise ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white/10 hover:bg-white/20"}`}>
        <Sparkles size={16} />
        {busy ? "..." : noise ? "Ruído: ON" : "Supressor de ruído"}
      </button>

      <label className="inline-flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1.5 text-sm">
        <Headphones size={16} />
        <select
          value={activeDeviceId}
          onChange={(e) => setActiveMediaDevice(e.target.value)}
          className="bg-transparent text-white text-sm outline-none max-w-[10rem]"
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId} className="text-black">
              {d.label || "Saída de áudio"}
            </option>
          ))}
        </select>
      </label>

      {note && <span className="text-xs text-amber-300">{note}</span>}
    </div>
  );
}
