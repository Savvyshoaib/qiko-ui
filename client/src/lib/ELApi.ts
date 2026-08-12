import { appFetch } from "@/data/appFetch";
const EL_API_BASE_URL =
  (import.meta.env.VITE_EL_API_BASE_URL as string | undefined)?.trim() ||
  // "http://52.29.191.129";
  "https://el-backend.qiko.ai";
  // "https://seeker-appointments-ranges-barnes.trycloudflare.com";
  // "https://excel-agent-server.vercel.app";

const EL_API_KEY =
  (import.meta.env.VITE_EL_API_KEY as string | undefined)?.trim() ||
  "excel-agent-moiz-2026-k7h9x2mq4n";

function getApiKeyHeaders(): HeadersInit {
  if (!EL_API_KEY) {
    throw new Error("Missing VITE_EL_API_KEY in .env");
  }
  return {
    "X-API-Key": EL_API_KEY,
  };
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface ELUploadResponse {
  agent_unique_id?: string;
  email?: string;
  fileName: string;
  sourceName: string;
  size: number;
  namespace: string;
  /** Present when server defers indexing to a follow-up batch call */
  totalRows?: number;
  needsIndexing?: boolean;
  indexed?: boolean;
  recordsStored?: number;
  summaryCached?: boolean;
}

/** Response from `POST /api/index-batch` after a deferred upload index */
export interface ELIndexBatchResponse {
  done?: boolean;
  indexed?: number;
  total?: number;
  progress?: number;
  message?: string;
}

export interface ELChatRequest {
  agent_unique_id?: string;
  email?: string;
  message: string;
}

export interface ELChatResponse {
  reply: string;
  intent?: "greeting" | "capability" | "data" | "general";
  sourcesUsed?: string[];
  rowsRetrieved?: number;
  summariesUsed?: number;
}

export interface ELUserFileSummary {
  label: string;
  namespace: string;
  rowCount: number;
}

export interface ELUserFinanceFile {
  id: string;
  label: string;
  namespace: string;
  rowCount: number;
  uploadedAt: string;
}

export interface ELUserFilesResponse {
  id: string;
  files: ELUserFinanceFile[];
  totalFiles: number;
  totalRows: number;
}

export interface ELDeleteUserFilesRequest {
  ids: string | string[];
}

export interface ELDeleteUserFilesResponse {
  success: boolean;
  deleted: string[];
  deletedCount: number;
  message: string;
}

export interface UnitLedgerExpense {
  heading?: string;
  expenditureDescription?: string;
  nett?: number;
  vat?: number;
  gross?: number;
  settled?: string | boolean;
  invoiceDate?: string;
  periodFrom?: string;
  periodTo?: string;
  fixFloRef?: string;
  supplierRef?: string;
  supplierName?: string;
}

export interface UnitLedgerItem {
  unitRef?: string;
  unitDescription?: string;
  income?: number;
  outstanding?: number;
  totalGross?: number;
  expenses?: UnitLedgerExpense[];
}

export interface ELUserProperty {
  propertyId?: string;
  name?: string;
  income?: number;
  expenses?: number;
  netProfit?: number;
  marginPercent?: number;
  outstanding?: number;
  costToIncomeRatio?: number;
  riskScore?: number;
  riskLevel?: string;
  profitabilityClass?: string;
  expenseCategories?: { category: string; amount: number }[];
  topVendors?: { vendorName: string; amount: number }[];
  unitLedger?: UnitLedgerItem[];
}

export interface ELUserAnalyticsDateRange {
  from?: string;
  to?: string;
  label?: string;
}

/** Legacy flat summary object from older API responses. */
export interface ELUserAnalyticsSummary {
  propertyCount?: number;
  vendorCount?: number;
  totalIncome?: number;
  totalExpenses?: number;
  netProfit?: number;
  outstanding?: number;
  expenseBreakdown?: { net?: number; vat?: number };
}

/** One row from the newer `summary: [...]` array (keyed metrics). */
export interface ELUserAnalyticsSummaryMetric {
  key: string;
  label?: string;
  value?: number;
  formatted?: string;
  subtitle?: string;
}

export type ELUserAnalyticsSummaryPayload = ELUserAnalyticsSummary | ELUserAnalyticsSummaryMetric[];

export interface ELUserAnalyticsResponse {
  status: string;
  agent_unique_id?: string;
  email?: string;
  timestamp?: string;
  files: ELUserFileSummary[];
  totalFiles: number;
  totalRows: number;
  currency?: string;
  dateRange?: ELUserAnalyticsDateRange;
  summary?: ELUserAnalyticsSummaryPayload;
  properties?: ELUserProperty[];
  charts?: Record<string, unknown>;
  insights?: Record<string, unknown>;
  trends?: Record<string, unknown> | Array<unknown>;
}

export interface ELHistoryItem {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ELHistoryResponse {
  agent_unique_id?: string;
  email?: string;
  count: number;
  history: ELHistoryItem[];
}

export interface ELClearHistoryResponse {
  success: boolean;
  agent_unique_id?: string;
  email?: string;
  message: string;
}


export interface FinancialUploadMetadata {
  title?: string;
  description?: string;
}

export async function uploadFinancialFile(
  file: File,
  agentUniqueId: string,
  metadata?: FinancialUploadMetadata
): Promise<ELUploadResponse> {
  if (!agentUniqueId) {
    throw new Error("agent_unique_id is required to upload financial data.");
  }

  const title = metadata?.title?.trim();
  const description = metadata?.description?.trim();
  const params = new URLSearchParams();
  if (title) {
    params.set("title", title);
  }
  if (description) {
    params.set("description", description);
  }
  const uploadUrl = params.toString()
    ? `${EL_API_BASE_URL}/api/upload?${params.toString()}`
    : `${EL_API_BASE_URL}/api/upload`;

  const res = await appFetch(uploadUrl, {
    method: "POST",
    headers: {
      ...getApiKeyHeaders(),
      // Backend currently accepts this header key; value carries worker agent_unique_id.
      "X-User-Id": agentUniqueId,
      "X-Filename": file.name,
      "Content-Type": "application/octet-stream",
    },
    // Send raw file bytes; backend upload endpoint expects octet-stream payload.
    body: file,
  });

  const payload = (await res.json().catch(() => ({}))) as Partial<ELUploadResponse> & {
    message?: string;
  };

  if (!res.ok) {
    throw new Error(payload.message || "File upload failed.");
  }

  if (!payload.fileName) {
    throw new Error("Upload succeeded but response is incomplete.");
  }

  return payload as ELUploadResponse;
}

export async function indexBatch(namespace: string): Promise<ELIndexBatchResponse> {
  const ns = namespace?.trim();
  if (!ns) {
    throw new Error("Namespace is required to index uploaded data.");
  }

  // Temporarily disable deferred indexing endpoint calls.
  // Keep a successful shape so existing upload flows continue without hitting the API.
  return {
    done: false,
    indexed: 0,
    total: 0,
    progress: 0,
    message: `Batch indexing skipped for namespace "${ns}".`,
  };
}

export async function getUserFiles(agentUniqueId: string): Promise<ELUserFilesResponse> {
  const id = agentUniqueId?.trim();
  if (!id) {
    throw new Error("agent_unique_id is required.");
  }

  const params = new URLSearchParams({ id });
  const res = await appFetch(`${EL_API_BASE_URL}/api/files?${params.toString()}`, {
    method: "GET",
    headers: {
      ...getApiKeyHeaders(),
    },
  });

  const payload = (await res.json().catch(() => ({}))) as Partial<ELUserFilesResponse> & {
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(payload.message || payload.error || "Failed to fetch uploaded files.");
  }

  return {
    id: payload.id || id,
    files: Array.isArray(payload.files) ? payload.files : [],
    totalFiles: Number(payload.totalFiles ?? (Array.isArray(payload.files) ? payload.files.length : 0)),
    totalRows: Number(payload.totalRows ?? 0),
  };
}

export async function deleteUserFiles(
  request: ELDeleteUserFilesRequest
): Promise<ELDeleteUserFilesResponse> {
  const ids = Array.isArray(request.ids)
    ? request.ids.map((id) => String(id).trim()).filter(Boolean)
    : [String(request.ids).trim()].filter(Boolean);
  if (ids.length === 0) {
    throw new Error("At least one namespace id is required.");
  }

  const res = await appFetch(`${EL_API_BASE_URL}/api/user/files/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getApiKeyHeaders(),
    },
    body: JSON.stringify({ ids }),
  });

  const payload = (await res.json().catch(() => ({}))) as Partial<ELDeleteUserFilesResponse> & {
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(payload.message || payload.error || "Failed to delete file(s).");
  }

  return {
    success: Boolean(payload.success),
    deleted: Array.isArray(payload.deleted) ? payload.deleted : [],
    deletedCount: Number(payload.deletedCount ?? 0),
    message: payload.message || "File(s) deleted successfully.",
  };
}

export async function getUserAnalytics(
  agentUniqueId: string,
  query?: { from?: string; to?: string; month?: string }
): Promise<ELUserAnalyticsResponse> {
  if (!agentUniqueId) {
    throw new Error("agent_unique_id is required.");
  }
  const params = new URLSearchParams({ id: agentUniqueId });
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  if (query?.month) params.set("month", query.month);

  const res = await appFetch(`${EL_API_BASE_URL}/api/user?${params.toString()}`, {
    method: "GET",
    headers: {
      ...getApiKeyHeaders(),
    },
  });

  const payload = (await res.json().catch(() => ({}))) as ELUserAnalyticsResponse & {
    message?: string;
    error?: string;
    month?: string;
    availableFiles?: string[];
  };

  const payloadLevelError = typeof payload.error === "string" ? payload.error.trim() : "";
  if (payloadLevelError) {
    const available = Array.isArray(payload.availableFiles) ? payload.availableFiles.filter(Boolean) : [];
    const details = available.length ? ` Available files: ${available.join(", ")}.` : "";
    throw new Error(`${payloadLevelError}${details}`);
  }

  if (!res.ok) {
    const baseError = payload.message || payload.error || "Failed to fetch dashboard analytics.";
    const available = Array.isArray(payload.availableFiles) ? payload.availableFiles.filter(Boolean) : [];
    const details = available.length ? ` Available files: ${available.join(", ")}.` : "";
    throw new Error(`${baseError}${details}`);
  }

  return payload;
}

export async function sendFinancialChat(request: ELChatRequest): Promise<ELChatResponse> {
  const identity = request.agent_unique_id || request.email;
  if (!identity) {
    throw new Error("agent_unique_id is required.");
  }
  const res = await appFetch(`${EL_API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getApiKeyHeaders(),
    },
    body: JSON.stringify({
      message: request.message,
      id: identity,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as ELChatResponse & {
    message?: string;
  };

  if (!res.ok) {
    throw new Error(payload.message || "Chat API failed.");
  }

  return payload;
}

export async function getChatHistory(agentUniqueId: string, limit = 100): Promise<ELHistoryResponse> {
  if (!agentUniqueId) {
    throw new Error("agent_unique_id is required.");
  }
  const res = await appFetch(
    `${EL_API_BASE_URL}/api/history?id=${encodeURIComponent(agentUniqueId)}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        ...getApiKeyHeaders(),
      },
    }
  );
  const payload = (await res.json().catch(() => ({}))) as ELHistoryResponse & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(payload.message || "Failed to load chat history.");
  }
  return payload;
}

export async function clearChatHistory(agentUniqueId: string): Promise<ELClearHistoryResponse> {
  if (!agentUniqueId) {
    throw new Error("agent_unique_id is required.");
  }
  const res = await appFetch(
    `${EL_API_BASE_URL}/api/history?agent_unique_id=${encodeURIComponent(agentUniqueId)}`,
    {
      method: "DELETE",
      headers: {
        ...getApiKeyHeaders(),
      },
    }
  );
  const payload = (await res.json().catch(() => ({}))) as ELClearHistoryResponse & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(payload.message || "Failed to clear chat history.");
  }
  return payload;
}

