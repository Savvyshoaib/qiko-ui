import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  createMockIngestionSources,
  createMockOpportunities,
  createMockPushLog,
} from "@/pages/studio-dashboard/sales-intelligence/salesIntelMockData";
import type {
  IngestionSource,
  Opportunity,
  OpportunityStage,
  SalesforcePushLogEntry,
} from "@/pages/studio-dashboard/sales-intelligence/salesIntelTypes";

interface AgentSalesIntelEntry {
  opportunities: Opportunity[];
  sources: IngestionSource[];
  pushLog: SalesforcePushLogEntry[];
  initialized: boolean;
  scanning: boolean;
}

interface SalesIntelState {
  byAgentId: Record<string, AgentSalesIntelEntry>;
}

const initialState: SalesIntelState = {
  byAgentId: {},
};

function getEntry(state: SalesIntelState, agentId: string): AgentSalesIntelEntry {
  if (!state.byAgentId[agentId]) {
    state.byAgentId[agentId] = {
      opportunities: [],
      sources: [],
      pushLog: [],
      initialized: false,
      scanning: false,
    };
  }
  return state.byAgentId[agentId];
}

function updateOpportunityInList(
  opportunities: Opportunity[],
  id: string,
  patch: Partial<Opportunity>
): Opportunity[] {
  return opportunities.map((opp) =>
    opp.id === id ? { ...opp, ...patch, updatedAt: new Date().toISOString() } : opp
  );
}

function getPipelineStagePatch(opp: Opportunity, stage: OpportunityStage): Partial<Opportunity> {
  const now = new Date().toISOString();

  switch (stage) {
    case "ingested":
      return {
        stage,
        humanReviewStatus: undefined,
        humanReviewNotes: undefined,
        reviewedBy: undefined,
        reviewedAt: undefined,
        qualificationScore: undefined,
        qualificationSummary: undefined,
        qualificationReasons: undefined,
        rejectionReasons: undefined,
        salesforcePushStatus: "not_started",
        salesforceOpportunityId: undefined,
        salesforcePushedAt: undefined,
        salesforcePushError: undefined,
      };
    case "qualifying":
      return {
        stage,
        humanReviewStatus: undefined,
        rejectionReasons: undefined,
      };
    case "qualified":
      return {
        stage: "qualified",
        humanReviewStatus: undefined,
        rejectionReasons: undefined,
        qualificationScore: opp.qualificationScore ?? 76,
        qualificationSummary: opp.qualificationSummary ?? "Manually moved to qualified.",
        qualificationReasons: opp.qualificationReasons ?? ["Moved via pipeline"],
      };
    case "awaiting_review":
      return {
        stage,
        humanReviewStatus: "pending",
        rejectionReasons: undefined,
      };
    case "validated":
      return {
        stage,
        humanReviewStatus: "approved",
        reviewedBy: opp.reviewedBy ?? "Reviewer",
        reviewedAt: opp.reviewedAt ?? now,
        rejectionReasons: undefined,
      };
    case "pushed":
      return {
        stage,
        salesforcePushStatus: "success",
        salesforcePushedAt: opp.salesforcePushedAt ?? now,
        salesforceOpportunityId: opp.salesforceOpportunityId ?? `SF-${Date.now().toString(36).toUpperCase()}`,
        salesforcePushError: undefined,
        rejectionReasons: undefined,
      };
    default:
      return { stage };
  }
}

