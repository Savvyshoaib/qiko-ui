import rawMockData from "./mock-data.json";

/** Shape of the single application mock JSON (source of truth). */
export type MockAuthUser = {
  email: string;
  password: string;
  token: string;
  user: Record<string, unknown>;
  subscription?: Record<string, unknown> | null;
};

export type MockDataRoot = {
  meta: { version: number; description?: string };
  auth: { users: MockAuthUser[] };
  dashboard: {
    stats: Record<string, unknown>;
    charts: Record<string, Array<{ label: string; value: number }>>;
  };
  agents: Array<Record<string, unknown>>;
  studioUser: Record<string, unknown>;
  team: { members: Array<Record<string, unknown>> };
  assignments: {
    users: Array<Record<string, unknown>>;
    rfps: Array<Record<string, unknown>>;
    sections: Array<Record<string, unknown>>;
  };
  salesIntel: {
    agentId: string;
    sources: Array<Record<string, unknown>>;
    ingestFilters: Record<string, unknown>;
    opportunities: Array<Record<string, unknown>>;
    activityLogs: Array<Record<string, unknown>>;
    scanHistory: Array<Record<string, unknown>>;
    decisionHistory: Array<Record<string, unknown>>;
    notifications: Array<Record<string, unknown>>;
    salesforce: Record<string, unknown>;
  };
  financial: {
    stats: Record<string, unknown>;
    properties: Array<Record<string, unknown>>;
    vendors?: Array<Record<string, unknown>>;
    expenseCategories?: string[];
    incomeCategories?: string[];
    months?: string[];
    income: Array<Record<string, unknown>>;
    expenses: Array<Record<string, unknown>>;
  };
  crm: { contacts: Array<Record<string, unknown>> };
  forms: Record<string, unknown>;
  research: {
    notebook: Record<string, unknown>;
    feed: Record<string, unknown>;
    sources: Array<Record<string, unknown>>;
    config: Record<string, unknown>;
  };
  rfp: { sections: Array<Record<string, unknown>> };
};

const mockData = rawMockData as MockDataRoot;

/** Read-only access to the centralized mock JSON. Do not import JSON from UI components. */
export function getMockData(): MockDataRoot {
  return mockData;
}

export function findMockAuthUser(email: string, password: string): MockAuthUser | null {
  const normalized = email.trim().toLowerCase();
  return (
    mockData.auth.users.find(
      (user) => user.email.toLowerCase() === normalized && user.password === password
    ) ?? null
  );
}

export function findMockAuthUserByToken(token: string): MockAuthUser | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  return mockData.auth.users.find((user) => user.token === trimmed) ?? null;
}
