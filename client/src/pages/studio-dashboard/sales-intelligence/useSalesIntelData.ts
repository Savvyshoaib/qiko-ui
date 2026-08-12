import { useOptionalSalesIntelContext } from "./SalesIntelContext";
import type { ScanSourcePayload } from "@/lib/idgSalesApi";
import type { SalesforceConnection } from "./salesIntelTypes";
const DISCONNECTED_SALESFORCE: SalesforceConnection = {
  connected: false,
  status: "disconnected",
  configured: false,
};

/** @deprecated Prefer useSalesIntelContext inside SalesIntelProvider */
export function useSalesIntelData(agentId: string) {
  const context = useOptionalSalesIntelContext();
  const trimmedAgentId = agentId.trim();

  if (context) {
    if (trimmedAgentId && context.agentId !== trimmedAgentId) {
      console.warn(
        `[SalesIntel] agentId prop (${trimmedAgentId}) does not match provider (${context.agentId})`
      );
    }

    return {
      agentId: context.agentId,
      opportunities: context.opportunities,
      sources: context.sources,
      sourceCatalog: context.sourceCatalog,
      activityLogs: context.activityLogs,
      decisionSummary: context.decisionSummary,
      scanSummary: context.scanSummary,
      pushLog: context.pushLog,
      salesforce: context.salesforce,
      scanning: context.scanning,
      scanningSourceKey: context.scanningSourceKey,
      togglingSourceKey: context.togglingSourceKey,
      updatingCadenceKey: context.updatingCadenceKey,
      addingSourceKey: context.addingSourceKey,
      deletingSourceKey: context.deletingSourceKey,
      initialized: context.initialized,
      loading: context.loading,
      error: context.error,
      processingId: context.processingId,
      archivingId: context.archivingId,
      deletingId: context.deletingId,
      connectingSalesforce: context.connectingSalesforce,
      disconnectingSalesforce: context.disconnectingSalesforce,
      savingSalesforceCredentials: context.savingSalesforceCredentials,
      pushingId: context.pushingId,
      savingNotesId: context.savingNotesId,
      assigningReviewerId: context.assigningReviewerId,
      sendingDeadlineReminderId: context.sendingDeadlineReminderId,
      detailLoadingId: context.detailLoadingId,
      refresh: context.refresh,
      refreshActivityLogs: context.refreshActivityLogs,
      selectOpportunity: context.selectOpportunity,
      runScan: context.runScan,
      addSource: context.addSource,
      updateSourceSettings: context.updateSourceSettings,
      refreshSourceCatalog: context.refreshSourceCatalog,
      toggleSource: context.toggleSource,
      updateSourceCadence: context.updateSourceCadence,
      deleteSource: context.deleteSource,
      approveReview: context.approveReview,
      rejectReview: context.rejectReview,
      restoreReview: context.restoreReview,
      saveNotes: context.saveNotes,
      assignReviewer: context.assignReviewer,
      sendDeadlineReminder: context.sendDeadlineReminder,
      archiveOpportunity: context.archiveOpportunity,
      deleteOpportunity: context.deleteOpportunity,
      restoreOpportunity: context.restoreOpportunity,
      saveSalesforceCredentials: context.saveSalesforceCredentials,
      connectSalesforce: context.connectSalesforce,
      disconnectSalesforce: context.disconnectSalesforce,
      pushToSalesforce: context.pushToSalesforce,
    };
  }

  return {
    agentId: trimmedAgentId,
    opportunities: [],
    sources: [],
    sourceCatalog: [],
    activityLogs: [],
    decisionSummary: { approvals: 0, rejections: 0, overrides: 0, total: 0 },
    scanSummary: { recentScans: 0, successful: 0, failed: 0, successRate: 0 },
    pushLog: [],
    salesforce: DISCONNECTED_SALESFORCE,
    scanning: false,
    scanningSourceKey: null,
    togglingSourceKey: null,
    updatingCadenceKey: null,
    addingSourceKey: null,
    deletingSourceKey: null,
    initialized: false,
    loading: true,
    error: null,
    processingId: null,
    archivingId: null,
    deletingId: null,
    connectingSalesforce: false,
    disconnectingSalesforce: false,
    savingSalesforceCredentials: false,
    pushingId: null,
    savingNotesId: null,
    assigningReviewerId: null,
    sendingDeadlineReminderId: null,
    detailLoadingId: null,
    refresh: async () => undefined,
    refreshActivityLogs: async () => undefined,
    selectOpportunity: async () => undefined,
    runScan: async (
      _sourceKey?: string,
      _scanOptions?: Pick<ScanSourcePayload, "country_allowlist" | "category_allowlist" | "query">
    ) => undefined,
    addSource: async (
      _sourceKey?: string,
      _options?: {
        name?: string;
        url?: string;
        apiUrl?: string;
        defaultQuery?: string;
        connector?: string;
      }
    ) => undefined,
    updateSourceSettings: async () => undefined,
    refreshSourceCatalog: async () => undefined,
    toggleSource: async (_sourceKey?: string, _enabled?: boolean) => undefined,
    updateSourceCadence: async (
      _sourceKey?: string,
      _scanCadence?: import("@/lib/idgSalesApi").IdgSalesScanCadence
    ) => undefined,
    deleteSource: async (_sourceKey?: string) => undefined,
    approveReview: async () => undefined,
    rejectReview: async () => undefined,
    restoreReview: async () => undefined,
    saveNotes: async () => undefined,
    assignReviewer: async () => undefined,
    sendDeadlineReminder: async () => undefined,
    archiveOpportunity: async () => undefined,
    deleteOpportunity: async () => undefined,
    restoreOpportunity: async () => undefined,
    saveSalesforceCredentials: async () => false,
    connectSalesforce: async () => undefined,
    disconnectSalesforce: async () => undefined,
    pushToSalesforce: async () => undefined,
  };
}

export type SalesIntelData = ReturnType<typeof useSalesIntelData>;
