"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Loader2, LinkIcon, Upload, X, Square } from "lucide-react";

const STEPS = [
  { key: "creating", label: "Creating podcast", statusLabel: "Creating", estimate: 2 },
  { key: "extracting", label: "Extracting content", statusLabel: "Extracting", estimate: 8 },
  { key: "scripting", label: "Writing podcast script", statusLabel: "Writing script", estimate: 45 },
  { key: "synthesizing", label: "Generating audio", statusLabel: "Generating audio", estimate: 120 },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface ActiveJob {
  title: string;
  sourceLabel: string;
  isFile: boolean;
  wordCount?: number;
}

export function NewPodcastForm() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<StepKey | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const hasInput = url.trim() || file;

  const currentStepIndex = currentStep
    ? STEPS.findIndex((s) => s.key === currentStep)
    : -1;

  const totalEstimate = STEPS.reduce((sum, s) => sum + s.estimate, 0);

  const completedEstimate =
    currentStepIndex > 0
      ? STEPS.slice(0, currentStepIndex).reduce((sum, s) => sum + s.estimate, 0)
      : 0;

  const currentStepEstimate =
    currentStepIndex >= 0 ? STEPS[currentStepIndex].estimate : 0;

  const stepProgress =
    currentStepEstimate > 0
      ? Math.min(elapsedSeconds / currentStepEstimate, 1)
      : 0;

  const overallProgress = Math.min(
    ((completedEstimate + stepProgress * currentStepEstimate) / totalEstimate) *
      100,
    95
  );

  const totalElapsedEstimate = completedEstimate + elapsedSeconds;
  const remainingSeconds = Math.max(0, totalEstimate - totalElapsedEstimate);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `~${Math.ceil(seconds)}s left`;
    const mins = Math.ceil(seconds / 60);
    return `~${mins} min left`;
  };

  useEffect(() => {
    if (loading && currentStep) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, currentStep]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const safeJson = async (res: Response) => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: text || "Request failed" };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasInput) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setLoading(true);
    setError(null);
    setCurrentStep("creating");

    // Set up the active job info for the card
    const jobTitle = file
      ? file.name.replace(/\.pdf$/i, "")
      : "Processing...";
    const jobSource = file
      ? file.name
      : (() => {
          try {
            return new URL(url.trim()).hostname;
          } catch {
            return url.trim();
          }
        })();

    setActiveJob({
      title: jobTitle,
      sourceLabel: jobSource,
      isFile: !!file,
    });

    const supabase = createClient();
    let createdPodcastId: string | null = null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const sourceUrl = file ? `file://${file.name}` : url.trim();
      const { data: podcast, error: insertError } = await supabase
        .from("podcasts")
        .insert({
          user_id: user.id,
          url: sourceUrl,
          title: jobTitle,
          status: "extracting",
        })
        .select()
        .single();

      if (insertError || !podcast)
        throw new Error(insertError?.message || "Failed to create podcast");

      createdPodcastId = podcast.id;

      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      let content;

      setCurrentStep("extracting");

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("podcastId", podcast.id);

        const extractRes = await fetch("/api/extract-file", {
          method: "POST",
          body: formData,
          signal,
        });

        if (!extractRes.ok) {
          const err = await safeJson(extractRes);
          throw new Error(err.error || "PDF extraction failed");
        }

        const result = await safeJson(extractRes);
        content = result.content;
      } else {
        new URL(url);
        const extractRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ podcastId: podcast.id, url: url.trim() }),
          signal,
        });

        if (!extractRes.ok) {
          const err = await safeJson(extractRes);
          throw new Error(err.error || "Extraction failed");
        }

        const result = await safeJson(extractRes);
        content = result.content;
      }

      // Update the card title and word count from extracted content
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              title: content.title || prev.title,
              wordCount: content.wordCount,
            }
          : prev
      );

      // Step 2: Generate script
      setCurrentStep("scripting");
      const scriptRes = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podcastId: podcast.id, content }),
        signal,
      });

      if (!scriptRes.ok) {
        const err = await safeJson(scriptRes);
        throw new Error(err.error || "Script generation failed");
      }

      const { script } = await safeJson(scriptRes);

      // Step 3: Synthesize audio
      setCurrentStep("synthesizing");
      const synthRes = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podcastId: podcast.id, script }),
        signal,
      });

      if (!synthRes.ok) {
        const err = await safeJson(synthRes);
        throw new Error(err.error || "Audio synthesis failed");
      }

      setCurrentStep(null);
      setActiveJob(null);
      setUrl("");
      setFile(null);
      router.refresh();
    } catch (err) {
      // Clean up the failed database entry
      if (createdPodcastId) {
        supabase.from("podcasts").delete().eq("id", createdPodcastId).then(() => {
          router.refresh();
        });
      }

      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Generation cancelled");
      } else {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      }
      setCurrentStep(null);
      setActiveJob(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.type !== "application/pdf") {
        setError("Only PDF files are supported");
        return;
      }
      setFile(selected);
      setUrl("");
      setError(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* URL input */}
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (e.target.value) {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }
              setError(null);
            }}
            placeholder="Paste article URL..."
            disabled={loading || !!file}
            className="w-full border border-border-input rounded-lg pl-9 pr-3 py-2.5 text-sm text-primary bg-surface-input placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:opacity-50 transition-all"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-divider" />
          <span className="text-xs text-tertiary">or</span>
          <div className="flex-1 border-t border-divider" />
        </div>

        {/* File upload */}
        {file ? (
          <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-surface-input">
            <Upload className="w-4 h-4 text-secondary flex-shrink-0" />
            <span className="text-sm text-primary truncate flex-1">
              {file.name}
            </span>
            <span className="text-xs text-tertiary flex-shrink-0">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
              type="button"
              onClick={clearFile}
              disabled={loading}
              className="p-0.5 text-tertiary hover:text-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label
            className={`flex items-center justify-center gap-2 p-3 border border-dashed border-border-input rounded-lg text-sm text-secondary hover:border-tertiary hover:text-primary hover:bg-surface-input transition-all cursor-pointer ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload a PDF file
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
            />
          </label>
        )}

        {/* Generate button */}
        <button
          type="submit"
          disabled={loading || !hasInput}
          className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Generate
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* In-progress card */}
      {loading && activeJob && currentStep && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-surface-card shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-primary truncate">
                {activeJob.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                {/* Status pill */}
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {STEPS[currentStepIndex]?.statusLabel}
                </span>
                {activeJob.wordCount && (
                  <span className="text-xs text-secondary">
                    {activeJob.wordCount.toLocaleString()} words
                  </span>
                )}
                <span className="text-xs text-tertiary">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>
            {/* Stop button */}
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
              title="Stop generation"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </button>
          </div>

          {/* Source */}
          {activeJob.sourceLabel && (
            <div className="flex items-center gap-1 text-xs text-tertiary truncate">
              {activeJob.isFile ? (
                <Upload className="w-3 h-3 flex-shrink-0" />
              ) : (
                <LinkIcon className="w-3 h-3 flex-shrink-0" />
              )}
              <span className="truncate">{activeJob.sourceLabel}</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full bg-divider rounded-full h-1 overflow-hidden">
            <div
              className="bg-accent h-1 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(overallProgress, 2)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
