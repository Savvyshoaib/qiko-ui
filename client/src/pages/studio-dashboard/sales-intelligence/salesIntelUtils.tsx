import type { Opportunity, OpportunityStage } from "./salesIntelTypes";
import { OPPORTUNITY_STAGE_LABELS } from "./salesIntelTypes";
import { getFormsMock } from "@/data/services";

export function formatCurrency(value?: number, currency = "GBP"): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string): string {
  if (!value) return "—";
  const formatted = new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return formatted.replace(/\b(am|pm)\b/gi, (meridiem) => meridiem.toUpperCase());
}

/**
 * Convert Salesforce My Domain / classic instance URL to Lightning host.
 * e.g. https://orgfarm-83ba2d2ea2.my.salesforce.com → orgfarm-83ba2d2ea2.lightning.force.com
 */
export function salesforceLightningHost(instanceUrl?: string | null): string | null {
  if (!instanceUrl?.trim()) return null;

  try {
    const host = new URL(instanceUrl.trim()).hostname.toLowerCase();
    if (!host) return null;

    if (host.endsWith(".lightning.force.com")) {
      return host;
    }
    if (host.endsWith(".my.salesforce.com")) {
      return host.replace(/\.my\.salesforce\.com$/i, ".lightning.force.com");
    }
    if (host.endsWith(".salesforce.com")) {
      return host.replace(/\.salesforce\.com$/i, ".lightning.force.com");
    }

    return null;
  } catch {
    return null;
  }
}

/** Recent Opportunities list in the user's connected Salesforce org. */
export function buildSalesforceOpportunitiesListUrl(instanceUrl?: string | null): string | null {
  const host = salesforceLightningHost(instanceUrl);
  if (!host) return null;
  return `https://${host}/lightning/o/Opportunity/list?filterName=__Recent`;
}

/** Single Opportunity record in the user's connected Salesforce org. */
export function buildSalesforceOpportunityRecordUrl(
  instanceUrl?: string | null,
  salesforceOpportunityId?: string | null
): string | null {
  const host = salesforceLightningHost(instanceUrl);
  const id = salesforceOpportunityId?.trim();
  if (!host || !id) return null;
  return `https://${host}/lightning/r/Opportunity/${encodeURIComponent(id)}/view`;
}

export function daysUntil(value?: string): number | null {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function stageBadgeClass(stage: OpportunityStage): string {
  const map: Record<OpportunityStage, string> = {
    ingested: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    qualifying: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    qualified: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    awaiting_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    validated: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    push_pending: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    pushed: "bg-green-500/10 text-green-400 border-green-500/20",
    push_failed: "bg-red-500/10 text-red-300 border-red-500/30",
  };
  return map[stage] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

export function StageBadge({ stage }: { stage: OpportunityStage }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-[2px] text-[9px] font-semibold uppercase tracking-wider ${stageBadgeClass(stage)}`}
    >
      {OPPORTUNITY_STAGE_LABELS[stage]}
    </span>
  );
}

const STATUS_LABELS: Record<string, string> = {
  needs_review: "Needs Review",
  not_started: "Not Started",
  awaiting_review: "Awaiting Review",
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
  success: "Success",
  failed: "Failed",
  in_progress: "In progress",
  complete: "Complete",
  validated: "Validated",
  pushed: "Pushed",
  push_pending: "Push Pending",
  push_failed: "Push Failed",
  ingested: "Ingested",
  qualifying: "Qualifying",
  qualified: "Qualified",
};

export function formatStatusLabel(value?: string | null): string {
  if (value == null || String(value).trim() === "") return "—";

  const normalized = String(value).trim().toLowerCase();
  if (STATUS_LABELS[normalized]) {
    return STATUS_LABELS[normalized];
  }

  return String(value)
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function statusBadgeClass(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const map: Record<string, string> = {
    complete: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    in_progress: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
    needs_review: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    awaiting_review: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    approved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    validated: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
    rejected: "bg-red-500/10 text-red-300 border-red-500/25",
    not_started: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    pending: "bg-purple-500/10 text-purple-300 border-purple-500/25",
    success: "bg-green-500/10 text-green-300 border-green-500/25",
    pushed: "bg-green-500/10 text-green-300 border-green-500/25",
    failed: "bg-red-500/10 text-red-300 border-red-500/25",
    push_failed: "bg-red-500/10 text-red-300 border-red-500/25",
    ingested: "bg-blue-500/10 text-blue-300 border-blue-500/25",
    qualifying: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
    qualified: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
    push_pending: "bg-purple-500/10 text-purple-300 border-purple-500/25",
  };

  return map[key] ?? "bg-slate-500/10 text-slate-300 border-slate-500/20";
}

export function StatusBadge({
  value,
  label,
}: {
  value?: string | null;
  label?: string | null;
}) {
  const display = label ?? formatStatusLabel(value);
  if (display === "—") {
    return <span className="text-[12px] text-slate-500">—</span>;
  }

  const badgeKey = String(value ?? label ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(badgeKey)}`}
    >
      {display}
    </span>
  );
}

