import { useMemo } from "react";
import type { OpportunityFormDraft } from "../opportunityFormTypes";
import { FormTextInput } from "./FormControls";
import {
  getOverviewFieldErrors,
} from "./overviewFieldValidation";

type OverviewSlice = OpportunityFormDraft["overview"];

export function OverviewFields({
  value,
  onChange,
}: {
  value: OverviewSlice;
  onChange: (next: OverviewSlice) => void;
}) {
  const set = <K extends keyof OverviewSlice>(key: K, next: OverviewSlice[K]) => {
    onChange({ ...value, [key]: next });
  };

  // Recompute on every value change so errors update as the user types.
  const errors = useMemo(() => getOverviewFieldErrors(value), [value]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <FormTextInput
          label="Deadline"
          type="date"
          value={value.deadlineAt}
          onChange={(v) => set("deadlineAt", v)}
        />
        <FormTextInput
          label="Estimated Value"
          type="number"
          value={value.estimatedValue}
          onChange={(v) => set("estimatedValue", v)}
          placeholder="0"
        />
        <FormTextInput
          label="Currency"
          value={value.currency}
          onChange={(v) => set("currency", v)}
          placeholder="GBP"
          error={errors.currency}
        />
        <FormTextInput label="Country" value={value.country} onChange={(v) => set("country", v)} />
        <FormTextInput label="Category" value={value.category} onChange={(v) => set("category", v)} />
        <FormTextInput
          label="Reference"
          value={value.reference}
          onChange={(v) => set("reference", v)}
        />
        <FormTextInput
          label="Notice Type"
          value={value.noticeType}
          onChange={(v) => set("noticeType", v)}
        />
        <FormTextInput
          label="Security Clearance"
          value={value.securityClearance}
          onChange={(v) => set("securityClearance", v)}
        />
        <FormTextInput
          label="Extraction Confidence"
          type="number"
          value={value.extractionConfidence}
          onChange={(v) => set("extractionConfidence", v)}
          placeholder="0–100"
          error={errors.extractionConfidence}
        />
        <FormTextInput
          label="Framework"
          value={value.framework}
          onChange={(v) => set("framework", v)}
        />
        <FormTextInput
          label="Contract Duration"
          value={value.contractDuration}
          onChange={(v) => set("contractDuration", v)}
        />
        <FormTextInput
          label="Technology"
          value={value.technology}
          onChange={(v) => set("technology", v)}
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Contact
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <FormTextInput
            label="Name"
            value={value.contactName}
            onChange={(v) => set("contactName", v)}
          />
          <FormTextInput
            label="Email"
            type="email"
            value={value.contactEmail}
            onChange={(v) => set("contactEmail", v)}
            placeholder="name@company.com"
            error={errors.contactEmail}
          />
          <FormTextInput
            label="Phone"
            type="tel"
            value={value.contactPhone}
            onChange={(v) => set("contactPhone", v)}
            placeholder="+44 …"
            error={errors.contactPhone}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Link
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormTextInput
            label="URL"
            type="url"
            value={value.linkUrl}
            onChange={(v) => set("linkUrl", v)}
            placeholder="https://"
            error={errors.linkUrl}
          />
          <FormTextInput
            label="Description"
            value={value.linkDescription}
            onChange={(v) => set("linkDescription", v)}
          />
        </div>
      </div>
    </div>
  );
}
