import { appFetch } from "@/data/appFetch";

export const IDG_SALES_STATIC_AGENT_ID = "d06b54db-f967-4f72-af16-f97abc296286";

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

export type IdgSalesOpportunityStage =
  | "ingested"
  | "qualifying"
  | "qualified"
  | "rejected"
  | "awaiting_review"
  | "validated"
  | "push_pending"
  | "pushed"
  | "push_failed";

export type IdgSalesReviewDecision = "approved" | "rejected" | "needs_review";

export interface IdgSalesApiEnvelope<TData> {
  success?: boolean;
  data?: TData;
  errors?: Record<string, string[]>;
  message?: string;
}

export interface IdgSalesReviewedBy {
  id: number;
  userName?: string | null;
  email?: string | null;
}

export interface IdgSalesIngestionSource {
  id: number;
  agentId?: string | null;
  sourceKey: string;
  name: string;
  type: string;
  status: string;
  authStatus?: string | null;
  scannable?: boolean;
  connector?: string | null;
  scanCadence?: string | null;
  scanIntervalMinutes?: number | null;
  lastScanStatus?: string | null;
  lastScanAt?: string | null;
  nextScanAt?: string | null;
  opportunitiesFound: number;
  lastError?: string | null;
  config: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface IdgSalesOpportunityDetailSections {
  overview?: {
    deadlineAt?: string | null;
    estimatedValue?: number | null;
    currency?: string | null;
    country?: string | null;
    category?: string | null;
    buyer?: string | null;
    source?: string | null;
    sourceUrl?: string | null;
    publishedAt?: string | null;
    securityClearance?: string | null;
    contacts?: { name?: string | null; email?: string | null; phone?: string | null }[];
    extractionConfidence?: number | null;
    framework?: string | null;
    contractDuration?: string | null;
    technology?: string | null;
    reference?: string | null;
    noticeType?: string | null;
    links?: { url: string; description?: string | null }[];
  };
  summary?: {
    executiveSummary?: string;
    riskSummary?: string;
    opportunitySummary?: string;
    requirements?: string[];
    deliverables?: string[];
  };
  qualification?: {
    overallScore?: number | null;
    recommendation?: string | null;
    confidence?: number | null;
    dimensions?: Record<string, number>;
    aiReasoning?: string | null;
    recommendations?: string[];
    reasons?: string[];
    risks?: string[];
    rejectionReasons?: string[];
  };
  completed?: {
    isComplete?: boolean;
    stage?: string;
    humanReviewStatus?: string | null;
    humanReviewNotes?: string | null;
    reviewedBy?: IdgSalesReviewedBy | null;
    reviewedAt?: string | null;
    salesforcePushStatus?: string | null;
    salesforceOpportunityId?: string | null;
    salesforcePushedAt?: string | null;
    salesforcePushError?: string | null;
    completedAt?: string | null;
  };
  notes?: {
    humanReviewNotes?: string | null;
    updatedAt?: string | null;
  };
}

export interface IdgSalesOpportunity {
  id: number;
  agentId?: string | null;
  externalId?: string | null;
  sourceKey?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  title: string;
  buyer?: string | null;
  country?: string | null;
  region?: string | null;
  category?: string | null;
  estimatedValue?: number | null;
  currency?: string | null;
  publishedAt?: string | null;
  deadlineAt?: string | null;
  stage: IdgSalesOpportunityStage;
  recommendation?: string | null;
  qualificationScore?: number | null;
  confidence?: number | null;
  competitorReadiness?: string | null;
  qualificationSummary?: string | null;
  qualificationReasons: string[];
  rejectionReasons: string[];
  risks: string[];
  missingFields: string[];
  humanReviewStatus?: IdgSalesReviewDecision | null;
  humanReviewNotes?: string | null;
  reviewedBy?: IdgSalesReviewedBy | null;
  reviewedAt?: string | null;
  assignedReviewer?: IdgSalesReviewedBy | null;
  assignedBy?: IdgSalesReviewedBy | null;
  assignedAt?: string | null;
  updatedBy?: IdgSalesReviewedBy | null;
  archivedAt?: string | null;
  isArchived?: boolean;
  archivedBy?: IdgSalesReviewedBy | null;
  deletedAt?: string | null;
  deletedBy?: IdgSalesReviewedBy | null;
  salesforcePushStatus?: string | null;
  salesforceOpportunityId?: string | null;
  salesforcePushedAt?: string | null;
  salesforcePushError?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  detail?: IdgSalesOpportunityDetailSections;
}

export interface IdgSalesDashboardSummary {
  total?: number;
  new?: number;
  qualified?: number;
  awaitingReview?: number;
  rejected?: number;
  validated?: number;
  pushed?: number;
  pipelineValue?: number;
  [key: string]: unknown;
}

export interface IdgSalesActivityActor {
  id: number;
  userName?: string | null;
  email?: string | null;
}

export interface IdgSalesActivityLog {
  id: number;
  agentId?: string | null;
  opportunityId?: number | null;
  actorUserId?: number | null;
  actor?: IdgSalesActivityActor | null;
  activityType?: "opportunity" | "source_status" | "source_scan" | string | null;
  action: string;
  detail: string;
  tone?: string | null;
  changes?: Record<string, { from?: unknown; to?: unknown }> | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GetIdgSalesSourcesResponse {
  sources: IdgSalesIngestionSource[];
}

/** Catalog portal key (TED is the reference; ABC/XYZ/BBB when registered). */
export type IdgSalesSourceKey = string;

export interface IdgSalesSourceCatalogItem {
  key: string;
  name: string;
  description?: string | null;
  type?: string;
  authStatus?: string | null;
  scannable: boolean;
  alreadyAdded: boolean;
  defaultConfig?: {
    url?: string | null;
    apiUrl?: string | null;
    defaultQuery?: string | null;
    ingestFilters?: Record<string, unknown> | null;
  } | null;
}

export interface GetIdgSalesSourceCatalogResponse {
  catalog: IdgSalesSourceCatalogItem[];
}

export interface AddIdgSalesSourceConfig {
  url: string;
  api_url?: string | null;
  default_query?: string | null;
  /** Built-in scanner: ted | ungm | generic */
  connector?: "ted" | "ungm" | "generic" | string | null;
  ingest_filters?: {
    query_enabled?: boolean;
    query_keyword?: string | null;
    all_countries?: boolean;
    all_categories?: boolean;
  };
}

export interface AddIdgSalesSourcePayload {
  source_key: string;
  /** Required for custom (non-catalog) sources */
  name?: string;
  config: AddIdgSalesSourceConfig;
}

export interface AddIdgSalesSourceResponse {
  source: IdgSalesIngestionSource;
}

/** @deprecated Prefer catalog / attached source.canScan */
export const IDG_SALES_SCANNABLE_SOURCE_KEYS: readonly string[] = [
  "ungm",
  "ted",
];

export function isIdgSalesScannableSourceKey(sourceKey: string): boolean {
  const key = sourceKey.trim().toLowerCase();
  if (!key) return false;
  return (IDG_SALES_SCANNABLE_SOURCE_KEYS as readonly string[]).includes(key);
}

export type IdgSalesSourceStatus = "active" | "inactive";

export type IdgSalesScanCadence =
  | "minutely"
  | "hourly"
  | "daily"
  | "weekly"
  | "manual";

export interface UpdateIdgSalesSourcePayload {
  status?: IdgSalesSourceStatus;
  scan_cadence?: IdgSalesScanCadence;
  name?: string;
  config?: {
    url?: string;
    api_url?: string | null;
    default_query?: string | null;
    connector?: string | null;
    ingest_filters?: {
      query_enabled?: boolean;
      query_keyword?: string | null;
      all_countries?: boolean;
      all_categories?: boolean;
    };
  };
}

export interface UpdateIdgSalesSourceResponse {
  source: IdgSalesIngestionSource;
}

export interface IdgSalesIngestFilters {
  agentId?: string | null;
  queryEnabled: boolean;
  queryKeyword: string;
  allCountries: boolean;
  allCategories: boolean;
  updatedAt?: string | null;
}

export interface GetIdgSalesIngestFiltersResponse {
  ingestFilters: IdgSalesIngestFilters;
}

export interface UpdateIdgSalesIngestFiltersPayload {
  query_enabled?: boolean;
  query_keyword?: string | null;
  all_countries?: boolean;
  all_categories?: boolean;
}

export interface UpdateIdgSalesIngestFiltersResponse {
  ingestFilters: IdgSalesIngestFilters;
}

export interface ScanSourcePayload {
  query?: string;
  title?: string;
  page_size?: number;
  page_index?: number;
  active_only?: boolean;
  /** "*" = all countries; omit or null = configured target allowlist only */
  country_allowlist?: "*" | null;
  /** "*" = all categories; omit or null = security category filter only */
  category_allowlist?: "*" | null;
}

/** @deprecated Prefer ScanSourcePayload */
export type ScanUngmPayload = ScanSourcePayload;

export interface ScanSourceResponse {
  source: IdgSalesIngestionSource;
  opportunities: IdgSalesOpportunity[];
  summary: {
    created: number;
    updated: number;
    totalReturned: number;
  };
  /** Same-session inbox delivery when FCM tokens are unavailable */
  pushNotifications?: IdgSalesPushNotification[];
}

/** @deprecated Prefer ScanSourceResponse */
export type ScanUngmResponse = ScanSourceResponse;

export interface GetIdgSalesOpportunitiesParams {
  stage?: IdgSalesOpportunityStage;
  source_key?: string;
  search?: string;
  /** Number cap, or "*" / "all" for every opportunity for the agent. */
  limit?: number | "*" | "all";
  include_archived?: boolean;
  archived_only?: boolean;
  assigned_reviewer_user_id?: number;
}

export interface GetIdgSalesOpportunitiesResponse {
  opportunities: IdgSalesOpportunity[];
  summary: IdgSalesDashboardSummary;
}

export interface GetIdgSalesOpportunityResponse {
  opportunity: IdgSalesOpportunity;
}

export interface CreateIdgSalesOpportunityPayload {
  title: string;
  buyer?: string | null;
  country?: string | null;
  region?: string | null;
  category?: string | null;
  estimated_value?: number | null;
  currency?: string | null;
  published_at?: string | null;
  deadline_at?: string | null;
  source_url?: string | null;
  source_key?: string | null;
  source_name?: string | null;
  stage?: IdgSalesOpportunityStage;
  run_qualification?: boolean;
  reference?: string | null;
  notice_type?: string | null;
  security_clearance?: string | null;
  extraction_confidence?: number | null;
  framework?: string | null;
  contract_duration?: string | null;
  technology?: string | null;
  contacts?: Array<{
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  }>;
  links?: Array<{
    url: string;
    description?: string | null;
  }>;
  executive_summary?: string | null;
  risk_summary?: string | null;
  opportunity_summary?: string | null;
  requirements?: string[];
  deliverables?: string[];
  qualification_score?: number | null;
  recommendation?: string | null;
  confidence?: number | null;
  ai_reasoning?: string | null;
  recommendations?: string[];
  notes?: string | null;
}

export interface IdgSalesPushNotification {
  id?: number | string;
  userId?: number | string | null;
  notifyType?: string;
  type?: string;
  title?: string;
  body?: string;
  createdAt?: string | null;
  agentId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateIdgSalesOpportunityResponse {
  opportunity: IdgSalesOpportunity;
  pushNotifications?: IdgSalesPushNotification[];
}

export interface UpdateIdgSalesOpportunityPayload {
  title?: string;
  buyer?: string | null;
  country?: string | null;
  region?: string | null;
  category?: string | null;
  estimated_value?: number | null;
  currency?: string | null;
  published_at?: string | null;
  deadline_at?: string | null;
  source_url?: string | null;
  requalify?: boolean;
  reference?: string | null;
  notice_type?: string | null;
  security_clearance?: string | null;
  extraction_confidence?: number | null;
  framework?: string | null;
  contract_duration?: string | null;
  technology?: string | null;
  contacts?: Array<{
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  }>;
  links?: Array<{
    url: string;
    description?: string | null;
  }>;
  executive_summary?: string | null;
  risk_summary?: string | null;
  opportunity_summary?: string | null;
  requirements?: string[];
  deliverables?: string[];
  qualification_score?: number | null;
  recommendation?: string | null;
  confidence?: number | null;
  ai_reasoning?: string | null;
  recommendations?: string[];
  notes?: string | null;
}

export interface UpdateIdgSalesOpportunityResponse {
  opportunity: IdgSalesOpportunity;
}

export interface ArchiveIdgSalesOpportunityResponse {
  opportunity: IdgSalesOpportunity;
}

export interface RestoreIdgSalesOpportunityResponse {
  opportunity: IdgSalesOpportunity;
}

export interface ReviewIdgSalesOpportunityPayload {
  decision: IdgSalesReviewDecision;
  notes?: string;
}

export interface ReviewIdgSalesOpportunityResponse {
  opportunity: IdgSalesOpportunity;
}

export interface SaveIdgSalesOpportunityNotesPayload {
  notes?: string | null;
}

export interface SaveIdgSalesOpportunityNotesResponse {
  opportunity: IdgSalesOpportunity;
}

export interface AssignIdgSalesOpportunityReviewerPayload {
  user_id: number | null;
}

export interface AssignIdgSalesOpportunityReviewerResponse {
  opportunity: IdgSalesOpportunity;
  pushNotifications?: IdgSalesPushNotification[];
}

export interface GetIdgSalesActivityLogsParams {
  activity_type?: "opportunity" | "source_status" | "source_scan";
  action?: string;
  /** OR filter — preferred over single `action` when multiple values are needed. */
  actions?: string[];
  opportunity_id?: number;
  limit?: number;
}

export interface GetIdgSalesActivityLogsResponse {
  activityLogs: IdgSalesActivityLog[];
}

export interface GetIdgSalesOpportunityHistoryParams {
  limit?: number;
}

export interface GetIdgSalesOpportunityHistoryResponse {
  opportunityId: number;
  history: IdgSalesActivityLog[];
}

export interface IdgSalesScanHistoryEntry {
  id: number;
  agentId?: string | null;
  activityType?: string | null;
  sourceKey?: string | null;
  status?: "success" | "failed" | string | null;
  action: string;
  detail?: string | null;
  tone?: string | null;
  created?: number;
  updated?: number;
  skipped?: number;
  opportunitiesFound?: number;
  metadata?: Record<string, unknown> | null;
  actorUserId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GetIdgSalesScanHistoryParams {
  source_key?: "ungm" | "ted" | string;
  status?: "success" | "failed";
  limit?: number;
}

export interface IdgSalesScanHistorySummary {
  recentScans: number;
  successful: number;
  failed: number;
  successRate: number;
}

export interface GetIdgSalesScanHistoryResponse {
  scanHistory: IdgSalesScanHistoryEntry[];
  summary?: IdgSalesScanHistorySummary;
}

export interface IdgSalesDecisionHistoryReviewer {
  id: number;
  userName?: string | null;
  email?: string | null;
}

export interface IdgSalesDecisionHistoryEntry {
  id: number;
  agentId?: string | null;
  opportunityId?: number | null;
  opportunityTitle?: string | null;
  opportunityStage?: string | null;
  action: string;
  decision?: "approved" | "rejected" | "needs_review" | string | null;
  decisionLabel?: string | null;
  detail?: string | null;
  tone?: string | null;
  reviewerUserId?: number | null;
  reviewer?: IdgSalesDecisionHistoryReviewer | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GetIdgSalesDecisionHistoryParams {
  decision?: "approved" | "rejected" | "needs_review";
  reviewer_user_id?: number;
  limit?: number;
}

export interface IdgSalesDecisionHistorySummary {
  approvals: number;
  rejections: number;
  overrides: number;
  total: number;
}

export interface GetIdgSalesDecisionHistoryResponse {
  decisionHistory: IdgSalesDecisionHistoryEntry[];
  reviewers: IdgSalesDecisionHistoryReviewer[];
  summary?: IdgSalesDecisionHistorySummary;
}

export interface IdgSalesSalesforceConnection {
  connected: boolean;
  status: string;
  instanceUrl?: string | null;
  salesforceUserId?: string | null;
  salesforceOrgId?: string | null;
  connectedAt?: string | null;
  tokenExpiresAt?: string | null;
  lastError?: string | null;
  configured: boolean;
  hasCredentials?: boolean;
  loginBaseUrl?: string | null;
  oauthCallbackUrl?: string | null;
}

export interface GetIdgSalesforceStatusResponse {
  salesforce: IdgSalesSalesforceConnection;
}

export interface SaveIdgSalesforceCredentialsPayload {
  clientId: string;
  clientSecret: string;
  loginBaseUrl?: "https://login.salesforce.com" | "https://test.salesforce.com" | "production" | "sandbox";
}

export interface SaveIdgSalesforceCredentialsResponse {
  salesforce: IdgSalesSalesforceConnection;
  oauthCallbackUrl?: string;
}

export interface ConnectIdgSalesforceResponse {
  authorizeUrl: string;
  state: string;
  oauthCallbackUrl?: string;
}

export interface DisconnectIdgSalesforceResponse {
  salesforce: IdgSalesSalesforceConnection;
}

export interface PushIdgSalesOpportunityResponse {
  opportunity: IdgSalesOpportunity;
  pushNotifications?: IdgSalesPushNotification[];
}

function getSessionToken(): string | null {
  return localStorage.getItem("qiko_session_token");
}

function getAuthHeaders(includeJsonContentType = false): HeadersInit {
  const token = getSessionToken();
  return {
    ...(includeJsonContentType && { "Content-Type": "application/json" }),
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function buildEndpoint(path: string): string {
  const base = BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function buildQuery(params?: object): string {
  if (!params) return "";

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === "") continue;
        query.append(`${key}[]`, String(item));
      }
      continue;
    }
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") continue;
    // Laravel `boolean` validation accepts 1/0, not the strings "true"/"false".
    query.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function extractApiErrorMessage(data: unknown, defaultMessage: string): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const message = typeof obj.message === "string" ? obj.message : null;
    const errors = obj.errors;

    if (errors && typeof errors === "object") {
      const first = Object.values(errors as Record<string, unknown>)[0];
      if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    }

    if (message) return message;
  }

