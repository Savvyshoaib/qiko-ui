export type StudioSectionId = "idg" | "sales_intelligence" | "essential_living";

export interface StudioDashboardWorker {
  id: string | number;
  name: string;
  professionalTitle?: string;
  template?: string;
  industry?: string;
  specialization?: string;
}

export const STUDIO_SECTIONS: Array<{
  id: StudioSectionId;
  title: string;
  description: string;
}> = [
  {
    id: "idg",
    title: "IDG Security",
    description: "Pre-sales, RFP response generation, and bid workflow",
  },
  {
    id: "sales_intelligence",
    title: "Sales Intelligence",
    description: "Opportunity ingestion, qualification, review, and Salesforce push",
  },
  {
    id: "essential_living",
    title: "Essential Living",
    description: "Property finance analysis and portfolio insights",
  },
];

const PRE_SALES_WRITER_SPECIALIZATIONS = new Set(["pre-sales rfp writer"]);
const SALES_INTELLIGENCE_SPECIALIZATIONS = new Set(["sales intelligence"]);
const FINANCIAL_ANALYST_SPECIALIZATIONS = new Set(["property finance specialist"]);

function normalizeSpecializationToken(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function matchesSpecializationSet(value: string | undefined, labels: Set<string>): boolean {
  const normalized = normalizeSpecializationToken(value);
  return normalized.length > 0 && labels.has(normalized);
}

export function isSalesIntelligenceWorker(worker: StudioDashboardWorker): boolean {
  return matchesSpecializationSet(worker.specialization, SALES_INTELLIGENCE_SPECIALIZATIONS);
}

export function isPreSalesWriterWorker(worker: StudioDashboardWorker): boolean {
  return matchesSpecializationSet(worker.specialization, PRE_SALES_WRITER_SPECIALIZATIONS);
}

export function isFinancialAnalystWorker(worker: StudioDashboardWorker): boolean {
  return matchesSpecializationSet(worker.specialization, FINANCIAL_ANALYST_SPECIALIZATIONS);
}

/** Essential Living — property finance dashboard (`Property Finance Specialist` specialization only) */
export function isEssentialLivingWorker(worker: StudioDashboardWorker): boolean {
  return isFinancialAnalystWorker(worker);
}

/** Pre Sales Writer — RFP response generation, knowledge base, section assignment */
export function isIdgStudioWorker(worker: StudioDashboardWorker): boolean {
  return isPreSalesWriterWorker(worker);
}

export function isSalesIntelligenceStudioWorker(worker: StudioDashboardWorker): boolean {
  return isSalesIntelligenceWorker(worker);
}

export function getStudioWorkerKey(worker: StudioDashboardWorker): string {
  if (isSalesIntelligenceWorker(worker)) return "sales_intelligence";
  if (isPreSalesWriterWorker(worker)) return "sales";
  if (isFinancialAnalystWorker(worker)) return "finance";
  if (worker.template === "researcher") return "research";
  return "sales";
}

export function isStudioCockpitWorker(worker: StudioDashboardWorker): boolean {
  return isPreSalesWriterWorker(worker) || isSalesIntelligenceWorker(worker);
}

export function agentToStudioWorker(agent: Record<string, unknown>): StudioDashboardWorker {
  const industry = (agent.industry as string | undefined)?.trim() || undefined;
  const specialization = (agent.specialization as string | undefined)?.trim() || undefined;

  return {
    id: (agent.agent_unique_id as string | number) ?? (agent.id as string | number),
    name: (agent.agent_name as string) ?? (agent.name as string) ?? "Untitled Worker",
    professionalTitle:
      (agent.professionalTitle as string) ??
      (agent.headline as string) ??
      industry ??
      "AI Worker",
    industry,
    specialization,
    template: (agent.template as string) ?? industry ?? "worker",
  };
}

export function resolveStudioWorkerById(
  workerId: string | number,
  studioWorkers: StudioDashboardWorker[]
): StudioDashboardWorker | null {
  return studioWorkers.find((worker) => String(worker.id) === String(workerId)) ?? null;
}
