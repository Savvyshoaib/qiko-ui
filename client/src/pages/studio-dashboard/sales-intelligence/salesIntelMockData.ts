import { getSalesIntelMock, isMockDataEnabled } from "@/data/services";
import type { IngestionSource, Opportunity, SalesforcePushLogEntry } from "./salesIntelTypes";

export function createMockOpportunities(agentId: string): Opportunity[] {
  if (!isMockDataEnabled()) return [];
  const { opportunities } = getSalesIntelMock();
  return opportunities.map((opp) => ({
    ...(opp as Opportunity),
    agentId: agentId || String(opp.agentId ?? ""),
    id: String(opp.id),
  }));
}

export function createMockIngestionSources(): IngestionSource[] {
  if (!isMockDataEnabled()) return [];
  return getSalesIntelMock().sources.map((source) => ({
    ...(source as IngestionSource),
    id: String(source.id),
  }));
}

export function createMockPushLog(): SalesforcePushLogEntry[] {
  if (!isMockDataEnabled()) return [];
  return (getSalesIntelMock().activityLogs ?? [])
    .filter((log) => String(log.action) === "salesforce_push")
    .map((log, index) => ({
      id: String(log.id ?? `push-${index}`),
      opportunityId: String(log.opportunityId ?? ""),
      opportunityTitle: String(log.detail ?? "Opportunity"),
      action: String(log.action ?? "salesforce_push"),
      detail: String(log.detail ?? ""),
      tone: (log.tone as SalesforcePushLogEntry["tone"]) ?? "success",
      attemptedAt: String(log.createdAt ?? new Date().toISOString()),
      status: "success" as const,
    }));
}
