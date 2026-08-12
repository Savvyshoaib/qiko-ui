import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportantMessageCardProps {
  title: string;
  message: string;
  maxWidthClassName?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
}

export default function ImportantMessageCard({
  title,
  message,
  maxWidthClassName = "max-w-3xl",
  ctaLabel,
  ctaHref,
  ctaOnClick,
}: ImportantMessageCardProps) {
  const showCta = Boolean(ctaLabel && (ctaHref || ctaOnClick));
  return (
    <div
      className={`mx-auto w-full rounded-2xl border border-amber-400/40 bg-[#1a1208] px-4 py-3 text-amber-100 ${maxWidthClassName}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0">
          <p className="text-base font-semibold leading-6">{title}</p>
          <p className="mt-1 break-words text-sm text-amber-200/90">{message}</p>
          {showCta ? (
            <div className="mt-3">
              {ctaOnClick ? (
                <Button
                  type="button"
                  size="sm"
                  className="bg-amber-500/20 text-amber-100 hover:bg-amber-500/30"
                  onClick={ctaOnClick}
                >
                  {ctaLabel}
                </Button>
              ) : (
                <Button asChild size="sm" className="bg-amber-500/20 text-amber-100 hover:bg-amber-500/30">
                  <a href={ctaHref}>{ctaLabel}</a>
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
