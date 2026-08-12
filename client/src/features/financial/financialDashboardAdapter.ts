import type { FinancialDashboardData } from "./financialTypes";

type OpenRouterFinancialResult = {
  dashboardData?: Partial<FinancialDashboardData>;
} | null;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function mergeDashboardData(
  baseData: FinancialDashboardData,
  aiResult: OpenRouterFinancialResult | null
): FinancialDashboardData {
  if (!aiResult?.dashboardData || !isObject(aiResult.dashboardData)) {
    return baseData;
  }

  const merged = {
    ...baseData,
    ...aiResult.dashboardData,
    summary: isObject(aiResult.dashboardData.summary)
      ? { ...baseData.summary, ...aiResult.dashboardData.summary }
      : baseData.summary,
    extraMetrics: isObject(aiResult.dashboardData.extraMetrics)
      ? { ...baseData.extraMetrics, ...aiResult.dashboardData.extraMetrics }
      : baseData.extraMetrics,
  } as FinancialDashboardData;

  return merged;
}
