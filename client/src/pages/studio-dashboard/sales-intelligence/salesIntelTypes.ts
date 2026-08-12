export type OpportunityStage =
  | "ingested"
  | "qualifying"
  | "qualified"
  | "rejected"
  | "awaiting_review"
  | "validated"
  | "push_pending"
  | "pushed"
  | "push_failed";

export type HumanReviewStatus = "pending" | "approved" | "rejected";

export type SalesforcePushStatus = "not_started" | "pending" | "success" | "failed";

export type OpportunityDetailTab =
  | "overview"
  | "summary"
  | "qualification"
  | "completed"
  | "notes"
  | "history";

export interface OpportunityContact {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface OpportunityDetailOverview {
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
  contacts?: OpportunityContact[];
  extractionConfidence?: number | null;
  framework?: string | null;
  contractDuration?: string | null;
  technology?: string | null;
  reference?: string | null;
  noticeType?: string | null;
  links?: { url: string; description?: string | null }[];
}

export interface OpportunityDetailSummary {
  executiveSummary?: string;
  riskSummary?: string;
  opportunitySummary?: string;
  requirements?: string[];
  deliverables?: string[];
}

export interface OpportunityDetailQualification {
  overallScore?: number | null;
  recommendation?: string | null;
  confidence?: number | null;
  dimensions?: Record<string, number>;
  aiReasoning?: string | null;
  recommendations?: string[];
  reasons?: string[];
  risks?: string[];
  rejectionReasons?: string[];
}

export interface OpportunityDetailCompleted {
  isComplete?: boolean;
  stage?: string;
  humanReviewStatus?: string | null;
  humanReviewNotes?: string | null;
  reviewedBy?: { id?: number; userName?: string | null; email?: string | null } | null;
  reviewedAt?: string | null;
  salesforcePushStatus?: string | null;
  salesforceOpportunityId?: string | null;
  salesforcePushedAt?: string | null;
  salesforcePushError?: string | null;
  completedAt?: string | null;
}

export interface OpportunityDetailNotes {
  humanReviewNotes?: string | null;
  updatedAt?: string | null;
}

export interface OpportunityDetailSections {
  overview: OpportunityDetailOverview;
  summary: OpportunityDetailSummary;
  qualification: OpportunityDetailQualification;
  completed: OpportunityDetailCompleted;
  notes?: OpportunityDetailNotes;
}

export interface Opportunity {
  id: string;
  agentId: string;
  externalId?: string;
  sourceKey?: string;
  title: string;
  buyer: string;
  source: string;
  sourceUrl?: string;
  sourceDocumentName?: string;
  sourceDocumentUrl?: string;
  country?: string;
  category?: string;
  estimatedValue?: number;
  currency?: string;
  publishedAt?: string;
  deadlineAt?: string;
  stage: OpportunityStage;
  qualificationScore?: number;
  qualificationSummary?: string;
  qualificationReasons?: string[];
  rejectionReasons?: string[];
  humanReviewStatus?: HumanReviewStatus;
  humanReviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  assignedReviewerId?: number;
  assignedReviewer?: string;
  assignedReviewerEmail?: string;
  assignedAt?: string;
  salesforceOpportunityId?: string;
  salesforcePushStatus?: SalesforcePushStatus;
  salesforcePushError?: string;
  salesforcePushedAt?: string;
  createdAt: string;
  updatedAt: string;
  recommendation?: string;
  confidence?: number;
  risks?: string[];
  detail?: OpportunityDetailSections;
}

export interface IngestionSource {
  id: string;
  sourceKey: string;
  name: string;
  type: "portal" | "manual" | "api";
  isActive: boolean;
  /** True when this portal has a scan endpoint implemented */
  canScan: boolean;
  /** minutely | hourly | daily | weekly | manual */
  scanCadence: "minutely" | "hourly" | "daily" | "weekly" | "manual";
  lastScanAt?: string;
  nextScanAt?: string | null;
  lastScanStatus?: "success" | "failed" | "running";
  opportunitiesFound?: number;
  connector?: string | null;
  config?: {
    url?: string;
    apiUrl?: string;
    defaultQuery?: string;
    connector?: string;
  };
}

export interface SalesforcePushLogEntry {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  action?: string;
  detail?: string;
  tone?: "info" | "success" | "warning" | "danger";
  attemptedAt: string;
  status: "success" | "failed" | "info" | "warning";
  salesforceId?: string;
  errorMessage?: string;
}

export interface SalesforceConnection {
  connected: boolean;
  status: string;
  instanceUrl?: string;
  salesforceOrgId?: string;
  connectedAt?: string;
  lastError?: string;
  configured: boolean;
  hasCredentials?: boolean;
  loginBaseUrl?: string;
  oauthCallbackUrl?: string;
}

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  ingested: "Ingested",
  qualifying: "Qualifying",
  qualified: "Qualified",
  rejected: "Rejected",
  awaiting_review: "Awaiting Review",
  validated: "Validated",
  push_pending: "Push Pending",
  pushed: "Pushed",
  push_failed: "Push Failed",
};

export const PIPELINE_STAGES: OpportunityStage[] = [
  "ingested",
  "qualifying",
  "qualified",
  "awaiting_review",
  "validated",
  "pushed",
];

/** Pipeline kanban columns (hidden stages remain in data / review queue) */
export const PIPELINE_KANBAN_STAGES: OpportunityStage[] = PIPELINE_STAGES.filter(
  (stage) => stage !== "awaiting_review"
);
