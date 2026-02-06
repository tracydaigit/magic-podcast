const STORAGE_KEY = "podcast-progress";

interface LocalProgress {
  [podcastId: string]: {
    progressSeconds: number;
    updatedAt: number;
  };
}

export function saveLocalProgress(
  podcastId: string,
  progressSeconds: number
): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const data: LocalProgress = stored ? JSON.parse(stored) : {};
    data[podcastId] = {
      progressSeconds,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function getLocalProgress(podcastId: string): number | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const data: LocalProgress = JSON.parse(stored);
    return data[podcastId]?.progressSeconds ?? null;
  } catch {
    return null;
  }
}

export function clearLocalProgress(podcastId: string): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const data: LocalProgress = JSON.parse(stored);
    delete data[podcastId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}
