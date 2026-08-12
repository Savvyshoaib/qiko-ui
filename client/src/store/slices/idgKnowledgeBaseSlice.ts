import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getKnowledgeBaseFiles, type IDGKnowledgeBaseFile } from "@/lib/IDGApi";
import type { RootState } from "@/store/index";

export const IDG_KB_FILES_POLL_INTERVAL_MS = 30_000;

export function kbFilesNeedEvaluationPoll(files: IDGKnowledgeBaseFile[]): boolean {
  return files.some((file) => file.is_evaluated !== 1);
}

export const fetchIdgKnowledgeBaseFiles = createAsyncThunk(
  "idgKnowledgeBase/fetchFiles",
  async ({ agentId }: { agentId: string; force?: boolean; silent?: boolean }) => {
    const response = await getKnowledgeBaseFiles(agentId);
    return {
      agentId,
      files: response.data.files,
      totalFiles: response.data.total_files,
    };
  },
  {
    condition: ({ agentId, force, silent }, { getState }) => {
      const entry = (getState() as RootState).idgKnowledgeBase.filesByAgentId[agentId];
      if (entry?.fetching) return false;
      if (silent) return true;
      if (!force && entry?.loaded) return false;
      return true;
    },
  }
);

interface AgentKnowledgeBaseFilesEntry {
  files: IDGKnowledgeBaseFile[];
  totalFiles: number;
  loading: boolean;
  fetching: boolean;
  loaded: boolean;
  error: string | null;
  lastFetchedAt: string | null;
}

interface IdgKnowledgeBaseState {
  filesByAgentId: Record<string, AgentKnowledgeBaseFilesEntry>;
}

const initialState: IdgKnowledgeBaseState = {
  filesByAgentId: {},
};

function getOrCreateEntry(state: IdgKnowledgeBaseState, agentId: string): AgentKnowledgeBaseFilesEntry {
  if (!state.filesByAgentId[agentId]) {
    state.filesByAgentId[agentId] = {
      files: [],
      totalFiles: 0,
      loading: false,
      fetching: false,
      loaded: false,
      error: null,
      lastFetchedAt: null,
    };
  }
  return state.filesByAgentId[agentId];
}

const idgKnowledgeBaseSlice = createSlice({
  name: "idgKnowledgeBase",
  initialState,
  reducers: {
    resetIdgKnowledgeBaseAgent: (state, action: { payload: { agentId: string } }) => {
      delete state.filesByAgentId[action.payload.agentId];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIdgKnowledgeBaseFiles.pending, (state, action) => {
        const agentId = action.meta.arg.agentId;
        const entry = getOrCreateEntry(state, agentId);
        entry.fetching = true;
        if (!action.meta.arg.silent) {
          entry.loading = true;
        }
        entry.error = null;
      })
      .addCase(fetchIdgKnowledgeBaseFiles.fulfilled, (state, action) => {
        const { agentId, files, totalFiles } = action.payload;
        const entry = getOrCreateEntry(state, agentId);
        entry.files = files ?? [];
        entry.totalFiles = totalFiles ?? entry.files.length;
        entry.fetching = false;
        entry.loading = false;
        entry.loaded = true;
        entry.error = null;
        entry.lastFetchedAt = new Date().toISOString();
      })
      .addCase(fetchIdgKnowledgeBaseFiles.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.condition) return;
        const agentId = action.meta.arg.agentId;
        const entry = getOrCreateEntry(state, agentId);
        entry.fetching = false;
        entry.loading = false;
        entry.loaded = true;
        entry.error = action.error.message || "Failed to fetch knowledge base files.";
      });
  },
});

export const { resetIdgKnowledgeBaseAgent } = idgKnowledgeBaseSlice.actions;
export default idgKnowledgeBaseSlice.reducer;
