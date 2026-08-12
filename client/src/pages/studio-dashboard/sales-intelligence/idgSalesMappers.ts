import type {
  IdgSalesActivityLog,
  IdgSalesIngestionSource,
  IdgSalesOpportunity,
} from "@/lib/idgSalesApi";
import type {
  HumanReviewStatus,
  IngestionSource,
  Opportunity,
  SalesforcePushLogEntry,
  SalesforcePushStatus,
} from "./salesIntelTypes";

function hasApiId<T extends { id?: unknown }>(item: T | null | undefined): item is T & { id: string | number } {
  return item !== null && item !== undefined && item.id !== null && item.id !== undefined && String(item.id).trim() !== "";
}

function mapSourceType(type: string): IngestionSource["type"] {
  const normalized = type.toLowerCase();
  if (normalized === "api") return "api";
  if (normalized === "manual") return "manual";
  return "portal";
}

function mapLastScanStatus(
  value?: string | null
): IngestionSource["lastScanStatus"] | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === "success") return "success";
  if (normalized === "failed" || normalized === "error") return "failed";
  if (normalized === "running") return "running";
  return undefined;
}

function mapHumanReviewStatus(value?: string | null): HumanReviewStatus | undefined {
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  if (value === "needs_review") return "pending";
  return undefined;
}

function mapSalesforcePushStatus(value?: string | null): SalesforcePushStatus | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === "success" || normalized === "synced") return "success";
  if (normalized === "failed" || normalized === "error") return "failed";
  if (normalized === "pending" || normalized === "in_progress") return "pending";
  if (normalized === "not_started" || normalized === "none") return "not_started";
  return undefined;
}

export function mapApiSourceToIngestionSource(source: IdgSalesIngestionSource): IngestionSource {
  const status = source.status?.toLowerCase() ?? "";
  const sourceKey = (source.sourceKey ?? "").toLowerCase();
  const isActive = status === "active" || status === "connected";
  const cadence = (source.scanCadence ?? "").toLowerCase();
  const scanCadence: IngestionSource["scanCadence"] =
    cadence === "minutely" ||
    cadence === "hourly" ||
    cadence === "daily" ||
    cadence === "weekly" ||
    cadence === "manual"
      ? cadence
      : "manual";

  return {
    id: String(source.id),
    sourceKey,
    name: source.name,
    type: mapSourceType(source.type),
    isActive,
    canScan: Boolean(source.scannable),
    scanCadence,
    lastScanAt: source.lastScanAt ?? undefined,
    nextScanAt: source.nextScanAt ?? null,
    lastScanStatus: mapLastScanStatus(source.lastScanStatus),
    opportunitiesFound: source.opportunitiesFound ?? 0,
    connector: source.connector ?? null,
    config: {
      url: typeof source.config?.url === "string" ? source.config.url : undefined,
      apiUrl:
        typeof source.config?.api_url === "string"
          ? source.config.api_url
          : typeof source.config?.apiUrl === "string"
            ? source.config.apiUrl
            : undefined,
      defaultQuery:
        typeof source.config?.default_query === "string"
          ? source.config.default_query
          : typeof source.config?.defaultQuery === "string"
            ? source.config.defaultQuery
            : undefined,
      connector:
        typeof source.config?.connector === "string"
          ? source.config.connector
          : source.connector ?? undefined,
    },
  };
}

