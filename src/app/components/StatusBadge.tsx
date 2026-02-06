import type { PodcastStatus } from "@/lib/types";
import { Loader2 } from "lucide-react";

const statusConfig: Record<
  PodcastStatus,
  { label: string; className: string; animate?: boolean }
> = {
  extracting: {
    label: "Extracting",
    className: "bg-blue-50 text-blue-700",
    animate: true,
  },
  generating: {
    label: "Writing script",
    className: "bg-blue-50 text-blue-700",
    animate: true,
  },
  synthesizing: {
    label: "Generating audio",
    className: "bg-blue-50 text-blue-700",
    animate: true,
  },
  ready: {
    label: "Ready",
    className: "bg-green-50 text-green-700",
  },
  error: {
    label: "Error",
    className: "bg-red-50 text-red-700",
  },
  expired: {
    label: "Expired",
    className: "bg-gray-100 text-gray-500",
  },
};

export function StatusBadge({ status }: { status: PodcastStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.animate && <Loader2 className="w-3 h-3 animate-spin" />}
      {config.label}
    </span>
  );
}
