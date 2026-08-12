import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SALES_INTEL_PANEL_SOFT } from "./salesIntelUi";

type EmptyAction = {
  label: string;
  onClick: () => void;
};

type SalesIntelEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  steps?: string[];
  primaryAction?: EmptyAction;
  secondaryAction?: EmptyAction;
  size?: "default" | "compact";
  className?: string;
};

export function SalesIntelEmptyState({
  icon: Icon,
  title,
  description,
  steps,
  primaryAction,
  secondaryAction,
  size = "default",
  className,
}: SalesIntelEmptyStateProps) {
  const isCompact = size === "compact";

  return (
    <div
      className={cn(
        "relative overflow-hidden text-center",
        isCompact
          ? "flex h-full min-h-[9rem] flex-col items-center justify-center px-4 py-6"
          : cn("rounded-xl border border-white/[0.08] px-4 py-10 sm:px-8 sm:py-12", SALES_INTEL_PANEL_SOFT),
        className
      )}
    >
      {!isCompact ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.09)_0%,transparent_68%)]"
          aria-hidden="true"
        />
      ) : null}

      <div className="relative mx-auto flex w-full max-w-md flex-col items-center">
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 shadow-lg shadow-indigo-500/10",
            isCompact ? "size-11" : "size-16"
          )}
        >
          <Icon className={cn("text-indigo-300", isCompact ? "size-5" : "size-7")} strokeWidth={1.75} />
        </div>

        <h3
          className={cn(
            "font-semibold tracking-tight text-white",
            isCompact ? "text-[13px]" : "text-base sm:text-[17px]"
          )}
          style={isCompact ? undefined : { fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>

        <p
          className={cn(
            "mt-2 text-slate-400",
            isCompact
              ? "max-w-[16rem] text-[11px] leading-snug"
              : "max-w-sm text-[12px] leading-relaxed sm:text-[13px]"
          )}
        >
          {description}
        </p>

        {steps && steps.length > 0 && !isCompact ? (
          <ol className="mt-5 w-full max-w-sm space-y-2.5 text-left">
            {steps.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5 text-[11px] leading-snug text-slate-500">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[9px] font-semibold text-indigo-300">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {primaryAction || secondaryAction ? (
          <div className="mt-6 flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
            {primaryAction ? (
              <Button
                type="button"
                size="sm"
                onClick={primaryAction.onClick}
                className="h-9 rounded-lg bg-indigo-500 px-4 text-[12px] font-semibold text-white hover:bg-indigo-400"
              >
                {primaryAction.label}
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={secondaryAction.onClick}
                className="h-9 rounded-lg px-4 text-[12px] font-medium text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
              >
                {secondaryAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
