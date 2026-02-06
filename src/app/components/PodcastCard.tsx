"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { Podcast } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { Clock, FileText, ExternalLink, Upload, Trash2 } from "lucide-react";

function getSourceLabel(url: string): { label: string; isFile: boolean } {
  if (url.startsWith("file://")) {
    return { label: url.replace("file://", ""), isFile: true };
  }
  try {
    return { label: new URL(url).hostname, isFile: false };
  } catch {
    return { label: url, isFile: false };
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function daysUntilExpiry(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / 86400000));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function PodcastCard({ podcast }: { podcast: Podcast }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const daysLeft = daysUntilExpiry(podcast.expires_at);
  const isClickable = podcast.status === "ready";

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Delete this podcast?")) return;

    setDeleting(true);
    try {
      const supabase = createClient();

      // Delete audio from storage if it exists
      if (podcast.audio_url) {
        await supabase.storage.from("podcast-audio").remove([podcast.audio_url]);
      }

      // Delete the database record
      await supabase.from("podcasts").delete().eq("id", podcast.id);

      router.refresh();
    } catch {
      setDeleting(false);
    }
  };

  const content = (
    <div className="group border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors relative">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {podcast.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5">
            <StatusBadge status={podcast.status} />
            {podcast.duration_seconds && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {formatDuration(podcast.duration_seconds)}
              </span>
            )}
            {podcast.word_count && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <FileText className="w-3 h-3" />
                {podcast.word_count.toLocaleString()} words
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {formatDate(podcast.created_at)}
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
              title="Delete podcast"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {podcast.status === "ready" && daysLeft <= 7 && (
            <span className="text-xs text-amber-600">
              {daysLeft}d left
            </span>
          )}
        </div>
      </div>
      {podcast.url && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400 truncate">
          {getSourceLabel(podcast.url).isFile ? (
            <Upload className="w-3 h-3 flex-shrink-0" />
          ) : (
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          )}
          <span className="truncate">
            {getSourceLabel(podcast.url).label}
          </span>
        </div>
      )}
    </div>
  );

  if (isClickable) {
    return <Link href={`/podcast/${podcast.id}`}>{content}</Link>;
  }

  return content;
}
