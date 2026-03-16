import { createClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Podcast, ScriptSegment } from "@/lib/types";
import { ArrowLeft, Clock, FileText, ExternalLink } from "lucide-react";
import { PlayerSection } from "./PlayerSection";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

export default async function PodcastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: podcast } = await supabase
    .from("podcasts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!podcast) {
    notFound();
  }

  const p = podcast as Podcast;
  const script = (p.script || []) as ScriptSegment[];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {/* Title and metadata */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-primary leading-snug">
          {p.title}
        </h1>
        <div className="flex items-center gap-4 mt-3">
          {p.duration_seconds && (
            <span className="inline-flex items-center gap-1 text-xs text-secondary">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(p.duration_seconds)}
            </span>
          )}
          {p.word_count && (
            <span className="inline-flex items-center gap-1 text-xs text-secondary">
              <FileText className="w-3.5 h-3.5" />
              {p.word_count.toLocaleString()} words
            </span>
          )}
          {p.url && (
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Source
            </a>
          )}
        </div>
      </div>

      {/* Audio player */}
      {p.status === "ready" && p.audio_url && (
        <div className="mb-8 p-5 border border-border rounded-xl bg-surface-card">
          <PlayerSection podcastId={p.id} />
        </div>
      )}

      {/* Transcript */}
      {script.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-primary mb-4">
            Transcript
          </h2>
          <div className="space-y-4">
            {script.map((segment, index) => (
              <div key={index} className="flex gap-3">
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    segment.speaker === "A"
                      ? "bg-accent text-white"
                      : "bg-divider text-primary"
                  }`}
                >
                  {segment.speaker}
                </span>
                <p className="text-sm text-secondary leading-relaxed pt-0.5">
                  {segment.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