const salesIntelSlice = createSlice({
  name: "salesIntel",
  initialState,
  reducers: {
    initializeSalesIntelMock(state, action: PayloadAction<{ agentId: string }>) {
      const entry = getEntry(state, action.payload.agentId);
      if (entry.initialized) return;

      const opportunities = createMockOpportunities(action.payload.agentId);
      entry.opportunities = opportunities;
      entry.sources = createMockIngestionSources();
      entry.pushLog = createMockPushLog(opportunities);
      entry.initialized = true;
    },
    setOpportunityStage(
      state,
      action: PayloadAction<{ agentId: string; opportunityId: string; stage: OpportunityStage }>
    ) {
      const entry = getEntry(state, action.payload.agentId);
      entry.opportunities = updateOpportunityInList(entry.opportunities, action.payload.opportunityId, {
        stage: action.payload.stage,
      });
    },
    moveOpportunityPipelineStage(
      state,
      action: PayloadAction<{ agentId: string; opportunityId: string; stage: OpportunityStage }>
    ) {
      const entry = getEntry(state, action.payload.agentId);
      const opp = entry.opportunities.find((o) => o.id === action.payload.opportunityId);
      if (!opp || opp.stage === action.payload.stage) return;

      entry.opportunities = updateOpportunityInList(
        entry.opportunities,
        action.payload.opportunityId,
        getPipelineStagePatch(opp, action.payload.stage)
      );
    },
    approveOpportunityReview(
      state,
      action: PayloadAction<{ agentId: string; opportunityId: string; notes?: string; reviewedBy?: string }>
    ) {
      const entry = getEntry(state, action.payload.agentId);
      entry.opportunities = updateOpportunityInList(entry.opportunities, action.payload.opportunityId, {
        stage: "validated",
        humanReviewStatus: "approved",
        humanReviewNotes: action.payload.notes,
        reviewedBy: action.payload.reviewedBy ?? "Reviewer",
        reviewedAt: new Date().toISOString(),
      });
    },
    rejectOpportunityReview(
      state,
      action: PayloadAction<{ agentId: string; opportunityId: string; notes?: string; reviewedBy?: string }>
    ) {
      const entry = getEntry(state, action.payload.agentId);
      entry.opportunities = updateOpportunityInList(entry.opportunities, action.payload.opportunityId, {
        stage: "rejected",
        humanReviewStatus: "rejected",
        humanReviewNotes: action.payload.notes,
        reviewedBy: action.payload.reviewedBy ?? "Reviewer",
        reviewedAt: new Date().toISOString(),
      });
    },
    pushOpportunityToSalesforce(
      state,
      action: PayloadAction<{ agentId: string; opportunityId: string; simulateFailure?: boolean }>
    ) {
      const entry = getEntry(state, action.payload.agentId);
      const opp = entry.opportunities.find((o) => o.id === action.payload.opportunityId);
      if (!opp) return;

      const failed = action.payload.simulateFailure ?? opp.id === "opp-008";
      const now = new Date().toISOString();

      if (failed) {
        entry.opportunities = updateOpportunityInList(entry.opportunities, action.payload.opportunityId, {
          stage: "push_failed",
          salesforcePushStatus: "failed",
          salesforcePushError: "DUPLICATE_VALUE: Opportunity with same buyer reference already exists",
        });
        entry.pushLog.unshift({
          id: `log-${Date.now()}`,
          opportunityId: opp.id,
          opportunityTitle: opp.title,
          attemptedAt: now,
          status: "failed",
          errorMessage: "DUPLICATE_VALUE: Opportunity with same buyer reference already exists",
        });
      } else {
        const sfId = `SF-${Date.now().toString(36).toUpperCase()}`;
        entry.opportunities = updateOpportunityInList(entry.opportunities, action.payload.opportunityId, {
          stage: "pushed",
          salesforcePushStatus: "success",
          salesforceOpportunityId: sfId,
          salesforcePushedAt: now,
          salesforcePushError: undefined,
        });
        entry.pushLog.unshift({
          id: `log-${Date.now()}`,
          opportunityId: opp.id,
          opportunityTitle: opp.title,
          attemptedAt: now,
          status: "success",
          salesforceId: sfId,
        });
      }
    },
    addManualOpportunity(
      state,
      action: PayloadAction<{ agentId: string; title: string; buyer: string; sourceUrl?: string }>
    ) {
      const entry = getEntry(state, action.payload.agentId);
      const id = `opp-manual-${Date.now()}`;
      const now = new Date().toISOString();
      entry.opportunities.unshift({
        id,
        agentId: action.payload.agentId,
        title: action.payload.title,
        buyer: action.payload.buyer,
        source: "Manual Upload",
        sourceUrl: action.payload.sourceUrl,
        country: "United Kingdom",
        stage: "ingested",
        salesforcePushStatus: "not_started",
        createdAt: now,
        updatedAt: now,
      });
      const manualSource = entry.sources.find((s) => s.type === "manual");
      if (manualSource) {
        manualSource.lastScanAt = now;
        manualSource.opportunitiesFound = (manualSource.opportunitiesFound ?? 0) + 1;
      }
    },
    setScanning(state, action: PayloadAction<{ agentId: string; scanning: boolean }>) {
      const entry = getEntry(state, action.payload.agentId);
      entry.scanning = action.payload.scanning;
      if (action.payload.scanning) {
        for (const source of entry.sources) {
          if (source.type === "portal") {
            source.lastScanStatus = "running";
          }
        }
      }
    },
    completePortalScan(state, action: PayloadAction<{ agentId: string }>) {
      const entry = getEntry(state, action.payload.agentId);
      entry.scanning = false;
      const now = new Date().toISOString();
      for (const source of entry.sources) {
        if (source.type === "portal") {
          source.lastScanAt = now;
          source.lastScanStatus = "success";
        }
      }
      const id = `opp-scan-${Date.now()}`;
      entry.opportunities.unshift({
        id,
        agentId: action.payload.agentId,
        externalId: `CF-2026-${Math.floor(Math.random() * 90000 + 10000)}`,
        title: "New Portal Scan – Government Building Security Contract",
        buyer: "Cabinet Office",
        source: "Contracts Finder",
        country: "United Kingdom",
        category: "Security Services",
        estimatedValue: 1650000,
        currency: "GBP",
        publishedAt: now,
        deadlineAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        stage: "ingested",
        salesforcePushStatus: "not_started",
        createdAt: now,
        updatedAt: now,
      });
    },
    qualifyOpportunity(state, action: PayloadAction<{ agentId: string; opportunityId: string }>) {
      const entry = getEntry(state, action.payload.agentId);
      entry.opportunities = updateOpportunityInList(entry.opportunities, action.payload.opportunityId, {
        stage: "qualified",
        qualificationScore: 76,
        qualificationSummary: "Auto-qualified based on IDG security services criteria.",
        qualificationReasons: ["Security services category", "Public sector buyer", "Value within target range"],
      });
    },
  },
});

export const {
  initializeSalesIntelMock,
  setOpportunityStage,
  moveOpportunityPipelineStage,
  approveOpportunityReview,
  rejectOpportunityReview,
  pushOpportunityToSalesforce,
  addManualOpportunity,
  setScanning,
  completePortalScan,
  qualifyOpportunity,
} = salesIntelSlice.actions;

export default salesIntelSlice.reducer;
