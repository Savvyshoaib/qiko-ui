import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { IDGRfpListStatus } from "@/lib/IDGApi";

const OCR_PARSING_PHRASES = [
  "Image-based PDF detected",
  "Extracting text with OCR",
  "Parsing content",
  "Finalizing document",
];

function OcrParsingBadge() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % OCR_PARSING_PHRASES.length);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <span className="inline-flex max-w-[220px] items-center gap-1 rounded border border-amber-400/20 bg-amber-400/10 px-2 py-[2px] text-[9px] font-semibold text-amber-400/80">
      <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
      <span key={phraseIndex} className="truncate animate-pulse">
        {OCR_PARSING_PHRASES[phraseIndex]}
      </span>
    </span>
  );
}

const STATUS_CONFIG: Record<
  Exclude<IDGRfpListStatus, "ocr_parsing" | "ocr_failed">,
  { label: string; bg: string; text: string }
> = {
  in_progress: { label: "In Progress", bg: "bg-indigo-400/10", text: "text-indigo-400/80" },
  new: { label: "New", bg: "bg-emerald-400/10", text: "text-emerald-400/80" },
  parsing: { label: "Parsing...", bg: "bg-amber-400/10", text: "text-amber-400/80" },
  failed: { label: "Failed", bg: "bg-red-400/10", text: "text-red-400/80" },
  completed: { label: "Completed", bg: "bg-cyan-400/10", text: "text-cyan-300/90" },
};

export function RfpPackStatusBadge({
  status,
  retryFileId,
  isRetrying = false,
  onRetry,
  hideInProgress = true,
}: {
  status: IDGRfpListStatus;
  retryFileId?: string;
  isRetrying?: boolean;
  onRetry?: (fileId: string) => void;
  hideInProgress?: boolean;
}) {
  if (hideInProgress && status === "in_progress") {
    return null;
  }

  if (status === "ocr_parsing") {
    return <OcrParsingBadge />;
  }

  if (status === "ocr_failed" && retryFileId && onRetry) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRetry(retryFileId);
        }}
        disabled={isRetrying}
        className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRetrying ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Retrying...
          </span>
        ) : (
          "Retry"
        )}
      </button>
    );
  }

  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!config) return null;

  if (status === "parsing") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border border-amber-400/20 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-wider animate-pulse ${config.bg} ${config.text}`}
      >
        <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={`rounded px-2 py-[2px] text-[9px] font-semibold uppercase tracking-wider ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
