import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipTrigger as UiTooltipTrigger,
} from "@/components/ui/tooltip";

function HelpIcon({ content, label }: { content: ReactNode; label: string }) {
  return (
    <UiTooltip>
      <UiTooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex text-slate-500 transition-colors hover:text-slate-300"
          aria-label={label}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </UiTooltipTrigger>
      <UiTooltipContent
        side="top"
        className="max-w-[320px] border border-white/10 bg-slate-900 px-3 py-2.5 text-left text-[11px] leading-relaxed text-slate-200"
      >
        {content}
      </UiTooltipContent>
    </UiTooltip>
  );
}

const OVERALL_SCORE_HELP = (
  <div className="space-y-2">
    <p className="font-semibold text-white">Overall Score (0–100)</p>
    <ul className="list-disc space-y-1 pl-4 text-slate-300">
      <li>Service keywords in title + category: 3+ hits → 35 · 2 → 30 · 1 → 20 · 0 → 0</li>
      <li>Country: target market → 18 · other known → 8 · missing → 0</li>
      <li>Buyer present: +12</li>
      <li>Estimated value present: +10</li>
      <li>Deadline: ≥21 days → 15 · ≥7 → 10 · ≥0 → 4 · missing/passed → 0</li>
    </ul>
    <p className="text-slate-400">Recommendation: No Bid if service score = 0 or overall &lt; 35 · Bid if ≥75 and ≤1 missing field · else Review.</p>
  </div>
);

const DIMENSION_SCORES_HELP = (
  <div className="space-y-2">
    <p className="font-semibold text-white">Dimension Scores (each 0–100)</p>
    <ul className="list-disc space-y-1 pl-4 text-slate-300">
      <li>Service Match: service points ÷ 35 × 100</li>
      <li>Geography: target country → 100 · other known → 55 · empty → 0</li>
      <li>Industry: Service Match + 10 (max 100), or 20 if no service match</li>
      <li>Technology: +25 per IT keyword (software, IT, digital, cloud, etc.)</li>
      <li>Security Clearance: 80 if text contains &quot;security&quot;, else 35</li>
      <li>Framework: 60 if country known, else 25</li>
      <li>Contract Value: 70 if estimated value present, else 35</li>
      <li>Deadline: ≥21d → 85 · ≥7d → 55 · ≥0d → 20 · passed → 5</li>
      <li>Strategic Customer: 75 if target country, else 40</li>
    </ul>
  </div>
);

const EXTRACTION_CONFIDENCE_HELP = (
  <div className="space-y-2">
    <p className="font-semibold text-white">Extraction Confidence (35–85%)</p>
    <p className="text-slate-300">
      Reflects how complete the public notice metadata is after ingest — not AI extraction quality.
    </p>
    <ul className="list-disc space-y-1 pl-4 text-slate-300">
      <li>Start at 85%</li>
      <li>−12% for each missing field among: country, buyer, estimated value, deadline</li>
      <li>Floor at 35%</li>
    </ul>
    <p className="text-slate-400">Example: all fields present → 85% · 2 missing → 61%.</p>
  </div>
);

export function OverallScoreHelpIcon() {
  return <HelpIcon content={OVERALL_SCORE_HELP} label="Overall score formula" />;
}

export function DimensionScoresHelpIcon() {
  return <HelpIcon content={DIMENSION_SCORES_HELP} label="Dimension scores formula" />;
}

export function ExtractionConfidenceHelpIcon() {
  return <HelpIcon content={EXTRACTION_CONFIDENCE_HELP} label="Extraction confidence formula" />;
}