export function mapApiOpportunityToOpportunity(
  opportunity: IdgSalesOpportunity,
  agentId: string
): Opportunity {
  return {
    id: String(opportunity.id),
    agentId,
    externalId: opportunity.externalId ?? undefined,
    sourceKey: opportunity.sourceKey ?? undefined,
    title: opportunity.title || "",
    buyer: opportunity.buyer ?? "",
    source: opportunity.source ?? opportunity.sourceKey ?? "",
    sourceUrl: opportunity.sourceUrl ?? undefined,
    country: opportunity.country ?? undefined,
    category: opportunity.category ?? undefined,
    estimatedValue: opportunity.estimatedValue ?? undefined,
    currency: opportunity.currency ?? "GBP",
    publishedAt: opportunity.publishedAt ?? undefined,
    deadlineAt: opportunity.deadlineAt ?? undefined,
    stage: opportunity.stage,
    recommendation: opportunity.recommendation ?? undefined,
    confidence: opportunity.confidence ?? undefined,
    risks: opportunity.risks ?? [],
    qualificationScore: opportunity.qualificationScore ?? undefined,
    qualificationSummary: opportunity.qualificationSummary ?? undefined,
    qualificationReasons: opportunity.qualificationReasons ?? [],
    rejectionReasons: opportunity.rejectionReasons ?? [],
    humanReviewStatus: mapHumanReviewStatus(opportunity.humanReviewStatus),
    humanReviewNotes: opportunity.humanReviewNotes ?? undefined,
    reviewedBy:
      opportunity.reviewedBy?.userName?.trim() ||
      opportunity.reviewedBy?.email?.trim() ||
      undefined,
    reviewedAt: opportunity.reviewedAt ?? undefined,
    assignedReviewerId: opportunity.assignedReviewer?.id ?? undefined,
    assignedReviewer:
      opportunity.assignedReviewer?.userName?.trim() ||
      opportunity.assignedReviewer?.email?.trim() ||
      undefined,
    assignedReviewerEmail: opportunity.assignedReviewer?.email?.trim() || undefined,
    assignedAt: opportunity.assignedAt ?? undefined,
    salesforceOpportunityId: opportunity.salesforceOpportunityId ?? undefined,
    salesforcePushStatus: mapSalesforcePushStatus(opportunity.salesforcePushStatus),
    salesforcePushError: opportunity.salesforcePushError ?? undefined,
    salesforcePushedAt: opportunity.salesforcePushedAt ?? undefined,
    detail: opportunity.detail
      ? {
          overview: opportunity.detail.overview ?? {},
          summary: opportunity.detail.summary ?? {},
          qualification: opportunity.detail.qualification ?? {},
          completed: opportunity.detail.completed ?? {},
          notes: opportunity.detail.notes ?? {},
        }
      : undefined,
    createdAt: opportunity.createdAt ?? new Date().toISOString(),
    updatedAt: opportunity.updatedAt ?? new Date().toISOString(),
  };
}

