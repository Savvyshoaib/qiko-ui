import type { OpportunityFormDraft } from "../opportunityFormTypes";
import { FormTextArea } from "./FormControls";

type SummarySlice = OpportunityFormDraft["summary"];

export function SummaryFields({
  value,
  onChange,
}: {
  value: SummarySlice;
  onChange: (next: SummarySlice) => void;
}) {
  const set = <K extends keyof SummarySlice>(key: K, next: SummarySlice[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FormTextArea
        label="Executive Summary"
        value={value.executiveSummary}
        onChange={(v) => set("executiveSummary", v)}
        rows={5}
      />
      <FormTextArea
        label="Risk Summary"
        value={value.riskSummary}
        onChange={(v) => set("riskSummary", v)}
        rows={5}
      />
      <FormTextArea
        label="Opportunity Summary"
        value={value.opportunitySummary}
        onChange={(v) => set("opportunitySummary", v)}
        rows={5}
      />
      <FormTextArea
        label="Requirements"
        value={value.requirements}
        onChange={(v) => set("requirements", v)}
        rows={5}
        placeholder="One requirement per line"
      />
      <FormTextArea
        label="Deliverables"
        value={value.deliverables}
        onChange={(v) => set("deliverables", v)}
        rows={5}
        placeholder="One deliverable per line"
      />
    </div>
  );
}