  return defaultMessage;
}

async function handleUnauthorizedLogout(res: Response): Promise<void> {
  if (res.status !== 401 || typeof window === "undefined") return;

  localStorage.removeItem("qiko_session_token");
  localStorage.removeItem("qiko_user_info");
  localStorage.removeItem("qiko_subscription");
  localStorage.removeItem("qiko_calendly_token");

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

async function requestIdgSales<TData>(
  path: string,
  init: RequestInit = {},
  defaultError = "IDG Sales request failed"
): Promise<TData> {
  const hasBody = init.body !== undefined && init.body !== null;
  const res = await appFetch(buildEndpoint(path), {
    ...init,
    headers: {
      ...getAuthHeaders(hasBody),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  await handleUnauthorizedLogout(res);

  const json = (await res.json().catch(() => ({}))) as IdgSalesApiEnvelope<TData>;
  if (!res.ok || json.success === false) {
    const err = new Error(extractApiErrorMessage(json, defaultError)) as Error & {
      validationErrors?: Record<string, string[]>;
      data?: TData;
    };

    if (json.errors && typeof json.errors === "object") {
      err.validationErrors = json.errors;
    }
    if (json.data !== undefined) {
      err.data = json.data;
    }

    throw err;
  }

  return (json.data ?? (json as TData)) as TData;
}

function idgSalesAgentPath(agentId: string, path = ""): string {
  const trimmedAgentId = agentId.trim();
  if (!trimmedAgentId) throw new Error("Agent ID is required");

  const suffix = path ? `/${path.replace(/^\//, "")}` : "";
  return `/idg-sales/${encodeURIComponent(trimmedAgentId)}${suffix}`;
}

export function getIdgSalesSources(agentId: string): Promise<GetIdgSalesSourcesResponse> {
  return requestIdgSales<GetIdgSalesSourcesResponse>(
    idgSalesAgentPath(agentId, "sources"),
    { method: "GET" },
    "Failed to fetch IDG Sales sources"
  );
}

export function getIdgSalesSourceCatalog(
  agentId: string
): Promise<GetIdgSalesSourceCatalogResponse> {
  return requestIdgSales<GetIdgSalesSourceCatalogResponse>(
    idgSalesAgentPath(agentId, "sources/catalog"),
    { method: "GET" },
    "Failed to fetch IDG Sales source catalog"
  );
}

export function addIdgSalesSource(
  agentId: string,
  payload: AddIdgSalesSourcePayload
): Promise<AddIdgSalesSourceResponse> {
  const sourceKey = String(payload.source_key ?? "").trim().toLowerCase();
  if (!sourceKey) throw new Error("Source key is required");

  const url = String(payload.config?.url ?? "").trim();
  if (!url) throw new Error("config.url is required");

  const name = String(payload.name ?? "").trim();
  const apiUrl = String(payload.config?.api_url ?? "").trim();
  const defaultQuery =
    payload.config?.default_query === undefined || payload.config?.default_query === null
      ? undefined
      : String(payload.config.default_query);
  const connector = String(payload.config?.connector ?? "").trim().toLowerCase();

  return requestIdgSales<AddIdgSalesSourceResponse>(
    idgSalesAgentPath(agentId, "sources"),
    {
      method: "POST",
      body: JSON.stringify({
        source_key: sourceKey,
        ...(name !== "" ? { name } : {}),
        config: {
          url,
          ...(apiUrl !== "" ? { api_url: apiUrl } : {}),
          ...(defaultQuery !== undefined ? { default_query: defaultQuery } : {}),
          ...(connector !== "" ? { connector } : {}),
          ...(payload.config.ingest_filters
            ? { ingest_filters: payload.config.ingest_filters }
            : {}),
        },
      }),
    },
    "Failed to add IDG Sales source"
  );
}

export function updateIdgSalesSource(
  agentId: string,
  sourceKey: IdgSalesSourceKey | string,
  payload: UpdateIdgSalesSourcePayload
): Promise<UpdateIdgSalesSourceResponse> {
  const trimmedKey = String(sourceKey).trim().toLowerCase();
  if (!trimmedKey) throw new Error("Source key is required");

  return requestIdgSales<UpdateIdgSalesSourceResponse>(
    idgSalesAgentPath(agentId, `sources/${encodeURIComponent(trimmedKey)}`),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to update IDG Sales source"
  );
}

export interface DeleteIdgSalesSourceResponse {
  source: IdgSalesIngestionSource;
}

export function deleteIdgSalesSource(
  agentId: string,
  sourceKey: IdgSalesSourceKey | string
): Promise<DeleteIdgSalesSourceResponse> {
  const trimmedKey = String(sourceKey).trim().toLowerCase();
  if (!trimmedKey) throw new Error("Source key is required");

  return requestIdgSales<DeleteIdgSalesSourceResponse>(
    idgSalesAgentPath(agentId, `sources/${encodeURIComponent(trimmedKey)}`),
    { method: "DELETE" },
    "Failed to delete IDG Sales source"
  );
}

export function getIdgSalesIngestFilters(
  agentId: string
): Promise<GetIdgSalesIngestFiltersResponse> {
  return requestIdgSales<GetIdgSalesIngestFiltersResponse>(
    idgSalesAgentPath(agentId, "ingest-filters"),
    { method: "GET" },
    "Failed to fetch IDG Sales ingest filters"
  );
}

export function updateIdgSalesIngestFilters(
  agentId: string,
  payload: UpdateIdgSalesIngestFiltersPayload
): Promise<UpdateIdgSalesIngestFiltersResponse> {
  return requestIdgSales<UpdateIdgSalesIngestFiltersResponse>(
    idgSalesAgentPath(agentId, "ingest-filters"),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to update IDG Sales ingest filters"
  );
}

export function getIdgSalesActivityLogs(
  agentId: string,
  params: GetIdgSalesActivityLogsParams = {}
): Promise<GetIdgSalesActivityLogsResponse> {
  return requestIdgSales<GetIdgSalesActivityLogsResponse>(
    `${idgSalesAgentPath(agentId, "activity-logs")}${buildQuery(params)}`,
    { method: "GET" },
    "Failed to fetch IDG Sales activity logs"
  );
}

export function getIdgSalesScanHistory(
  agentId: string,
  params: GetIdgSalesScanHistoryParams = {}
): Promise<GetIdgSalesScanHistoryResponse> {
  return requestIdgSales<GetIdgSalesScanHistoryResponse>(
    `${idgSalesAgentPath(agentId, "scan-history")}${buildQuery(params)}`,
    { method: "GET" },
    "Failed to fetch IDG Sales scan history"
  );
}

export function getIdgSalesDecisionHistory(
  agentId: string,
  params: GetIdgSalesDecisionHistoryParams = {}
): Promise<GetIdgSalesDecisionHistoryResponse> {
  return requestIdgSales<GetIdgSalesDecisionHistoryResponse>(
    `${idgSalesAgentPath(agentId, "decision-history")}${buildQuery(params)}`,
    { method: "GET" },
    "Failed to fetch decision history"
  );
}

export function scanIdgSalesSource(
  agentId: string,
  sourceKey: IdgSalesSourceKey | string,
  payload: ScanSourcePayload = {}
): Promise<ScanSourceResponse> {
  const trimmedKey = String(sourceKey).trim().toLowerCase();
  if (!trimmedKey) throw new Error("Source key is required");

  return requestIdgSales<ScanSourceResponse>(
    idgSalesAgentPath(agentId, `sources/${encodeURIComponent(trimmedKey)}/scan`),
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    `Failed to scan ${trimmedKey.toUpperCase()} source`
  );
}

/** @deprecated Prefer scanIdgSalesSource(agentId, "ungm", payload) */
export function scanIdgSalesUngm(
  agentId: string,
  payload: ScanUngmPayload = {}
): Promise<ScanUngmResponse> {
  return scanIdgSalesSource(agentId, "ungm", payload);
}

/** @deprecated Prefer scanIdgSalesSource(agentId, "ted", payload) */
export function scanIdgSalesTed(
  agentId: string,
  payload: ScanSourcePayload = {}
): Promise<ScanSourceResponse> {
  return scanIdgSalesSource(agentId, "ted", payload);
}

export function getIdgSalesOpportunities(
  agentId: string,
  params: GetIdgSalesOpportunitiesParams = {}
): Promise<GetIdgSalesOpportunitiesResponse> {
  return requestIdgSales<GetIdgSalesOpportunitiesResponse>(
    `${idgSalesAgentPath(agentId, "opportunities")}${buildQuery(params)}`,
    { method: "GET" },
    "Failed to fetch IDG Sales opportunities"
  );
}

export function createIdgSalesOpportunity(
  agentId: string,
  payload: CreateIdgSalesOpportunityPayload
): Promise<CreateIdgSalesOpportunityResponse> {
  return requestIdgSales<CreateIdgSalesOpportunityResponse>(
    idgSalesAgentPath(agentId, "opportunities"),
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to create IDG Sales opportunity"
  );
}

export function updateIdgSalesOpportunity(
  agentId: string,
  opportunityId: string | number,
  payload: UpdateIdgSalesOpportunityPayload
): Promise<UpdateIdgSalesOpportunityResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<UpdateIdgSalesOpportunityResponse>(
    idgSalesAgentPath(agentId, `opportunities/${encodeURIComponent(String(opportunityId))}`),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to update IDG Sales opportunity"
  );
}

export function archiveIdgSalesOpportunity(
  agentId: string,
  opportunityId: string | number
): Promise<ArchiveIdgSalesOpportunityResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<ArchiveIdgSalesOpportunityResponse>(
    idgSalesAgentPath(agentId, `opportunities/${encodeURIComponent(String(opportunityId))}/archive`),
    { method: "POST" },
    "Failed to archive IDG Sales opportunity"
  );
}

export interface DeleteIdgSalesOpportunityResponse {
  opportunity: IdgSalesOpportunity;
}

export function deleteIdgSalesOpportunity(
  agentId: string,
  opportunityId: string | number
): Promise<DeleteIdgSalesOpportunityResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<DeleteIdgSalesOpportunityResponse>(
    idgSalesAgentPath(agentId, `opportunities/${encodeURIComponent(String(opportunityId))}`),
    { method: "DELETE" },
    "Failed to delete IDG Sales opportunity"
  );
}

export function restoreIdgSalesOpportunity(
  agentId: string,
  opportunityId: string | number
): Promise<RestoreIdgSalesOpportunityResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<RestoreIdgSalesOpportunityResponse>(
    idgSalesAgentPath(agentId, `opportunities/${encodeURIComponent(String(opportunityId))}/restore`),
    { method: "POST" },
    "Failed to restore IDG Sales opportunity"
  );
}

export function getIdgSalesOpportunity(
  agentId: string,
  opportunityId: string | number
): Promise<GetIdgSalesOpportunityResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<GetIdgSalesOpportunityResponse>(
    idgSalesAgentPath(agentId, `opportunities/${encodeURIComponent(String(opportunityId))}`),
    { method: "GET" },
    "Failed to fetch IDG Sales opportunity"
  );
}

export function getIdgSalesOpportunityHistory(
  agentId: string,
  opportunityId: string | number,
  params: GetIdgSalesOpportunityHistoryParams = {}
): Promise<GetIdgSalesOpportunityHistoryResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<GetIdgSalesOpportunityHistoryResponse>(
    `${idgSalesAgentPath(
      agentId,
      `opportunities/${encodeURIComponent(String(opportunityId))}/history`
    )}${buildQuery(params)}`,
    { method: "GET" },
    "Failed to fetch opportunity history"
  );
}

export function reviewIdgSalesOpportunity(
  agentId: string,
  opportunityId: string | number,
  payload: ReviewIdgSalesOpportunityPayload
): Promise<ReviewIdgSalesOpportunityResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<ReviewIdgSalesOpportunityResponse>(
    idgSalesAgentPath(agentId, `opportunities/${encodeURIComponent(String(opportunityId))}/review`),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to save IDG Sales review"
  );
}

export function assignIdgSalesOpportunityReviewer(
  agentId: string,
  opportunityId: string | number,
  payload: AssignIdgSalesOpportunityReviewerPayload
): Promise<AssignIdgSalesOpportunityReviewerResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<AssignIdgSalesOpportunityReviewerResponse>(
    idgSalesAgentPath(
      agentId,
      `opportunities/${encodeURIComponent(String(opportunityId))}/assign-reviewer`
    ),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to assign opportunity reviewer"
  );
}

