export type PodcastStatus =
  | "extracting"
  | "generating"
  | "synthesizing"
  | "ready"
  | "error"
  | "expired";

export interface Podcast {
  id: string;
  user_id: string;
  url: string;
  title: string;
  status: PodcastStatus;
  script: ScriptSegment[] | null;
  audio_url: string | null;
  duration_seconds: number | null;
  word_count: number | null;
  error_message: string | null;
  created_at: string;
  expires_at: string;
}

export interface ScriptSegment {
  speaker: "A" | "B";
  text: string;
}

export interface PlaybackProgress {
  id: string;
  user_id: string;
  podcast_id: string;
  progress_seconds: number;
  completed: boolean;
  last_played_at: string;
}

export interface ExtractedContent {
  title: string;
  author: string | null;
  fullText: string;
  wordCount: number;
  sourceUrl: string;
}
