import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  connectIdgSalesforce,
  disconnectIdgSalesforce,
  getIdgSalesforceStatus,
  getIdgSalesActivityLogs,
  getIdgSalesDecisionHistory,
  getIdgSalesScanHistory,
  getIdgSalesOpportunities,
  getIdgSalesOpportunity,
  getIdgSalesSources,
  archiveIdgSalesOpportunity,
  deleteIdgSalesOpportunity,
  deleteIdgSalesSource,
  restoreIdgSalesOpportunity,
  assignIdgSalesOpportunityReviewer,
  pushIdgSalesOpportunityToSalesforce,
  reviewIdgSalesOpportunity,
  scanIdgSalesSource,
  addIdgSalesSource,
  getIdgSalesSourceCatalog,
  type ScanSourcePayload,
  type IdgSalesSourceCatalogItem,
  saveIdgSalesOpportunityNotes,
  saveIdgSalesforceCredentials,
  sendIdgSalesDeadlineReminder,
  updateIdgSalesSource,
  type IdgSalesDecisionHistorySummary,
  type IdgSalesScanHistorySummary,
  type IdgSalesScanCadence,
  type IdgSalesSourceStatus,
  type SaveIdgSalesforceCredentialsPayload,
} from "@/lib/idgSalesApi";
import {
  hasApiId,
  mapActivityLogsToPushLog,
  SALESFORCE_ACTIVITY_ACTIONS,
  mapApiOpportunityToOpportunity,
  mapApiSourceToIngestionSource,
} from "./idgSalesMappers";
import type { IngestionSource, Opportunity, SalesforceConnection } from "./salesIntelTypes";
import { computeDashboardMetrics, formatCurrency, formatDate, formatDateTime } from "./salesIntelUtils";
import { pushIdgSalesInboxItems } from "./notifications/inboxPush";

const DISCONNECTED_SALESFORCE: SalesforceConnection = {
  connected: false,
  status: "disconnected",
  configured: false,
  hasCredentials: false,
};

function mapSalesforceConnection(raw: {
  connected?: boolean;
  status?: string;
  instanceUrl?: string | null;
  salesforceOrgId?: string | null;
  connectedAt?: string | null;
  lastError?: string | null;
  configured?: boolean;
  hasCredentials?: boolean;
  loginBaseUrl?: string | null;
  oauthCallbackUrl?: string | null;
} | null | undefined): SalesforceConnection {
  if (!raw) return DISCONNECTED_SALESFORCE;

  return {
    connected: Boolean(raw.connected),
    status: raw.status ?? (raw.connected ? "connected" : "disconnected"),
    instanceUrl: raw.instanceUrl ?? undefined,
    salesforceOrgId: raw.salesforceOrgId ?? undefined,
    connectedAt: raw.connectedAt ?? undefined,
    lastError: raw.lastError ?? undefined,
    configured: Boolean(raw.configured),
    hasCredentials: Boolean(raw.hasCredentials),
    loginBaseUrl: raw.loginBaseUrl ?? undefined,
    oauthCallbackUrl: raw.oauthCallbackUrl ?? undefined,
  };
}

export interface SalesIntelController {
  agentId: string;
  opportunities: Opportunity[];
  sources: IngestionSource[];
  sourceCatalog: IdgSalesSourceCatalogItem[];
  activityLogs: Awaited<ReturnType<typeof getIdgSalesActivityLogs>>["activityLogs"];
  decisionSummary: IdgSalesDecisionHistorySummary;
  scanSummary: IdgSalesScanHistorySummary;
  pushLog: ReturnType<typeof mapActivityLogsToPushLog>;
  salesforce: SalesforceConnection;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  scanning: boolean;
  scanningSourceKey: string | null;
  togglingSourceKey: string | null;
  updatingCadenceKey: string | null;
  addingSourceKey: string | null;
  deletingSourceKey: string | null;
  processingId: string | null;
  archivingId: string | null;
  deletingId: string | null;
  connectingSalesforce: boolean;
  disconnectingSalesforce: boolean;
  savingSalesforceCredentials: boolean;
  pushingId: string | null;
  savingNotesId: string | null;
  assigningReviewerId: string | null;
  sendingDeadlineReminderId: string | null;
  detailLoadingId: string | null;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  refreshActivityLogs: () => Promise<void>;
  selectOpportunity: (id: string, options?: { silent?: boolean }) => Promise<void>;
  runScan: (
    sourceKey?: string,
    scanOptions?: Pick<ScanSourcePayload, "country_allowlist" | "category_allowlist" | "query">
  ) => Promise<void>;
  addSource: (
    sourceKey: string,
    options?: {
      name?: string;
      url?: string;
      apiUrl?: string;
      defaultQuery?: string;
      connector?: string;
    }
  ) => Promise<void>;
  updateSourceSettings: (
    sourceKey: string,
    payload: {
      name?: string;
      url?: string;
      apiUrl?: string;
      defaultQuery?: string;
      connector?: string;
    }
  ) => Promise<void>;
  refreshSourceCatalog: () => Promise<void>;
  toggleSource: (sourceKey: string, enabled: boolean) => Promise<void>;
  updateSourceCadence: (sourceKey: string, scanCadence: IdgSalesScanCadence) => Promise<void>;
  deleteSource: (sourceKey: string) => Promise<void>;
  approveReview: (opportunityId: string, notes?: string) => Promise<void>;
  rejectReview: (opportunityId: string, notes?: string) => Promise<void>;
  restoreReview: (opportunityId: string, notes?: string) => Promise<void>;
  saveNotes: (opportunityId: string, notes: string) => Promise<void>;
  assignReviewer: (opportunityId: string, userId: number | null) => Promise<void>;
  sendDeadlineReminder: (opportunityId: string) => Promise<void>;
  archiveOpportunity: (
    opportunityId: string,
    options?: { onBeforeRemove?: () => void }
  ) => Promise<void>;
  deleteOpportunity: (
    opportunityId: string,
    options?: { onBeforeRemove?: () => void }
  ) => Promise<void>;
  restoreOpportunity: (opportunityId: string) => Promise<void>;
  saveSalesforceCredentials: (payload: SaveIdgSalesforceCredentialsPayload) => Promise<boolean>;
  connectSalesforce: () => Promise<void>;
  disconnectSalesforce: () => Promise<void>;
  pushToSalesforce: (opportunityId: string) => Promise<void>;
}

