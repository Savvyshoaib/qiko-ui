import type { OpportunityFormDraft } from "../opportunityFormTypes";
import { FormTextArea, FormTextInput } from "./FormControls";

type QualificationSlice = OpportunityFormDraft["qualification"];

export function QualificationFields({
  value,
  onChange,
}: {
  value: QualificationSlice;
  onChange: (next: QualificationSlice) => void;
}) {
  const set = <K extends keyof QualificationSlice>(key: K, next: QualificationSlice[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <FormTextInput
          label="Overall Score"
          type="number"
          value={value.overallScore}
          onChange={(v) => set("overallScore", v)}
          placeholder="0–100"
        />
        <FormTextInput
          label="Confidence"
          type="number"
          value={value.confidence}
          onChange={(v) => set("confidence", v)}
          placeholder="0–100"
        />
        <FormTextInput
          label="Recommendation"
          value={value.recommendation}
          onChange={(v) => set("recommendation", v)}
          placeholder="Review / Approve / Reject"
        />
      </div>
      <FormTextArea
        label="AI Reasoning"
        value={value.aiReasoning}
        onChange={(v) => set("aiReasoning", v)}
        rows={5}
      />
      <FormTextArea
        label="Recommendations"
        value={value.recommendations}
        onChange={(v) => set("recommendations", v)}
        rows={5}
        placeholder="One recommendation per line"
      />
    </div>
  );
}
