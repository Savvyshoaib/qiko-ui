/**
 * Runtime mock mutations (created workers, etc.).
 * Stored in localStorage so QA can create/edit workers across reloads
 * without duplicating the full mock-data.json catalog.
 */
const RUNTIME_KEY = "qiko_mock_runtime_v1";

export type MockRuntimeAgent = Record<string, unknown> & {
  id: string;
  agent_unique_id: string;
  agent_name?: string;
  status?: string;
  studio_linked?: boolean;
  industry?: string;
  specialization?: string;
  template?: string;
};

type MockRuntimeState = {
  agents: MockRuntimeAgent[];
};

function readRuntime(): MockRuntimeState {
  if (typeof window === "undefined") return { agents: [] };
  try {
    const raw = localStorage.getItem(RUNTIME_KEY);
    if (!raw) return { agents: [] };
    const parsed = JSON.parse(raw) as MockRuntimeState;
    return {
      agents: Array.isArray(parsed.agents) ? parsed.agents : [],
    };
  } catch {
    return { agents: [] };
  }
}

function writeRuntime(state: MockRuntimeState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RUNTIME_KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

export function getRuntimeAgents(): MockRuntimeAgent[] {
  return readRuntime().agents;
}

export function upsertRuntimeAgent(agent: MockRuntimeAgent): MockRuntimeAgent {
  const state = readRuntime();
  const idx = state.agents.findIndex(
    (item) =>
      item.agent_unique_id === agent.agent_unique_id || item.id === agent.id
  );
  if (idx >= 0) {
    state.agents[idx] = { ...state.agents[idx], ...agent };
  } else {
    state.agents.unshift(agent);
  }
  writeRuntime(state);
  return agent;
}

export function patchRuntimeAgent(
  agentId: string,
  patch: Partial<MockRuntimeAgent>
): MockRuntimeAgent | null {
  const state = readRuntime();
  const idx = state.agents.findIndex(
    (item) => item.agent_unique_id === agentId || item.id === agentId
  );
  if (idx < 0) return null;
  state.agents[idx] = { ...state.agents[idx], ...patch };
  writeRuntime(state);
  return state.agents[idx];
}

export function removeRuntimeAgent(agentId: string): boolean {
  const state = readRuntime();
  const next = state.agents.filter(
    (item) => item.agent_unique_id !== agentId && item.id !== agentId
  );
  if (next.length === state.agents.length) return false;
  writeRuntime({ agents: next });
  return true;
}

export function clearMockRuntime(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RUNTIME_KEY);
}
