"use client";

import { useEffect, useState } from "react";
import { AudioPlayer } from "@/app/components/AudioPlayer";
import { Loader2 } from "lucide-react";

export function PlayerSection({ podcastId }: { podcastId: string }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAudio() {
      try {
        const res = await fetch(`/api/audio/${podcastId}`);
        if (!res.ok) {
          throw new Error("Failed to load audio");
        }
        const { url } = await res.json();
        setAudioUrl(url);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load audio"
        );
      }
    }
    loadAudio();
  }, [podcastId]);

  if (error) {
    return (
      <p className="text-sm text-red-600 text-center py-4">{error}</p>
    );
  }

  if (!audioUrl) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading audio...
      </div>
    );
  }

  return (
    <AudioPlayer
      podcastId={podcastId}
      audioUrl={audioUrl}
      durationSeconds={null}
    />
  );
}
