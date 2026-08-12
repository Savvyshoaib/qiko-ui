import { useCallback, useEffect, useMemo } from "react";
import type { FinancialStorageState } from "./financialTypes";
import {
  getUserAnalytics,
  indexBatch,
  uploadFinancialFile,
  type ELUploadResponse,
  type ELUserAnalyticsResponse,
} from "@/lib/ELApi";
import { mapElUserAnalyticsToDashboardData, resolveUserAnalyticsQuery } from "./userAnalyticsToDashboard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { store } from "@/store";
import {
  setFinancialError,
  setFinancialProcessing,
  upsertFinancialSuccess,
} from "@/store/slices/financialSlice";
interface UseFinancialDataOptions {
  autoLoad?: boolean;
}

function readMergedApiResponse(workerId: string): Record<string, unknown> | null {
  const raw = store.getState().financial.byWorkerId[workerId]?.current?.apiResponse;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function readPortfolioDateBounds(workerId: string): { from?: string; to?: string } {
  const api = readMergedApiResponse(workerId);
  const pb = api?.portfolioDateRange as { from?: string; to?: string } | undefined;
  if (pb?.from && pb?.to) return { from: pb.from, to: pb.to };
  const nested = api?.analytics as ELUserAnalyticsResponse | undefined;
  return { from: nested?.dateRange?.from, to: nested?.dateRange?.to };
}

export function useFinancialData(workerId: string | null, options: UseFinancialDataOptions = {}) {
  const dispatch = useAppDispatch();
  const financialEntry = useAppSelector((state) =>
    workerId ? state.financial.byWorkerId[workerId] : undefined
  );

  const load = useCallback(
    async (agentUniqueId?: string, opts?: { activeRange?: string }) => {
      if (!workerId || !agentUniqueId) return;
      dispatch(setFinancialProcessing({ workerId, loading: true }));
      try {
        const prevState = store.getState().financial.byWorkerId[workerId]?.current;
        const activeRange =
          opts?.activeRange ?? prevState?.dashboardData?.activeRange ?? "all";
        const { from: pf, to: pt } = readPortfolioDateBounds(workerId);
        const q = resolveUserAnalyticsQuery(activeRange, pf, pt);
        const analytics = await getUserAnalytics(agentUniqueId, q);
        const now = new Date().toISOString();

        const dashboardData = mapElUserAnalyticsToDashboardData(analytics, activeRange);

        const prevApi = readMergedApiResponse(workerId);
        const wasUnfiltered = !q.from && !q.to && !q.month;
        const existingPb = prevApi?.portfolioDateRange as { from?: string; to?: string } | undefined;
        const portfolioDateRange =
          existingPb?.from && existingPb?.to
            ? existingPb
            : wasUnfiltered && analytics.dateRange?.from && analytics.dateRange?.to
              ? { from: analytics.dateRange.from, to: analytics.dateRange.to }
              : existingPb;

        const mergedApi: Record<string, unknown> =
          prevApi && typeof prevApi === "object"
            ? {
                ...prevApi,
                analytics,
                ...(portfolioDateRange?.from && portfolioDateRange?.to
                  ? { portfolioDateRange }
                  : {}),
              }
            : {
                analytics,
                ...(portfolioDateRange?.from && portfolioDateRange?.to
                  ? { portfolioDateRange }
                  : {}),
              };

        const next: FinancialStorageState = {
          version: "1.0",
          workerId,
          file: {
            fileName: analytics.files?.[0]?.label
              ? `${analytics.files[0].label}.xlsx`
              : prevState?.file?.fileName || "uploaded-file.xlsx",
            fileType: prevState?.file?.fileType || "xlsx",
            uploadedAt: analytics.timestamp ?? prevState?.file?.uploadedAt ?? now,
            sourceType: "api_user",
            fileUrl: null,
          },
          workbook: prevState?.workbook ?? {
            sheetOrder: [],
            sheets: {},
          },
          dashboardData,
          apiResponse: mergedApi,
          aiSummary: prevState?.aiSummary ?? null,
          dataQualityWarnings: prevState?.dataQualityWarnings ?? [],
          detectedPeriod: analytics.dateRange?.label ?? prevState?.detectedPeriod ?? null,
          detectedCurrency: analytics.currency ?? prevState?.detectedCurrency ?? "GBP",
          processingStatus: "ready",
          lastProcessedAt: now,
        };
        dispatch(upsertFinancialSuccess({ workerId, next }));
        return next;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to fetch financial dashboard data.";
        dispatch(setFinancialError({ workerId, error: msg }));
        throw e;
      }
    },
    [dispatch, workerId]
  );

  useEffect(() => {
    if (options.autoLoad === true) {
      void load();
    }
  }, [load, options.autoLoad]);

  const processFile = useCallback(
    async (file: File, agentUniqueId?: string) => {
      if (!workerId) throw new Error("Worker ID is required.");
      if (!agentUniqueId) throw new Error("agent_unique_id is required.");
      dispatch(setFinancialProcessing({ workerId, loading: true }));
      try {
        const uploadResponse = await uploadFinancialFile(file, agentUniqueId);

        let indexBatchResponse: Record<string, unknown> | null = null;
        const shouldIndex =
          Boolean(uploadResponse.namespace?.trim()) && uploadResponse.needsIndexing !== false;
        if (shouldIndex) {
          indexBatchResponse = await indexBatch(uploadResponse.namespace);
        }

        const now = new Date().toISOString();
        const prevDash = store.getState().financial.byWorkerId[workerId]?.current?.dashboardData;
        const prevApi = readMergedApiResponse(workerId);
        const uploadState: FinancialStorageState = {
          version: "1.0",
          workerId,
          file: {
            fileName: uploadResponse.fileName || file.name,
            fileType: file.name.toLowerCase().endsWith(".csv")
              ? "csv"
              : file.name.toLowerCase().endsWith(".xls")
                ? "xls"
                : "xlsx",
            uploadedAt: now,
            sourceType: "api_user",
            fileUrl: null,
          },
          workbook: {
            sheetOrder: [],
            sheets: {},
          },
          dashboardData: prevDash ?? null,
          apiResponse: {
            ...(prevApi || {}),
            upload: uploadResponse,
            indexBatch: indexBatchResponse,
          } as unknown as Record<string, unknown>,
          aiSummary: null,
          dataQualityWarnings: [],
          detectedPeriod: null,
          detectedCurrency: "GBP",
          processingStatus: "ready",
          lastProcessedAt: now,
        };
        dispatch(upsertFinancialSuccess({ workerId, next: uploadState }));

        let analyticsLoaded = false;
        try {
          const next = await load(agentUniqueId, { activeRange: prevDash?.activeRange ?? "all" });
          analyticsLoaded = Boolean(next);
        } catch {
          analyticsLoaded = false;
        }

        return {
          upload: uploadResponse as ELUploadResponse,
          analyticsLoaded,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to process file.";
        dispatch(setFinancialError({ workerId, error: msg }));
        throw e;
      }
    },
    [dispatch, load, workerId]
  );

  const meta = useMemo(() => {
    if (!financialEntry?.current) return null;
    const state = financialEntry.current;
    return {
      fileName: state.file.fileName,
      uploadedAt: state.file.uploadedAt,
      status: state.processingStatus ?? "ready",
      fileType: state.file.fileType,
      warningCount: state.dataQualityWarnings?.length ?? 0,
    };
  }, [financialEntry?.current]);

  const effectiveAgentUniqueId = useMemo(() => {
    const apiResponse = financialEntry?.current?.apiResponse as
      | {
          upload?: { agent_unique_id?: string; email?: string };
          agent_unique_id?: string;
          email?: string;
          analytics?: { agent_unique_id?: string; email?: string };
        }
      | undefined;
    return (
      apiResponse?.upload?.agent_unique_id ||
      apiResponse?.analytics?.agent_unique_id ||
      (typeof apiResponse?.agent_unique_id === "string" ? apiResponse.agent_unique_id : null) ||
      apiResponse?.upload?.email ||
      apiResponse?.analytics?.email ||
      (typeof apiResponse?.email === "string" ? apiResponse.email : null) ||
      null
    );
  }, [financialEntry?.current?.apiResponse]);

  return {
    state: financialEntry?.current ?? null,
    history: financialEntry?.history ?? [],
    dashboardData: financialEntry?.current?.dashboardData ?? null,
    workbook: financialEntry?.current?.workbook ?? null,
    meta,
    loading: financialEntry?.loading ?? false,
    error: financialEntry?.error ?? null,
    effectiveAgentUniqueId,
    load,
    processFile,
  };
}