export function formatSourceLabel(sourceKey?: string | null, sourceName?: string | null): string {
  const key = (sourceKey ?? "").trim().toLowerCase();
  if (key === "ungm") return "UNGM";
  if (key === "ted") return "TED";
  if (key) return key.toUpperCase();

  const name = (sourceName ?? "").trim();
  if (!name) return "Unknown";
  if (/ungm/i.test(name)) return "UNGM";
  if (/\bted\b/i.test(name)) return "TED";
  return name;
}

export function sourceBadgeClass(sourceKey?: string | null, sourceName?: string | null): string {
  const label = formatSourceLabel(sourceKey, sourceName).toUpperCase();
  if (label === "UNGM") return "bg-sky-500/10 text-sky-300 border-sky-500/25";
  if (label === "TED") return "bg-violet-500/10 text-violet-300 border-violet-500/25";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

export function SourceBadge({
  sourceKey,
  sourceName,
}: {
  sourceKey?: string | null;
  sourceName?: string | null;
}) {
  return (
    <span
      className={`inline-flex rounded border px-1.5 py-[1px] text-[8px] font-semibold uppercase tracking-wider ${sourceBadgeClass(sourceKey, sourceName)}`}
      title={sourceName || sourceKey || undefined}
    >
      {formatSourceLabel(sourceKey, sourceName)}
    </span>
  );
}

export function computeDashboardMetrics(opportunities: Opportunity[]) {
  const newFound = opportunities.filter((o) => o.stage === "ingested").length;
  const qualified = opportunities.filter((o) =>
    ["qualified", "awaiting_review", "validated", "push_pending", "pushed"].includes(o.stage)
  ).length;
  const awaitingReview = opportunities.filter((o) => o.stage === "awaiting_review").length;
  const rejected = opportunities.filter((o) => o.stage === "rejected").length;
  const pipelineValue = opportunities
    .filter((o) => !["rejected", "pushed", "push_failed"].includes(o.stage))
    .reduce((sum, o) => sum + (o.estimatedValue ?? 0), 0);
  const upcomingDeadlines = opportunities.filter((o) => {
    const days = daysUntil(o.deadlineAt);
    return days != null && days >= 0 && days <= 14 && o.stage !== "rejected" && o.stage !== "pushed";
  }).length;

  return { newFound, qualified, awaitingReview, rejected, pipelineValue, upcomingDeadlines };
}

export function useSalesIntelAgentId(agentId: string) {
  return agentId.trim();
}

const MOCK_TENDER_PDF_URL =
  String(
    (getFormsMock() as { tenderPdfFallbackUrl?: string }).tenderPdfFallbackUrl ??
      "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf"
  );

export function getOpportunityDocument(opportunity: Opportunity) {
  const name =
    opportunity.sourceDocumentName ??
    (opportunity.externalId
      ? `${opportunity.externalId}-tender-pack.pdf`
      : `${opportunity.title.replace(/[^\w\s-]/g, "").trim().slice(0, 48) || "opportunity"}.pdf`);

  const url = opportunity.sourceDocumentUrl ?? MOCK_TENDER_PDF_URL;

  return { name, url };
}
