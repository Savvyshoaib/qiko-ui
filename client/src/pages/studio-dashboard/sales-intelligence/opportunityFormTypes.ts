import type { Opportunity, OpportunityDetailSections } from "./salesIntelTypes";

export type OpportunityFormDraft = {
  title: string;
  buyer: string;
  overview: {
    deadlineAt: string;
    estimatedValue: string;
    currency: string;
    country: string;
    category: string;
    reference: string;
    noticeType: string;
    securityClearance: string;
    extractionConfidence: string;
    framework: string;
    contractDuration: string;
    technology: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    linkUrl: string;
    linkDescription: string;
  };
  summary: {
    executiveSummary: string;
    riskSummary: string;
    opportunitySummary: string;
    requirements: string;
    deliverables: string;
  };
  qualification: {
    overallScore: string;
    recommendation: string;
    confidence: string;
    aiReasoning: string;
    recommendations: string;
  };
  notes: string;
};

export const EMPTY_OPPORTUNITY_FORM: OpportunityFormDraft = {
  title: "",
  buyer: "",
  overview: {
    deadlineAt: "",
    estimatedValue: "",
    currency: "GBP",
    country: "",
    category: "",
    reference: "",
    noticeType: "",
    securityClearance: "",
    extractionConfidence: "",
    framework: "",
    contractDuration: "",
    technology: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    linkUrl: "",
    linkDescription: "",
  },
  summary: {
    executiveSummary: "",
    riskSummary: "",
    opportunitySummary: "",
    requirements: "",
    deliverables: "",
  },
  qualification: {
    overallScore: "",
    recommendation: "",
    confidence: "",
    aiReasoning: "",
    recommendations: "",
  },
  notes: "",
};

function listToLines(items?: string[] | null): string {
  return (items ?? []).join("\n");
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function draftFromOpportunity(
  opportunity: Opportunity,
  detail: OpportunityDetailSections
): OpportunityFormDraft {
  const contact = detail.overview.contacts?.[0];
  const link = detail.overview.links?.[0];

  return {
    title: opportunity.title ?? "",
    buyer: opportunity.buyer ?? detail.overview.buyer ?? "",
    overview: {
      deadlineAt: toDateInput(detail.overview.deadlineAt ?? opportunity.deadlineAt),
      estimatedValue:
        detail.overview.estimatedValue != null
          ? String(detail.overview.estimatedValue)
          : opportunity.estimatedValue != null
            ? String(opportunity.estimatedValue)
            : "",
      currency: detail.overview.currency ?? opportunity.currency ?? "GBP",
      country: detail.overview.country ?? opportunity.country ?? "",
      category: detail.overview.category ?? opportunity.category ?? "",
      reference: detail.overview.reference ?? "",
      noticeType: detail.overview.noticeType ?? "",
      securityClearance: detail.overview.securityClearance ?? "",
      extractionConfidence:
        detail.overview.extractionConfidence != null
          ? String(detail.overview.extractionConfidence)
          : "",
      framework: detail.overview.framework ?? "",
      contractDuration: detail.overview.contractDuration ?? "",
      technology: detail.overview.technology ?? "",
      contactName: contact?.name ?? "",
      contactEmail: contact?.email ?? "",
      contactPhone: contact?.phone ?? "",
      linkUrl: link?.url ?? "",
      linkDescription: link?.description ?? "",
    },
    summary: {
      executiveSummary: detail.summary.executiveSummary ?? "",
      riskSummary: detail.summary.riskSummary ?? "",
      opportunitySummary: detail.summary.opportunitySummary ?? "",
      requirements: listToLines(detail.summary.requirements),
      deliverables: listToLines(detail.summary.deliverables),
    },
    qualification: {
      overallScore:
        detail.qualification.overallScore != null
          ? String(detail.qualification.overallScore)
          : "",
      recommendation: detail.qualification.recommendation ?? "",
      confidence:
        detail.qualification.confidence != null
          ? String(detail.qualification.confidence)
          : "",
      aiReasoning: detail.qualification.aiReasoning ?? "",
      recommendations: listToLines(detail.qualification.recommendations),
    },
    notes: detail.notes?.humanReviewNotes ?? opportunity.humanReviewNotes ?? "",
  };
}

export function isOpportunityFormDirty(
  draft: OpportunityFormDraft,
  initial: OpportunityFormDraft
): boolean {
  return JSON.stringify(draft) !== JSON.stringify(initial);
}

function linesToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Shared field mapping for create + update (all tabs). */
export function buildOpportunityFormPayload(draft: OpportunityFormDraft) {
  const currency = draft.overview.currency.trim().toUpperCase().slice(0, 3);
  const linkUrl = draft.overview.linkUrl.trim();
  const linkDescription = draft.overview.linkDescription.trim();

  return {
    title: draft.title.trim(),
    buyer: nullableText(draft.buyer),
    country: nullableText(draft.overview.country),
    category: nullableText(draft.overview.category),
    estimated_value: parseOptionalNumber(draft.overview.estimatedValue),
    currency: currency || null,
    deadline_at: nullableText(draft.overview.deadlineAt),
    source_url: linkUrl || null,
    reference: nullableText(draft.overview.reference),
    notice_type: nullableText(draft.overview.noticeType),
    security_clearance: nullableText(draft.overview.securityClearance),
    extraction_confidence: parseOptionalNumber(draft.overview.extractionConfidence),
    framework: nullableText(draft.overview.framework),
    contract_duration: nullableText(draft.overview.contractDuration),
    technology: nullableText(draft.overview.technology),
    contacts: [
      {
        name: nullableText(draft.overview.contactName),
        email: nullableText(draft.overview.contactEmail),
        phone: nullableText(draft.overview.contactPhone),
      },
    ],
    links: [
      {
        url: linkUrl,
        description: linkDescription || null,
      },
    ],
    executive_summary: nullableText(draft.summary.executiveSummary),
    risk_summary: nullableText(draft.summary.riskSummary),
    opportunity_summary: nullableText(draft.summary.opportunitySummary),
    requirements: linesToList(draft.summary.requirements),
    deliverables: linesToList(draft.summary.deliverables),
    qualification_score: parseOptionalNumber(draft.qualification.overallScore),
    recommendation: nullableText(draft.qualification.recommendation),
    confidence: parseOptionalNumber(draft.qualification.confidence),
    ai_reasoning: nullableText(draft.qualification.aiReasoning),
    recommendations: linesToList(draft.qualification.recommendations),
    notes: nullableText(draft.notes),
  };
}

/** Maps the create form draft to POST /idg-sales/{agentId}/opportunities body. */
export function buildCreateOpportunityPayload(draft: OpportunityFormDraft) {
  return {
    ...buildOpportunityFormPayload(draft),
    source_key: "manual",
    source_name: "Manual Entry",
    stage: "awaiting_review" as const,
    run_qualification: true,
  };
}

/** Maps the edit form draft to PATCH /idg-sales/{agentId}/opportunities/{id} body. */
export function buildUpdateOpportunityPayload(draft: OpportunityFormDraft) {
  return buildOpportunityFormPayload(draft);
}

export const OPPORTUNITY_FORM_INPUT_CLASS =
  "h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[12px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500/40";

export const OPPORTUNITY_FORM_TEXTAREA_CLASS =
  "w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500/40";