function formatActivityAction(action: string) {
  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapActivityTone(value?: string | null): SalesforcePushLogEntry["tone"] {
  if (value === "success" || value === "warning" || value === "danger" || value === "info") return value;
  return "info";
}

function mapActivityStatus(
  tone: SalesforcePushLogEntry["tone"],
  action: string
): SalesforcePushLogEntry["status"] {
  if (tone === "success" || /success|pushed|approved|validated/i.test(action)) return "success";
  if (tone === "danger" || /fail|error|reject/i.test(action)) return "failed";
  if (tone === "warning") return "warning";
  return "info";
}

function readSalesforceIdFromMetadata(metadata?: Record<string, unknown> | null): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const candidates = [
    metadata.salesforceOpportunityId,
    metadata.salesforce_id,
    metadata.salesforceId,
    metadata.sf_id,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export const SALESFORCE_ACTIVITY_ACTIONS = [
  "salesforce_credentials_saved",
  "salesforce_connected",
  "salesforce_disconnected",
  "salesforce_push_started",
  "salesforce_push_succeeded",
  "salesforce_push_failed",
] as const;

/** Maps `GET /idg-sales/{agentId}/activity-logs` into Salesforce Push Log rows. */
export function mapActivityLogsToPushLog(
  logs: IdgSalesActivityLog[],
  opportunities: Opportunity[]
): SalesforcePushLogEntry[] {
  const allowed = new Set<string>(SALESFORCE_ACTIVITY_ACTIONS);

  return logs
    .filter(hasApiId)
    .filter((log) => allowed.has(log.action || ""))
    .map((log) => {
      const opportunityId = log.opportunityId != null ? String(log.opportunityId) : "";
      const opportunity = opportunities.find((item) => item.id === opportunityId);
      const action = log.action || "";
      const tone = mapActivityTone(log.tone);
      const status = mapActivityStatus(tone, action);
      const salesforceId =
        readSalesforceIdFromMetadata(log.metadata) ?? opportunity?.salesforceOpportunityId;
      const titleFromDetail =
        typeof log.detail === "string" && log.detail.trim().length > 0
          ? log.detail.trim()
          : formatActivityAction(action);

      return {
        id: `log-${log.id}`,
        opportunityId,
        opportunityTitle: opportunity?.title ?? titleFromDetail,
        action: formatActivityAction(action),
        detail: log.detail || "",
        tone,
        attemptedAt: log.createdAt ?? new Date().toISOString(),
        status,
        salesforceId,
        errorMessage: status === "failed" ? log.detail || undefined : undefined,
      };
    })
    .sort((a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime());
}

export type OpportunityActivityCategory = "lifecycle" | "review" | "sync" | "system";
export type OpportunityActivityStatus = "success" | "failed" | "info" | "warning";

export interface OpportunityActivityFieldChange {
  field: string;
  from?: string;
  to?: string;
}

export interface OpportunityActivityEntry {
  id: string;
  action: string;
  category: OpportunityActivityCategory;
  opportunityTitle: string;
  opportunityId?: string;
  actor: string;
  actorRole: string;
  occurredAt: string;
  status: OpportunityActivityStatus;
  detail: string;
  fromStatus?: string;
  toStatus?: string;
  activityType?: string | null;
  fieldChanges?: OpportunityActivityFieldChange[];
}

function mapOpportunityActivityCategory(
  action: string,
  activityType?: string | null
): OpportunityActivityCategory {
  const normalized = action.toLowerCase();
  if (
    normalized.startsWith("salesforce_") ||
    normalized.includes("push")
  ) {
    return "sync";
  }
  if (
    normalized.includes("human_review") ||
    normalized.includes("approved") ||
    normalized.includes("rejected") ||
    normalized.includes("reviewer") ||
    normalized === "human_review_recorded"
  ) {
    return "review";
  }
  if (
    activityType === "source_scan" ||
    activityType === "source_status" ||
    normalized.startsWith("source_") ||
    normalized.includes("_scan_")
  ) {
    return "system";
  }
  return "lifecycle";
}

function readChangesMap(
  log: IdgSalesActivityLog
): Record<string, { from?: unknown; to?: unknown }> | null {
  if (log.changes && typeof log.changes === "object" && !Array.isArray(log.changes)) {
    return log.changes;
  }
  const metadata = log.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const changes = metadata.changes;
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return null;
  return changes as Record<string, { from?: unknown; to?: unknown }>;
}

function formatChangeValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function readStageChange(metadata?: Record<string, unknown> | null): {
  fromStatus?: string;
  toStatus?: string;
} {
  if (!metadata || typeof metadata !== "object") return {};
  const changes = metadata.changes;
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return {};
  const stage = (changes as Record<string, unknown>).stage;
  if (!stage || typeof stage !== "object" || Array.isArray(stage)) return {};
  const from = (stage as Record<string, unknown>).from;
  const to = (stage as Record<string, unknown>).to;
  return {
    fromStatus: typeof from === "string" && from.trim() ? formatActivityAction(from) : undefined,
    toStatus: typeof to === "string" && to.trim() ? formatActivityAction(to) : undefined,
  };
}

function readFieldChanges(log: IdgSalesActivityLog): OpportunityActivityFieldChange[] {
  const changes = readChangesMap(log);
  if (!changes) return [];

  return Object.entries(changes)
    .map(([field, diff]) => {
      if (!diff || typeof diff !== "object" || Array.isArray(diff)) return null;
      return {
        field: formatActivityAction(field),
        from: formatChangeValue(diff.from),
        to: formatChangeValue(diff.to),
      };
    })
    .filter((item): item is OpportunityActivityFieldChange => item != null);
}

function resolveActivityActor(log: IdgSalesActivityLog): { actor: string; actorRole: string } {
  const name = log.actor?.userName?.trim();
  const email = log.actor?.email?.trim();
  if (name) {
    return { actor: name, actorRole: email || "User" };
  }
  if (email) {
    return { actor: email, actorRole: "User" };
  }
  if (log.actorUserId != null) {
    return { actor: `User #${log.actorUserId}`, actorRole: "User" };
  }
  return { actor: "System", actorRole: "Automation" };
}

/** Maps `GET /idg-sales/{agentId}/activity-logs` into Opportunity activity rows. */
export function mapActivityLogsToOpportunityActivity(
  logs: IdgSalesActivityLog[],
  opportunities: Opportunity[]
): OpportunityActivityEntry[] {
  return logs
    .filter(hasApiId)
    .map((log) => {
      const opportunityId = log.opportunityId != null ? String(log.opportunityId) : undefined;
      const opportunity = opportunityId
        ? opportunities.find((item) => item.id === opportunityId)
        : undefined;
      const action = log.action || "";
      const tone = mapActivityTone(log.tone);
      const status = mapActivityStatus(tone, action) as OpportunityActivityStatus;
      const { fromStatus, toStatus } = readStageChange(log.metadata);
      const { actor, actorRole } = resolveActivityActor(log);
      const fieldChanges = readFieldChanges(log);
      const titleFromDetail =
        typeof log.detail === "string" && log.detail.trim().length > 0
          ? log.detail.trim()
          : formatActivityAction(action);

      return {
        id: `log-${log.id}`,
        action: formatActivityAction(action),
        category: mapOpportunityActivityCategory(action, log.activityType),
        opportunityTitle: opportunity?.title ?? (opportunityId ? `Opportunity #${opportunityId}` : titleFromDetail),
        opportunityId,
        actor,
        actorRole,
        occurredAt: log.createdAt ?? new Date().toISOString(),
        status,
        detail: log.detail || "",
        fromStatus,
        toStatus,
        activityType: log.activityType,
        fieldChanges: fieldChanges.length > 0 ? fieldChanges : undefined,
      };
    })
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export { hasApiId };