export interface SendIdgSalesDeadlineReminderResponse {
  opportunity: IdgSalesOpportunity;
  pushNotifications?: IdgSalesPushNotification[];
}

export function sendIdgSalesDeadlineReminder(
  agentId: string,
  opportunityId: string | number
): Promise<SendIdgSalesDeadlineReminderResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<SendIdgSalesDeadlineReminderResponse>(
    idgSalesAgentPath(
      agentId,
      `opportunities/${encodeURIComponent(String(opportunityId))}/deadline-reminder`
    ),
    { method: "POST", body: JSON.stringify({}) },
    "Failed to send deadline reminder"
  );
}

export function saveIdgSalesOpportunityNotes(
  agentId: string,
  opportunityId: string | number,
  payload: SaveIdgSalesOpportunityNotesPayload
): Promise<SaveIdgSalesOpportunityNotesResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<SaveIdgSalesOpportunityNotesResponse>(
    idgSalesAgentPath(agentId, `opportunities/${encodeURIComponent(String(opportunityId))}/notes`),
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to save opportunity notes"
  );
}

export function getIdgSalesforceStatus(agentId: string): Promise<GetIdgSalesforceStatusResponse> {
  return requestIdgSales<GetIdgSalesforceStatusResponse>(
    idgSalesAgentPath(agentId, "salesforce/status"),
    { method: "GET" },
    "Failed to fetch Salesforce connection status"
  );
}

