"use client";

import { useEffect, useRef, useState } from "react";
import { useRoomContext, useMediaDeviceSelect } from "@livekit/components-react";
import { Track, RoomEvent, type RemoteParticipant, type LocalAudioTrack } from "livekit-client";
import { Volume2, VolumeX, Sparkles, Headphones } from "lucide-react";

export default function RoomControls() {
  const room = useRoomContext();
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
