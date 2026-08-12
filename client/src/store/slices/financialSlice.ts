import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { FinancialStorageState } from "@/features/financial/financialTypes";
import type { ELUserFinanceFile } from "@/lib/ELApi";

interface WorkerFinancialEntry {
  current: FinancialStorageState | null;
  history: FinancialStorageState[];
  loading: boolean;
  error: string | null;
}

interface FinancialState {
  byWorkerId: Record<string, WorkerFinancialEntry>;
  filesByWorkerId: Record<
    string,
    {
      files: ELUserFinanceFile[];
      totalFiles: number;
      totalRows: number;
      loading: boolean;
      loaded: boolean;
      error: string | null;
      lastFetchedAt: string | null;
    }
  >;
}

const initialState: FinancialState = {
  byWorkerId: {},
  filesByWorkerId: {},
};

function getOrCreateFilesEntry(state: FinancialState, workerId: string) {
  if (!state.filesByWorkerId[workerId]) {
    state.filesByWorkerId[workerId] = {
      files: [],
      totalFiles: 0,
      totalRows: 0,
      loading: false,
      loaded: false,
      error: null,
      lastFetchedAt: null,
    };
  }
  return state.filesByWorkerId[workerId];
}

function getOrCreateEntry(state: FinancialState, workerId: string): WorkerFinancialEntry {
  if (!state.byWorkerId[workerId]) {
    state.byWorkerId[workerId] = {
      current: null,
      history: [],
      loading: false,
      error: null,
    };
  }
  return state.byWorkerId[workerId];
}

const financialSlice = createSlice({
  name: "financial",
  initialState,
  reducers: {
    hydrateFinancialWorker: (
      state,
      action: PayloadAction<{ workerId: string; current: FinancialStorageState | null; history: FinancialStorageState[] }>
    ) => {
      const { workerId, current, history } = action.payload;
      state.byWorkerId[workerId] = {
        current,
        history: history ?? [],
        loading: false,
        error: null,
      };
    },
    setFinancialProcessing: (state, action: PayloadAction<{ workerId: string; loading: boolean }>) => {
      const entry = getOrCreateEntry(state, action.payload.workerId);
      entry.loading = action.payload.loading;
      if (action.payload.loading) {
        entry.error = null;
      }
    },
    setFinancialError: (state, action: PayloadAction<{ workerId: string; error: string | null }>) => {
      const entry = getOrCreateEntry(state, action.payload.workerId);
      entry.error = action.payload.error;
      entry.loading = false;
    },
    upsertFinancialSuccess: (
      state,
      action: PayloadAction<{ workerId: string; next: FinancialStorageState }>
    ) => {
      const { workerId, next } = action.payload;
      const entry = getOrCreateEntry(state, workerId);
      if (entry.current) {
        entry.history = [entry.current, ...entry.history];
      }
      entry.current = next;
      entry.loading = false;
      entry.error = null;
    },
    setFinanceFilesLoading: (state, action: PayloadAction<{ workerId: string; loading: boolean }>) => {
      const entry = getOrCreateFilesEntry(state, action.payload.workerId);
      entry.loading = action.payload.loading;
      if (action.payload.loading) {
        entry.error = null;
      }
    },
    setFinanceFilesSuccess: (
      state,
      action: PayloadAction<{
        workerId: string;
        files: ELUserFinanceFile[];
        totalFiles: number;
        totalRows: number;
      }>
    ) => {
      const entry = getOrCreateFilesEntry(state, action.payload.workerId);
      entry.files = action.payload.files ?? [];
      entry.totalFiles = action.payload.totalFiles ?? entry.files.length;
      entry.totalRows = action.payload.totalRows ?? 0;
      entry.loading = false;
      entry.loaded = true;
      entry.error = null;
      entry.lastFetchedAt = new Date().toISOString();
    },
    setFinanceFilesError: (state, action: PayloadAction<{ workerId: string; error: string | null }>) => {
      const entry = getOrCreateFilesEntry(state, action.payload.workerId);
      entry.error = action.payload.error;
      entry.loading = false;
    },
    removeFinanceFileFromCache: (state, action: PayloadAction<{ workerId: string; namespace: string }>) => {
      const entry = getOrCreateFilesEntry(state, action.payload.workerId);
      const before = entry.files.length;
      entry.files = entry.files.filter((file) => file.namespace !== action.payload.namespace);
      if (entry.files.length !== before) {
        entry.totalFiles = entry.files.length;
        entry.totalRows = entry.files.reduce((sum, file) => sum + (Number(file.rowCount) || 0), 0);
      }
    },
  },
});

export const {
  hydrateFinancialWorker,
  setFinancialProcessing,
  setFinancialError,
  upsertFinancialSuccess,
  setFinanceFilesLoading,
  setFinanceFilesSuccess,
  setFinanceFilesError,
  removeFinanceFileFromCache,
} = financialSlice.actions;

export default financialSlice.reducer;