export function saveIdgSalesforceCredentials(
  agentId: string,
  payload: SaveIdgSalesforceCredentialsPayload
): Promise<SaveIdgSalesforceCredentialsResponse> {
  return requestIdgSales<SaveIdgSalesforceCredentialsResponse>(
    idgSalesAgentPath(agentId, "salesforce/credentials"),
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    "Failed to save Salesforce credentials"
  );
}

export function connectIdgSalesforce(agentId: string): Promise<ConnectIdgSalesforceResponse> {
  return requestIdgSales<ConnectIdgSalesforceResponse>(
    idgSalesAgentPath(agentId, "salesforce/connect"),
    { method: "POST", body: JSON.stringify({}) },
    "Failed to start Salesforce OAuth"
  );
}

export function disconnectIdgSalesforce(agentId: string): Promise<DisconnectIdgSalesforceResponse> {
  return requestIdgSales<DisconnectIdgSalesforceResponse>(
    idgSalesAgentPath(agentId, "salesforce/disconnect"),
    { method: "DELETE" },
    "Failed to disconnect Salesforce"
  );
}

export function pushIdgSalesOpportunityToSalesforce(
  agentId: string,
  opportunityId: string | number
): Promise<PushIdgSalesOpportunityResponse> {
  if (opportunityId === "" || opportunityId === null || opportunityId === undefined) {
    throw new Error("Opportunity ID is required");
  }

  return requestIdgSales<PushIdgSalesOpportunityResponse>(
    idgSalesAgentPath(agentId, `opportunities/${encodeURIComponent(String(opportunityId))}/push`),
    { method: "POST", body: JSON.stringify({}) },
    "Failed to push opportunity to Salesforce"
  );
}

