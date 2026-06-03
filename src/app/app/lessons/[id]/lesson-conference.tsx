"use client";

import { GridLayout, ParticipantTile, RoomAudioRenderer, ControlBar, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

// Conferência sem o chat embutido do LiveKit (usamos comentários/anotações na aula).
export default function LessonConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="flex flex-col h-full">
      <GridLayout tracks={tracks} style={{ flex: 1, minHeight: 0 }}>
        <ParticipantTile />
      </GridLayout>
      <RoomAudioRenderer />
      <ControlBar controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: true, settings: false }} />
    </div>
  );
}