export function useIdgSalesIntel(agentId: string): SalesIntelController {
  const trimmedId = agentId.trim();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [sources, setSources] = useState<IngestionSource[]>([]);
  const [sourceCatalog, setSourceCatalog] = useState<IdgSalesSourceCatalogItem[]>([]);
  const [salesforce, setSalesforce] = useState<SalesforceConnection>(DISCONNECTED_SALESFORCE);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanningSourceKey, setScanningSourceKey] = useState<string | null>(null);
  const [togglingSourceKey, setTogglingSourceKey] = useState<string | null>(null);
  const [updatingCadenceKey, setUpdatingCadenceKey] = useState<string | null>(null);
  const [addingSourceKey, setAddingSourceKey] = useState<string | null>(null);
  const [deletingSourceKey, setDeletingSourceKey] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [connectingSalesforce, setConnectingSalesforce] = useState(false);
  const [disconnectingSalesforce, setDisconnectingSalesforce] = useState(false);
  const [savingSalesforceCredentials, setSavingSalesforceCredentials] = useState(false);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [assigningReviewerId, setAssigningReviewerId] = useState<string | null>(null);
  const [sendingDeadlineReminderId, setSendingDeadlineReminderId] = useState<string | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<
    Awaited<ReturnType<typeof getIdgSalesActivityLogs>>["activityLogs"]
  >([]);
  const [salesforceActivityLogs, setSalesforceActivityLogs] = useState<
    Awaited<ReturnType<typeof getIdgSalesActivityLogs>>["activityLogs"]
  >([]);
  const [decisionSummary, setDecisionSummary] = useState<IdgSalesDecisionHistorySummary>({
    approvals: 0,
    rejections: 0,
    overrides: 0,
    total: 0,
  });
  const [scanSummary, setScanSummary] = useState<IdgSalesScanHistorySummary>({
    recentScans: 0,
    successful: 0,
    failed: 0,
    successRate: 0,
  });

  const upsertSource = useCallback((next: IngestionSource) => {
    setSources((current) => {
      const without = current.filter(
        (source) => source.id !== next.id && source.sourceKey !== next.sourceKey
      );
      return [next, ...without].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const refreshActivityLogs = useCallback(async () => {
    if (!trimmedId) return;
    const [allLogsResponse, salesforceLogsResponse] = await Promise.all([
      getIdgSalesActivityLogs(trimmedId, { limit: 50 }),
      getIdgSalesActivityLogs(trimmedId, {
        actions: [...SALESFORCE_ACTIVITY_ACTIONS],
        limit: 50,
      }),
    ]);
    setActivityLogs(Array.isArray(allLogsResponse.activityLogs) ? allLogsResponse.activityLogs : []);
    setSalesforceActivityLogs(
      Array.isArray(salesforceLogsResponse.activityLogs) ? salesforceLogsResponse.activityLogs : []
    );
  }, [trimmedId]);

  const refreshDecisionSummary = useCallback(async () => {
    if (!trimmedId) return;
    const response = await getIdgSalesDecisionHistory(trimmedId, { limit: 1 });
    const summary = response.summary;
    setDecisionSummary({
      approvals: Number(summary?.approvals ?? 0),
      rejections: Number(summary?.rejections ?? 0),
      overrides: Number(summary?.overrides ?? 0),
      total: Number(summary?.total ?? 0),
    });
  }, [trimmedId]);

  const refreshScanSummary = useCallback(async () => {
    if (!trimmedId) return;
    const response = await getIdgSalesScanHistory(trimmedId, { limit: 1 });
    const summary = response.summary;
    setScanSummary({
      recentScans: Number(summary?.recentScans ?? 0),
      successful: Number(summary?.successful ?? 0),
      failed: Number(summary?.failed ?? 0),
      successRate: Number(summary?.successRate ?? 0),
    });
  }, [trimmedId]);

  const refreshSalesforceStatus = useCallback(async () => {
    if (!trimmedId) return;
    const response = await getIdgSalesforceStatus(trimmedId);
    setSalesforce(mapSalesforceConnection(response.salesforce));
  }, [trimmedId]);

  const refresh = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!trimmedId) return;

      if (!options.silent) {
        setLoading(true);
      }

      try {
        const [
          sourcesResponse,
          catalogResponse,
          opportunitiesResponse,
          activityLogsResponse,
          salesforceLogsResponse,
          salesforceResponse,
          decisionResponse,
          scanHistoryResponse,
        ] = await Promise.all([
            getIdgSalesSources(trimmedId),
            getIdgSalesSourceCatalog(trimmedId).catch(() => ({ catalog: [] as IdgSalesSourceCatalogItem[] })),
            getIdgSalesOpportunities(trimmedId, { limit: "*" }),
            getIdgSalesActivityLogs(trimmedId, { limit: 50 }),
            getIdgSalesActivityLogs(trimmedId, {
              actions: [...SALESFORCE_ACTIVITY_ACTIONS],
              limit: 50,
            }),
            getIdgSalesforceStatus(trimmedId).catch(() => null),
            getIdgSalesDecisionHistory(trimmedId, { limit: 1 }).catch(() => null),
            getIdgSalesScanHistory(trimmedId, { limit: 1 }).catch(() => null),
          ]);

        const nextSources = Array.isArray(sourcesResponse.sources)
          ? sourcesResponse.sources.filter(hasApiId).map(mapApiSourceToIngestionSource)
          : [];
        const nextCatalog = Array.isArray(catalogResponse.catalog) ? catalogResponse.catalog : [];
        const nextOpportunities = Array.isArray(opportunitiesResponse.opportunities)
          ? opportunitiesResponse.opportunities
              .filter(hasApiId)
              .map((item) => mapApiOpportunityToOpportunity(item, trimmedId))
          : [];
        const nextLogs = Array.isArray(activityLogsResponse.activityLogs)
          ? activityLogsResponse.activityLogs
          : [];
        const nextSalesforceLogs = Array.isArray(salesforceLogsResponse.activityLogs)
          ? salesforceLogsResponse.activityLogs
          : [];

        setSources(nextSources);
        setSourceCatalog(nextCatalog);
        setOpportunities(nextOpportunities);
        setActivityLogs(nextLogs);
        setSalesforceActivityLogs(nextSalesforceLogs);
        if (decisionResponse?.summary) {
          setDecisionSummary({
            approvals: Number(decisionResponse.summary.approvals ?? 0),
            rejections: Number(decisionResponse.summary.rejections ?? 0),
            overrides: Number(decisionResponse.summary.overrides ?? 0),
            total: Number(decisionResponse.summary.total ?? 0),
          });
        }
        if (scanHistoryResponse?.summary) {
          setScanSummary({
            recentScans: Number(scanHistoryResponse.summary.recentScans ?? 0),
            successful: Number(scanHistoryResponse.summary.successful ?? 0),
            failed: Number(scanHistoryResponse.summary.failed ?? 0),
            successRate: Number(scanHistoryResponse.summary.successRate ?? 0),
          });
        }
        if (salesforceResponse) {
          setSalesforce(mapSalesforceConnection(salesforceResponse.salesforce));
        }
        setError(null);
        setInitialized(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load sales intelligence data.";
        setError(message);
        if (!options.silent) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [trimmedId]
  );

  useEffect(() => {
    if (!trimmedId) return;
    void refresh();
  }, [trimmedId, refresh]);

  useEffect(() => {
    if (!trimmedId || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const salesforceResult = params.get("salesforce");
    if (!salesforceResult) return;

    const message = params.get("message");
    if (salesforceResult === "connected") {
      toast.success("Salesforce connected.");
      void refreshSalesforceStatus().catch(() => undefined);
      void refreshActivityLogs().catch(() => undefined);
    } else if (salesforceResult === "error") {
      const raw = message || "Salesforce connection failed.";
      const lower = raw.toLowerCase();
      const toastMsg = lower.includes("cross-org")
        ? "Salesforce blocked cross-org login. Use a user from the same org as your Connected/External Client App (and match login vs sandbox URL)."
        : raw;
      toast.error(toastMsg, { duration: 10000 });
    }

    params.delete("salesforce");
    params.delete("message");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [refreshActivityLogs, refreshSalesforceStatus, trimmedId]);

  const pushLog = useMemo(
    () => mapActivityLogsToPushLog(salesforceActivityLogs, opportunities),
    [salesforceActivityLogs, opportunities]
  );

  const selectOpportunity = useCallback(
    async (id: string, options: { silent?: boolean } = {}) => {
      if (!trimmedId || !id) return;

      if (!options.silent) {
        setDetailLoadingId(id);
      }
      try {
        const response = await getIdgSalesOpportunity(trimmedId, id);
        const detail = mapApiOpportunityToOpportunity(response.opportunity, trimmedId);
        setOpportunities((current) => {
          const exists = current.some((opportunity) => opportunity.id === id);
          if (exists) {
            return current.map((opportunity) => (opportunity.id === id ? detail : opportunity));
          }
          return [detail, ...current];
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load opportunity detail.";
        toast.error(message);
      } finally {
        if (!options.silent) {
          setDetailLoadingId((current) => (current === id ? null : current));
        }
      }
    },
    [trimmedId]
  );

  const refreshSourceCatalog = useCallback(async () => {
    if (!trimmedId) return;
    const response = await getIdgSalesSourceCatalog(trimmedId);
    setSourceCatalog(Array.isArray(response.catalog) ? response.catalog : []);
  }, [trimmedId]);

  const addSource = useCallback(
    async (
      sourceKey: string,
      options?: {
        name?: string;
        url?: string;
        apiUrl?: string;
        defaultQuery?: string;
        connector?: string;
      }
    ) => {
      const key = sourceKey.trim().toLowerCase();
      const name = options?.name?.trim() ?? "";
      const url = options?.url?.trim() ?? "";
      const apiUrl = options?.apiUrl?.trim() ?? "";
      const defaultQuery = options?.defaultQuery?.trim() ?? "";
      const connector = options?.connector?.trim().toLowerCase() ?? "";
      if (!trimmedId || !key || addingSourceKey) return;
      if (!url) {
        toast.error("URL is required.");
        throw new Error("URL is required.");
      }

      setAddingSourceKey(key);
      try {
        const response = await addIdgSalesSource(trimmedId, {
          source_key: key,
          ...(name !== "" ? { name } : {}),
          config: {
            url,
            ...(apiUrl !== "" ? { api_url: apiUrl } : {}),
            ...(defaultQuery !== "" ? { default_query: defaultQuery } : { default_query: "" }),
            ...(connector !== "" ? { connector } : {}),
          },
        });
        if (hasApiId(response.source)) {
          upsertSource(mapApiSourceToIngestionSource(response.source));
        }
        await refreshSourceCatalog().catch(() => undefined);
        await refreshActivityLogs().catch(() => undefined);
        toast.success(`${response.source?.name ?? key.toUpperCase()} added.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add source.";
        toast.error(message);
        throw err;
      } finally {
        setAddingSourceKey(null);
      }
    },
    [addingSourceKey, refreshActivityLogs, refreshSourceCatalog, trimmedId, upsertSource]
  );

  const updateSourceSettings = useCallback(
    async (
      sourceKey: string,
      payload: {
        name?: string;
        url?: string;
        apiUrl?: string;
        defaultQuery?: string;
        connector?: string;
      }
    ) => {
      const key = sourceKey.trim().toLowerCase();
      if (!trimmedId || !key) return;

      const name = payload.name?.trim() ?? "";
      const url = payload.url?.trim() ?? "";
      const apiUrl = payload.apiUrl?.trim() ?? "";
      const defaultQuery = payload.defaultQuery?.trim() ?? "";
      const connector = payload.connector?.trim().toLowerCase() ?? "";

      if (name === "" && url === "" && apiUrl === "" && defaultQuery === "" && connector === "") {
        toast.error("Nothing to update.");
        throw new Error("Nothing to update.");
      }
      if (payload.url !== undefined && url === "") {
        toast.error("URL is required.");
        throw new Error("URL is required.");
      }

      try {
        const response = await updateIdgSalesSource(trimmedId, key, {
          ...(name !== "" ? { name } : {}),
          config: {
            ...(payload.url !== undefined ? { url } : {}),
            ...(payload.apiUrl !== undefined ? { api_url: apiUrl || null } : {}),
            ...(payload.defaultQuery !== undefined ? { default_query: defaultQuery } : {}),
            ...(payload.connector !== undefined ? { connector: connector || null } : {}),
          },
        });
        if (hasApiId(response.source)) {
          upsertSource(mapApiSourceToIngestionSource(response.source));
        }
        await refreshActivityLogs().catch(() => undefined);
        toast.success(`${response.source?.name ?? key.toUpperCase()} updated.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update source.";
        toast.error(message);
        throw err;
      }
    },
    [refreshActivityLogs, trimmedId, upsertSource]
  );

  const toggleSource = useCallback(
    async (sourceKey: string, enabled: boolean) => {
      const key = sourceKey.trim().toLowerCase();
      if (!trimmedId || !key || togglingSourceKey) return;

      setTogglingSourceKey(key);
      const status: IdgSalesSourceStatus = enabled ? "active" : "inactive";

      try {
        const response = await updateIdgSalesSource(trimmedId, key, { status });
        if (hasApiId(response.source)) {
          upsertSource(mapApiSourceToIngestionSource(response.source));
        }
        await refreshActivityLogs().catch(() => undefined);
        toast.success(`${response.source.name} ${enabled ? "enabled" : "disabled"}.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update source.";
        toast.error(message);
      } finally {
        setTogglingSourceKey(null);
      }
    },
    [refreshActivityLogs, togglingSourceKey, trimmedId, upsertSource]
  );

  const updateSourceCadence = useCallback(
    async (sourceKey: string, scanCadence: IdgSalesScanCadence) => {
      const key = sourceKey.trim().toLowerCase();
      if (!trimmedId || !key || updatingCadenceKey) return;

      setUpdatingCadenceKey(key);

      try {
        const response = await updateIdgSalesSource(trimmedId, key, {
          scan_cadence: scanCadence,
        });
        if (hasApiId(response.source)) {
          upsertSource(mapApiSourceToIngestionSource(response.source));
        }
        await refreshActivityLogs().catch(() => undefined);
        toast.success(
          `${response.source.name} scan frequency set to ${scanCadence}.`
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update scan frequency.";
        toast.error(message);
      } finally {
        setUpdatingCadenceKey(null);
      }
    },
    [refreshActivityLogs, trimmedId, updatingCadenceKey, upsertSource]
  );

  const deleteSource = useCallback(
    async (sourceKey: string) => {
      const key = sourceKey.trim().toLowerCase();
      if (!trimmedId || !key || deletingSourceKey) return;

      setDeletingSourceKey(key);
      try {
        const response = await deleteIdgSalesSource(trimmedId, key);
        const removedName = response.source?.name ?? key.toUpperCase();
        setSources((current) => current.filter((item) => item.sourceKey !== key));
        await refreshSourceCatalog().catch(() => undefined);
        await refreshActivityLogs().catch(() => undefined);
        toast.success(`${removedName} deleted.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete source.";
        toast.error(message);
        throw err;
      } finally {
        setDeletingSourceKey(null);
      }
    },
    [deletingSourceKey, refreshActivityLogs, refreshSourceCatalog, trimmedId]
  );

  const runScan = useCallback(
    async (
      sourceKey = "ungm",
      scanOptions?: Pick<ScanSourcePayload, "country_allowlist" | "category_allowlist" | "query">
    ) => {
      const key = sourceKey.trim().toLowerCase() || "ungm";
      if (!trimmedId || scanning) return;

      const source = sources.find((item) => item.sourceKey === key);
      if (source && !source.isActive) {
        toast.error(`${source.name} is inactive. Enable it before scanning.`);
        return;
      }

      if (!source?.canScan) {
        toast.error("Unsupported source scan.");
        return;
      }

      const label = key.toUpperCase();
      setScanning(true);
      setScanningSourceKey(key);
      toast.info(`Running ${label} portal scan...`);

      try {
        const queryKeyword = scanOptions?.query?.trim() ?? "";
        // No page_size / max from UI — backend paginates until the portal has no more notices.
        const payload: ScanSourcePayload = {
          ...(queryKeyword !== "" ? { query: queryKeyword } : {}),
          ...(key === "ungm" ? { active_only: true } : {}),
          ...(scanOptions?.country_allowlist === "*" ? { country_allowlist: "*" } : {}),
          ...(scanOptions?.category_allowlist === "*" ? { category_allowlist: "*" } : {}),
        };
        const result = await scanIdgSalesSource(trimmedId, key, payload);

        if (hasApiId(result.source)) {
          upsertSource(mapApiSourceToIngestionSource(result.source));
        }

        const scannedOpportunities = Array.isArray(result.opportunities)
          ? result.opportunities
              .filter(hasApiId)
              .map((item) => mapApiOpportunityToOpportunity(item, trimmedId))
          : [];

        if (scannedOpportunities.length > 0) {
          setOpportunities((current) => {
            const scannedIds = new Set(scannedOpportunities.map((item) => item.id));
            return [...scannedOpportunities, ...current.filter((item) => !scannedIds.has(item.id))];
          });
        }

        await refreshActivityLogs().catch(() => undefined);
        await refreshScanSummary().catch(() => undefined);
        pushIdgSalesInboxItems(result.pushNotifications);
        const created = Number(result.summary?.created ?? 0);
        const updated = Number(result.summary?.updated ?? 0);
        const total = Number(result.summary?.totalReturned ?? scannedOpportunities.length);
        const stillRunning = (result.source?.lastScanStatus ?? "").toLowerCase() === "running";
        if (stillRunning) {
          toast.message(
            `${label} scan running — ${total} opportunities so far (${created} new, ${updated} updated). Remaining pages continue in the background.`
          );
        } else {
          toast.success(
            `${label} scan finished — ${total} opportunities kept (open deadline or none; ${created} new, ${updated} updated).`
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Portal scan failed.";
        toast.error(message);
        await refreshScanSummary().catch(() => undefined);
      } finally {
        setScanning(false);
        setScanningSourceKey(null);
      }
    },
    [refreshActivityLogs, refreshScanSummary, scanning, sources, trimmedId, upsertSource]
  );

  const approveReview = useCallback(
    async (opportunityId: string, notes?: string) => {
      if (!trimmedId) return;

      setProcessingId(opportunityId);
      try {
        const response = await reviewIdgSalesOpportunity(trimmedId, opportunityId, {
          decision: "approved",
          notes,
        });
        const updated = mapApiOpportunityToOpportunity(response.opportunity, trimmedId);
        setOpportunities((current) =>
          current.map((item) => (item.id === opportunityId ? updated : item))
        );
        await refreshActivityLogs().catch(() => undefined);
        await refreshDecisionSummary().catch(() => undefined);
        toast.success("Opportunity validated.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to validate opportunity.";
        toast.error(message);
      } finally {
        setProcessingId(null);
      }
    },
    [refreshActivityLogs, refreshDecisionSummary, trimmedId]
  );

  const rejectReview = useCallback(
    async (opportunityId: string, notes?: string) => {
      if (!trimmedId) return;

      setProcessingId(opportunityId);
      try {
        const response = await reviewIdgSalesOpportunity(trimmedId, opportunityId, {
          decision: "rejected",
          notes,
        });
        const updated = mapApiOpportunityToOpportunity(response.opportunity, trimmedId);
        setOpportunities((current) =>
          current.map((item) => (item.id === opportunityId ? updated : item))
        );
        await refreshActivityLogs().catch(() => undefined);
        await refreshDecisionSummary().catch(() => undefined);
        toast.info("Opportunity rejected.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to reject opportunity.";
        toast.error(message);
      } finally {
        setProcessingId(null);
      }
    },
    [refreshActivityLogs, refreshDecisionSummary, trimmedId]
  );

  const restoreReview = useCallback(
    async (opportunityId: string, notes?: string) => {
      if (!trimmedId) return;

      setProcessingId(opportunityId);
      try {
        const response = await reviewIdgSalesOpportunity(trimmedId, opportunityId, {
          decision: "needs_review",
          notes,
        });
        const updated = mapApiOpportunityToOpportunity(response.opportunity, trimmedId);
        setOpportunities((current) =>
          current.map((item) => (item.id === opportunityId ? updated : item))
        );
        await refreshActivityLogs().catch(() => undefined);
        await refreshDecisionSummary().catch(() => undefined);
        toast.success("Opportunity restored for review.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to restore opportunity.";
        toast.error(message);
      } finally {
        setProcessingId(null);
      }
    },
    [refreshActivityLogs, refreshDecisionSummary, trimmedId]
  );

  const saveNotes = useCallback(
    async (opportunityId: string, notes: string) => {
      if (!trimmedId) return;

      setSavingNotesId(opportunityId);
      try {
        const response = await saveIdgSalesOpportunityNotes(trimmedId, opportunityId, { notes });
        const updated = mapApiOpportunityToOpportunity(response.opportunity, trimmedId);
        setOpportunities((current) =>
          current.map((item) => (item.id === opportunityId ? updated : item))
        );
        await refreshActivityLogs().catch(() => undefined);
        toast.success("Notes saved.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save notes.";
        toast.error(message);
        throw err;
      } finally {
        setSavingNotesId(null);
      }
    },
    [refreshActivityLogs, trimmedId]
  );

  const assignReviewer = useCallback(
    async (opportunityId: string, userId: number | null) => {
      if (!trimmedId || !opportunityId) return;

      setAssigningReviewerId(opportunityId);
      try {
        const response = await assignIdgSalesOpportunityReviewer(trimmedId, opportunityId, {
          user_id: userId,
        });
        const updated = mapApiOpportunityToOpportunity(response.opportunity, trimmedId);
        setOpportunities((current) =>
          current.map((item) => (item.id === opportunityId ? updated : item))
        );
        await refreshActivityLogs().catch(() => undefined);
        pushIdgSalesInboxItems(response.pushNotifications);
        toast.success(userId != null ? "Reviewer assigned." : "Reviewer cleared.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to assign reviewer.";
        toast.error(message);
        throw err;
      } finally {
        setAssigningReviewerId(null);
      }
    },
    [refreshActivityLogs, trimmedId]
  );

  const sendDeadlineReminder = useCallback(
    async (opportunityId: string) => {
      if (!trimmedId || !opportunityId) return;

      setSendingDeadlineReminderId(opportunityId);
      try {
        const response = await sendIdgSalesDeadlineReminder(trimmedId, opportunityId);
        const updated = mapApiOpportunityToOpportunity(response.opportunity, trimmedId);
        setOpportunities((current) =>
          current.map((item) => (item.id === opportunityId ? updated : item))
        );
        pushIdgSalesInboxItems(response.pushNotifications);
        await refreshActivityLogs().catch(() => undefined);
        toast.success("Deadline reminder sent to the assigned reviewer.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send deadline reminder.";
        toast.error(message);
        throw err;
      } finally {
        setSendingDeadlineReminderId(null);
      }
    },
    [refreshActivityLogs, trimmedId]
  );

  const archiveOpportunity = useCallback(
    async (opportunityId: string, options?: { onBeforeRemove?: () => void }) => {
      if (!trimmedId || !opportunityId) return;

      setArchivingId(opportunityId);
      try {
        await archiveIdgSalesOpportunity(trimmedId, opportunityId);
        options?.onBeforeRemove?.();
        setOpportunities((current) => current.filter((item) => item.id !== opportunityId));
        await refreshActivityLogs().catch(() => undefined);
        toast.success("Opportunity archived.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to archive opportunity.";
        toast.error(message);
        throw err;
      } finally {
        setArchivingId(null);
      }
    },
    [refreshActivityLogs, trimmedId]
  );

  const deleteOpportunity = useCallback(
    async (opportunityId: string, options?: { onBeforeRemove?: () => void }) => {
      if (!trimmedId || !opportunityId) return;

      setDeletingId(opportunityId);
      try {
        await deleteIdgSalesOpportunity(trimmedId, opportunityId);
        options?.onBeforeRemove?.();
        setOpportunities((current) => current.filter((item) => item.id !== opportunityId));
        await refreshActivityLogs().catch(() => undefined);
        toast.success("Opportunity deleted.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete opportunity.";
        toast.error(message);
        throw err;
      } finally {
        setDeletingId(null);
      }
    },
    [refreshActivityLogs, trimmedId]
  );

  const restoreOpportunity = useCallback(
    async (opportunityId: string) => {
      if (!trimmedId || !opportunityId) return;

      setProcessingId(opportunityId);
      try {
        const response = await restoreIdgSalesOpportunity(trimmedId, opportunityId);
        const restored = mapApiOpportunityToOpportunity(response.opportunity, trimmedId);
        setOpportunities((current) => {
          const without = current.filter((item) => item.id !== opportunityId);
          return [restored, ...without];
        });
        await refreshActivityLogs().catch(() => undefined);
        toast.success("Opportunity restored.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to restore opportunity.";
        toast.error(message);
        throw err;
      } finally {
        setProcessingId(null);
      }
    },
    [refreshActivityLogs, trimmedId]
  );

  const saveSalesforceCredentials = useCallback(
    async (payload: SaveIdgSalesforceCredentialsPayload): Promise<boolean> => {
      if (!trimmedId || savingSalesforceCredentials) return false;

      setSavingSalesforceCredentials(true);
      try {
        const response = await saveIdgSalesforceCredentials(trimmedId, payload);
        setSalesforce(mapSalesforceConnection(response.salesforce));
        await refreshActivityLogs().catch(() => undefined);
        toast.success("Salesforce credentials saved. Click Connect to authorize.");
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save Salesforce credentials.";
        toast.error(message);
        return false;
      } finally {
        setSavingSalesforceCredentials(false);
      }
    },
    [refreshActivityLogs, savingSalesforceCredentials, trimmedId]
  );

  const connectSalesforce = useCallback(async () => {
    if (!trimmedId || connectingSalesforce) return;

    setConnectingSalesforce(true);
    try {
      const response = await connectIdgSalesforce(trimmedId);
      if (!response.authorizeUrl) {
        throw new Error("Salesforce authorize URL was not returned.");
      }
      window.location.assign(response.authorizeUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start Salesforce connection.";
      toast.error(message);
      setConnectingSalesforce(false);
    }
  }, [connectingSalesforce, trimmedId]);

  const disconnectSalesforce = useCallback(async () => {
    if (!trimmedId || disconnectingSalesforce) return;

    setDisconnectingSalesforce(true);
    try {
      const response = await disconnectIdgSalesforce(trimmedId);
      setSalesforce(mapSalesforceConnection(response.salesforce));
      await refreshActivityLogs().catch(() => undefined);
      toast.success("Salesforce disconnected.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to disconnect Salesforce.";
      toast.error(message);
    } finally {
      setDisconnectingSalesforce(false);
    }
  }, [disconnectingSalesforce, refreshActivityLogs, trimmedId]);

  const pushToSalesforce = useCallback(
    async (opportunityId: string) => {
      if (!trimmedId || !opportunityId || pushingId) return;

      if (!salesforce.connected) {
        toast.error(
          salesforce.status === "expired" || salesforce.lastError
            ? "Salesforce session expired. Reconnect your Salesforce from Push Log, then try again."
            : "Connect your Salesforce before pushing opportunities."
        );
        return;
      }

      setPushingId(opportunityId);
      try {
        const response = await pushIdgSalesOpportunityToSalesforce(trimmedId, opportunityId);
        const updated = mapApiOpportunityToOpportunity(response.opportunity, trimmedId);
        setOpportunities((current) =>
          current.map((item) => (item.id === opportunityId ? updated : item))
        );
        pushIdgSalesInboxItems(response.pushNotifications);
        await refreshActivityLogs().catch(() => undefined);
        toast.success(
          updated.salesforceOpportunityId
            ? `Pushed to Salesforce (${updated.salesforceOpportunityId}).`
            : "Opportunity pushed to Salesforce."
        );
      } catch (err) {
        const failed = err as Error & {
          data?: {
            opportunity?: Parameters<typeof mapApiOpportunityToOpportunity>[0];
            pushNotifications?: Parameters<typeof pushIdgSalesInboxItems>[0];
          };
        };
        pushIdgSalesInboxItems(failed.data?.pushNotifications);
        if (failed.data?.opportunity) {
          const updated = mapApiOpportunityToOpportunity(failed.data.opportunity, trimmedId);
          setOpportunities((current) =>
            current.map((item) => (item.id === opportunityId ? updated : item))
          );
        }
        const message = err instanceof Error ? err.message : "Salesforce push failed.";
        toast.error(message);
        await refresh({ silent: true }).catch(() => undefined);
      } finally {
        setPushingId(null);
      }
    },
    [pushingId, refresh, refreshActivityLogs, salesforce.connected, trimmedId]
  );

  return {
    agentId: trimmedId,
    opportunities,
    sources,
    sourceCatalog,
    activityLogs,
    decisionSummary,
    scanSummary,
    pushLog,
    salesforce,
    loading,
    initialized,
    error,
    scanning,
    scanningSourceKey,
    togglingSourceKey,
    updatingCadenceKey,
    addingSourceKey,
    deletingSourceKey,
    processingId,
    archivingId,
    deletingId,
    connectingSalesforce,
    disconnectingSalesforce,
    savingSalesforceCredentials,
    pushingId,
    savingNotesId,
    assigningReviewerId,
    sendingDeadlineReminderId,
    detailLoadingId,
    refresh,
    refreshActivityLogs,
    selectOpportunity,
    runScan,
    addSource,
    updateSourceSettings,
    refreshSourceCatalog,
    toggleSource,
    updateSourceCadence,
    deleteSource,
    approveReview,
    rejectReview,
    restoreReview,
    saveNotes,
    assignReviewer,
    sendDeadlineReminder,
    archiveOpportunity,
    deleteOpportunity,
    restoreOpportunity,
    saveSalesforceCredentials,
    connectSalesforce,
    disconnectSalesforce,
    pushToSalesforce,
  };
}

export function buildSalesIntelOutcomes(
  useCaseTitle: string,
  controller: Pick<
    SalesIntelController,
    "opportunities" | "sources" | "pushLog" | "salesforce" | "decisionSummary" | "scanSummary"
  >
) {
  const metrics = computeDashboardMetrics(controller.opportunities);
  const lastScan = controller.sources
    .filter((source) => source.lastScanAt)
    .map((source) => source.lastScanAt!)
    .sort()
    .reverse()[0];
  const pushed = controller.opportunities.filter((item) => item.stage === "pushed").length;
  const failedPushes = controller.pushLog.filter((entry) => entry.status === "failed").length;
  const successfulPushes = controller.pushLog.filter((entry) => entry.status === "success").length;
  const activeSources = controller.sources.filter((source) => source.isActive).length;
  const ingested = controller.opportunities.length;
  const newFromScan = controller.opportunities.filter((item) => item.stage === "ingested").length;
  const approvals = Number(controller.decisionSummary?.approvals ?? 0);
  const rejections = Number(controller.decisionSummary?.rejections ?? 0);
  const overrides = Number(controller.decisionSummary?.overrides ?? 0);
  const recentScans = Number(controller.scanSummary?.recentScans ?? 0);
  const scanSuccessRate = Number(controller.scanSummary?.successRate ?? 0);

  const outcomesByTitle: Record<
    string,
    Array<{ value: string; label: string; trend?: string; trendUp?: boolean }>
  > = {
    Overview: [
      {
        value: String(metrics.newFound),
        label: "New Opportunities Found",
        trend: "since last portal scan",
        trendUp: true,
      },
      {
        value: String(metrics.qualified),
        label: "Qualified Opportunities",
        trend: "AI + human validated",
        trendUp: true,
      },
      {
        value: String(metrics.awaitingReview),
        label: "Awaiting Review",
        trend: "human validation queue",
        trendUp: false,
      },
      {
        value: String(metrics.rejected),
        label: "Rejected",
        trend: "no bid / declined",
        trendUp: false,
      },
      {
        value: formatCurrency(metrics.pipelineValue),
        label: "Pipeline Value Identified",
        trend: "active opportunities",
        trendUp: true,
      },
    ],
    "Opportunity Pipeline": [
      {
        value: String(controller.opportunities.length),
        label: "Total in Pipeline",
        trend: "all stages",
        trendUp: true,
      },
      {
        value: String(pushed),
        label: "Pushed to Salesforce",
        trend: "successfully synced",
        trendUp: true,
      },
      {
        value: String(metrics.upcomingDeadlines),
        label: "Upcoming Deadlines",
        trend: "within 14 days",
        trendUp: false,
      },
      {
        value: lastScan ? formatDateTime(lastScan) : "—",
        label: "Last Portal Scan",
        trend: "UNGM + TED",
        trendUp: true,
      },
    ],
    Ingestion: [
      {
        value: String(activeSources),
        label: "Active Sources",
        trend: "UNGM + TED portals",
        trendUp: true,
      },
      {
        value: String(ingested),
        label: "Opportunities Ingested",
        trend: "all time",
        trendUp: true,
      },
      {
        value: String(newFromScan),
        label: "New from Last Scan",
        trend: "ready to qualify",
        trendUp: true,
      },
    ],
    "Review Queue": [
      {
        value: String(metrics.awaitingReview),
        label: "Awaiting Validation",
        trend: "qualified opportunities",
        trendUp: false,
      },
      {
        value: String(controller.opportunities.filter((item) => item.stage === "validated").length),
        label: "Validated This Week",
        trend: "approved for push",
        trendUp: true,
      },
    ],
    "Salesforce Push Log": [
      {
        value: controller.salesforce.connected ? "Connected" : "Not connected",
        label: "Salesforce Status",
        trend: controller.salesforce.configured ? "OAuth ready" : "OAuth not configured",
        trendUp: controller.salesforce.connected,
      },
      {
        value: String(successfulPushes),
        label: "Successful Pushes",
        trend: "synced to SF",
        trendUp: true,
      },
      {
        value: String(failedPushes),
        label: "Failed Attempts",
        trend: "needs retry",
        trendUp: false,
      },
    ],
    "Decision History": [
      {
        value: String(approvals),
        label: "Approvals",
        trend: "from decision-history API",
        trendUp: true,
      },
      {
        value: String(rejections),
        label: "Rejections",
        trend: "audit trail",
        trendUp: false,
      },
      {
        value: String(overrides),
        label: "Overrides",
        trend: "restored for review",
        trendUp: true,
      },
    ],
    "History Scan": [
      {
        value: String(recentScans),
        label: "Recent Scans",
        trend: "UNGM + TED",
        trendUp: true,
      },
      {
        value: `${scanSuccessRate}%`,
        label: "Success Rate",
        trend: "from scan-history API",
        trendUp: scanSuccessRate >= 50,
      },
    ],
  };

  return outcomesByTitle[useCaseTitle];
}