export type IdgSalesNotificationType =
  | "scan_success"
  | "scan_failed"
  | "review_required"
  | "sf_sync_success"
  | "sf_sync_failed"
  | "deadline_reminder"
  | string;

export interface IdgSalesNotification {
  id: number;
  agentId?: string | null;
  notifyType?: "idg_sales" | "others" | string;
  type: IdgSalesNotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface GetIdgSalesNotificationsResponse {
  notifications: IdgSalesNotification[];
  unreadCount: number;
}

export interface MarkIdgSalesNotificationReadResponse {
  notification: IdgSalesNotification;
}

export function getIdgSalesNotifications(
  agentId: string,
  params: { limit?: number; unread_only?: boolean } = {}
): Promise<GetIdgSalesNotificationsResponse> {
  return requestIdgSales<GetIdgSalesNotificationsResponse>(
    `${idgSalesAgentPath(agentId, "notifications")}${buildQuery(params)}`,
    { method: "GET" },
    "Failed to fetch notifications"
  );
}

export function markIdgSalesNotificationRead(
  agentId: string,
  notificationId: string | number
): Promise<MarkIdgSalesNotificationReadResponse> {
  return requestIdgSales<MarkIdgSalesNotificationReadResponse>(
    idgSalesAgentPath(
      agentId,
      `notifications/${encodeURIComponent(String(notificationId))}/read`
    ),
    { method: "PATCH", body: JSON.stringify({}) },
    "Failed to mark notification as read"
  );
}

export function markAllIdgSalesNotificationsRead(agentId: string): Promise<Record<string, never>> {
  return requestIdgSales<Record<string, never>>(
    idgSalesAgentPath(agentId, "notifications/read-all"),
    { method: "POST", body: JSON.stringify({}) },
    "Failed to mark all notifications as read"
  );
}

export function registerFcmToken(payload: {
  token: string;
  platform?: string;
  agent_unique_id?: string;
}): Promise<{ deviceToken: Record<string, unknown> }> {
  return requestIdgSales<{ deviceToken: Record<string, unknown> }>(
    "/user/fcm-token",
    { method: "POST", body: JSON.stringify(payload) },
    "Failed to register FCM token"
  );
}

export function unregisterFcmToken(token: string): Promise<Record<string, never>> {
  return requestIdgSales<Record<string, never>>(
    "/user/fcm-token",
    { method: "DELETE", body: JSON.stringify({ token }) },
    "Failed to unregister FCM token"
  );
}

