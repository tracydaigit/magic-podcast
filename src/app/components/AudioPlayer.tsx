"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Loader2,
} from "lucide-react";
import {
  saveLocalProgress,
  getLocalProgress,
} from "@/lib/progress-tracker";

interface AudioPlayerProps {
  podcastId: string;
  audioUrl: string;
  durationSeconds: number | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  podcastId,
  audioUrl,
  durationSeconds,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const lastSyncRef = useRef(0);

  // Load saved progress on mount
  useEffect(() => {
    const savedProgress = getLocalProgress(podcastId);
    if (savedProgress && audioRef.current) {
      audioRef.current.currentTime = savedProgress;
      setCurrentTime(savedProgress);
    }
  }, [podcastId]);

  // Save progress to localStorage every 5 seconds during playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (audioRef.current) {
        saveLocalProgress(podcastId, audioRef.current.currentTime);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, podcastId]);

  // Sync progress to server every 30 seconds
  const syncToServer = useCallback(
    async (seconds: number) => {
      const now = Date.now();
      if (now - lastSyncRef.current < 30000) return;
      lastSyncRef.current = now;

      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            podcastId,
            progressSeconds: seconds,
            completed: false,
          }),
        });
      } catch {
        // ignore sync errors
      }
    },
    [podcastId]
  );

  // Save on page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (audioRef.current) {
        saveLocalProgress(podcastId, audioRef.current.currentTime);
        // Use sendBeacon for reliable sync on close
        navigator.sendBeacon(
          "/api/progress",
          JSON.stringify({
            podcastId,
            progressSeconds: audioRef.current.currentTime,
            completed: false,
          })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [podcastId]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(audioRef.current.currentTime + seconds, duration)
    );
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 1.75, 2, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            setLoading(false);
            // Restore progress after metadata loads
            const savedProgress = getLocalProgress(podcastId);
            if (savedProgress) {
              audioRef.current.currentTime = savedProgress;
              setCurrentTime(savedProgress);
            }
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            syncToServer(audioRef.current.currentTime);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          if (audioRef.current) {
            saveLocalProgress(podcastId, audioRef.current.currentTime);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          saveLocalProgress(podcastId, 0);
          fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              podcastId,
              progressSeconds: duration,
              completed: true,
            }),
          }).catch(() => {});
        }}
        onCanPlay={() => setLoading(false)}
      />

      {/* Progress bar */}
      <div className="space-y-1.5">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 cursor-pointer"
          style={{
            background: `linear-gradient(to right, #111827 ${progress}%, #e5e7eb ${progress}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => skip(-15)}
          className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
          aria-label="Skip back 15 seconds"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlayPause}
          disabled={loading}
          className="w-12 h-12 flex items-center justify-center bg-gray-900 text-white rounded-full hover:bg-gray-800 disabled:opacity-50 transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        <button
          onClick={() => skip(15)}
          className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
          aria-label="Skip forward 15 seconds"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <button
          onClick={cyclePlaybackRate}
          className="px-2 py-1 text-xs font-mono text-gray-500 hover:text-gray-900 border border-gray-200 rounded-md transition-colors"
          aria-label="Change playback speed"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
