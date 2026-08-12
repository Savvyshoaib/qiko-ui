import { cn } from "@/lib/utils";
import { outcomesGridClass, SALES_INTEL_OUTCOMES_STRIP } from "./salesIntelUi";

export type Outcome = {
  value: string;
  label: string;
  trend?: string;
  trendUp?: boolean;
};

function OutcomeValue({ value }: { value: string }) {
  const isCompact = value.length <= 8;
  const isLong = value.length > 16;

  return (
    <span
      className={cn(
        "max-w-full text-center font-bold tracking-tight text-white tabular-nums",
        isCompact
          ? "text-base leading-none sm:text-lg"
          : isLong
            ? "line-clamp-2 text-[11px] leading-snug sm:text-xs"
            : "text-sm leading-tight sm:text-[15px]"
      )}
      style={{ fontFamily: "var(--font-display)" }}
    >
      {value}
    </span>
  );
}

function OutcomeMetricCell({ outcome }: { outcome: Outcome }) {
  return (
    <div className="grid h-full min-w-0 grid-rows-[2rem_1.5rem_0.75rem] items-start justify-items-center gap-y-1 px-2 py-1.5 text-center transition-colors hover:bg-white/[0.02] sm:grid-rows-[2.25rem_1.5rem_0.75rem] sm:px-3 sm:py-2.5">
      <div className="flex h-full w-full items-center justify-center self-stretch">
        <OutcomeValue value={outcome.value} />
      </div>

      <p className="flex h-full w-full items-start justify-center self-stretch text-[10px] leading-tight text-slate-500">
        <span className="line-clamp-2">{outcome.label}</span>
      </p>

      <p
        className={cn(
          "flex h-full w-full items-center justify-center self-stretch text-[9px] leading-none",
          outcome.trend
            ? outcome.trendUp
              ? "text-emerald-400/70"
              : "text-red-400/70"
            : "invisible"
        )}
      >
        {outcome.trend ? (
          <>
            <span aria-hidden="true">{outcome.trendUp ? "↑" : "↓"} </span>
            {outcome.trend}
          </>
        ) : (
          "—"
        )}
      </p>
    </div>
  );
}

export function OutcomesStrip({ title, outcomes }: { title: string; outcomes: Outcome[] }) {
  return (
    <div className={SALES_INTEL_OUTCOMES_STRIP}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
        aria-hidden="true"
      />
      <p className="relative mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-indigo-400/70">
        Outcomes – {title}
      </p>

      <div
        className={cn(
          "relative grid items-stretch divide-white/[0.06]",
          outcomesGridClass(outcomes.length),
          outcomes.length > 1 && "divide-y sm:divide-y-0 sm:divide-x"
        )}
      >
        {outcomes.map((outcome) => (
          <OutcomeMetricCell key={outcome.label} outcome={outcome} />
        ))}
      </div>
    </div>
  );
}
