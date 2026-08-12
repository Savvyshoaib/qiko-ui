export type StoredRfpWorkflowStage = "upload" | "parsed" | "assigned" | "drafting" | "review";

export interface RfpWorkflowPersistedState {
  stage: StoredRfpWorkflowStage;
  maxReachedIndex: number;
  fileCount: number;
  uploaded: boolean;
}

const STORAGE_KEY_PREFIX = "qiko_rfp_workflow:";

function getStorageKey(agentId: string, packId: string): string {
  return `${STORAGE_KEY_PREFIX}${agentId.trim()}:${packId.trim()}`;
}

export function loadRfpWorkflowState(
  agentId: string,
  packId: string
): RfpWorkflowPersistedState | null {
  const trimmedAgentId = agentId?.trim();
  const trimmedPackId = packId?.trim();
  if (!trimmedAgentId || !trimmedPackId) return null;

  try {
    const raw = localStorage.getItem(getStorageKey(trimmedAgentId, trimmedPackId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RfpWorkflowPersistedState;
    if (!parsed?.stage || typeof parsed.maxReachedIndex !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRfpWorkflowState(
  agentId: string,
  packId: string,
  state: RfpWorkflowPersistedState
): void {
  const trimmedAgentId = agentId?.trim();
  const trimmedPackId = packId?.trim();
  if (!trimmedAgentId || !trimmedPackId) return;

  localStorage.setItem(getStorageKey(trimmedAgentId, trimmedPackId), JSON.stringify(state));
}

export function clearRfpWorkflowState(agentId: string, packId: string): void {
  const trimmedAgentId = agentId?.trim();
  const trimmedPackId = packId?.trim();
  if (!trimmedAgentId || !trimmedPackId) return;

  localStorage.removeItem(getStorageKey(trimmedAgentId, trimmedPackId));
}

export function resolveRfpWorkflowEntry(
  agentId: string,
  packId: string,
  currentFileCount: number
): RfpWorkflowPersistedState {
  const saved = loadRfpWorkflowState(agentId, packId);
  const hasUploadedFiles = currentFileCount > 0;

  if (!saved || saved.fileCount !== currentFileCount) {
    return {
      stage: "upload",
      maxReachedIndex: 0,
      fileCount: currentFileCount,
      uploaded: hasUploadedFiles,
    };
  }

  return {
    stage: saved.stage,
    maxReachedIndex: saved.maxReachedIndex,
    fileCount: currentFileCount,
    uploaded: saved.uploaded || hasUploadedFiles,
  };
}
