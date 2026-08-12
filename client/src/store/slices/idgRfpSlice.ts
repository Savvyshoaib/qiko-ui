import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getRfpFileById, getRfpFiles, parseRfpPackById, type IDGRfpFile } from "@/lib/IDGApi";
import type { RootState } from "@/store/index";

/** True when RTK skipped the thunk via `condition` (not a real API failure). */
export function isIdgRfpThunkSkipped(result: { meta?: { condition?: boolean } }): boolean {
  return result.meta?.condition === true;
}

/** Poll interval while RFP files are still processing (evaluate). */
export const IDG_RFP_FILES_POLL_INTERVAL_MS = 30_000;

export const IDG_RFP_PACK_POLL_INTERVAL_MS = 30_000;

export function rfpFilesNeedEvaluationPoll(files: IDGRfpFile[]): boolean {
  if (files.length === 0) return false;
  return files.some((file) => file.is_evaluated !== 1);
}

export function rfpFilesAllEvaluated(files: IDGRfpFile[]): boolean {
  return files.length > 0 && files.every((file) => file.is_evaluated === 1);
}

export function rfpPackNeedsSectionPoll(file: IDGRfpFile | null | undefined): boolean {
  if (!file) return true;
  const sections = file.sections ?? [];
  const expectedCount = file.section_counts ?? 0;
  if (sections.length === 0) return true;
  if (expectedCount > 0 && sections.length < expectedCount) return true;
  return false;
}

/** Evaluated packs that still need pack-by-id sync (once per pack_id). */
export type PackByIdSyncJob = {
  packId: string;
  fileId: string;
  isNewEvaluatedFile: boolean;
};

/** Next pack-by-id job: newly evaluated files first, then section polling. */
export function getNextPackByIdSyncJob(
  files: IDGRfpFile[],
  state: RootState,
  agentId: string
): PackByIdSyncJob | null {
  const synced = new Set(state.idgRfp.evaluatedPackSyncedFileIds[agentId] ?? []);

  for (const file of files) {
    if (file.is_evaluated !== 1) continue;

    const packId = file.pack_id?.trim();
    const fileId = file.file_id?.trim();
    if (!packId || !fileId || synced.has(fileId)) continue;

    const packEntry = findApiPackByIdEntry(state.idgRfp, packId);
    if (packEntry?.fetching) continue;

    return { packId, fileId, isNewEvaluatedFile: true };
  }

  const seenPackIds = new Set<string>();
  for (const file of files) {
    if (file.is_evaluated !== 1) continue;

    const packId = file.pack_id?.trim();
    const fileId = file.file_id?.trim();
    if (!packId || !fileId || seenPackIds.has(packId)) continue;

    seenPackIds.add(packId);

    const packEntry = findApiPackByIdEntry(state.idgRfp, packId);
    if (packEntry?.fetching) continue;
    if (!packEntry?.loaded || rfpPackNeedsSectionPoll(packEntry.file)) {
      return { packId, fileId, isNewEvaluatedFile: false };
    }
  }

  return null;
}

export function hasPendingPackByIdSync(
  files: IDGRfpFile[],
  state: RootState,
  agentId: string
): boolean {
  return getNextPackByIdSyncJob(files, state, agentId) !== null;
}

const packSyncInFlightByAgent = new Set<string>();

export const syncEvaluatedRfpFilesAndPacks = createAsyncThunk(
  "idgRfp/syncEvaluatedFilesAndPacks",
  async ({ agentId }: { agentId: string }, { dispatch, getState }) => {
    const trimmedAgentId = agentId.trim();
    if (!trimmedAgentId || packSyncInFlightByAgent.has(trimmedAgentId)) return;

    packSyncInFlightByAgent.add(trimmedAgentId);
    try {
      for (;;) {
        const state = getState() as RootState;
        const files = state.idgRfp.filesByAgentId[trimmedAgentId]?.files ?? [];
        const job = getNextPackByIdSyncJob(files, state, trimmedAgentId);
        if (!job) break;

        await dispatch(
          parseIdgRfpPack({
            packId: job.packId,
            fileId: job.fileId,
            silent: true,
            force: job.isNewEvaluatedFile,
          })
        );

        if (job.isNewEvaluatedFile) {
          dispatch(markEvaluatedFilePackSynced({ agentId: trimmedAgentId, fileId: job.fileId }));

          const stateAfterMark = getState() as RootState;
          const currentFiles = stateAfterMark.idgRfp.filesByAgentId[trimmedAgentId]?.files ?? [];
          if (rfpFilesNeedEvaluationPoll(currentFiles)) {
            await dispatch(fetchIdgRfpFiles({ agentId: trimmedAgentId, force: true, silent: true }));
          }

          continue;
        }

        break;
      }
    } finally {
      packSyncInFlightByAgent.delete(trimmedAgentId);
    }
  }
);

export const fetchIdgRfpFiles = createAsyncThunk(
  "idgRfp/fetchFiles",
  async ({ agentId }: { agentId: string; force?: boolean; silent?: boolean }) => {
    const response = await getRfpFiles(agentId);
    return {
      agentId,
      files: response.data.files,
      totalFiles: response.data.total_files,
    };
  },
  {
    condition: ({ agentId, force, silent }, { getState }) => {
      const entry = (getState() as RootState).idgRfp.filesByAgentId[agentId];
      if (entry?.fetching && !force) return false;
      if (force || silent) return true;
      if (entry?.loaded) return false;
      return true;
    },
  }
);

export const fetchIdgRfpFileById = createAsyncThunk(
  "idgRfp/fetchFileById",
  async ({ fileId }: { fileId: string }) => {
    const response = await getRfpFileById(fileId);
    return {
      fileId,
      file: response.data,
    };
  },
  {
    condition: ({ fileId }, { getState }) => {
      const entry = (getState() as RootState).idgRfp.fileById[fileId];
      if (entry?.loading) return false;
      return true;
    },
  }
);

export const parseIdgRfpPack = createAsyncThunk(
  "idgRfp/parsePack",
  async ({
    packId,
    fileId,
  }: {
    packId: string;
    fileId: string;
    silent?: boolean;
    force?: boolean;
  }) => {
    const response = await parseRfpPackById(packId, fileId);
    return {
      packId: packId.trim(),
      fileId,
      file: response.data,
    };
  },
  {
    condition: ({ packId, fileId, silent, force }, { getState }) => {
      const state = (getState() as RootState).idgRfp;
      const packEntry = findApiPackByIdEntry(state, packId);
      const fileEntry = state.fileById[fileId];
      if (packEntry?.fetching || fileEntry?.fetching) return false;
      if (force) return true;
      if (silent) return true;
      if (packEntry?.loaded && packEntry.file && !rfpPackNeedsSectionPoll(packEntry.file)) {
        return false;
      }
      return true;
    },
  }
);

export interface ApiPackByIdCacheEntry {
  packId: string;
  file: IDGRfpFile | null;
  fetching: boolean;
  loaded: boolean;
  error: string | null;
  lastFetchedAt: string | null;
}

interface AgentRfpFilesEntry {
  files: IDGRfpFile[];
  totalFiles: number;
  loading: boolean;
  fetching: boolean;
  loaded: boolean;
  error: string | null;
  lastFetchedAt: string | null;
}

interface RfpFileByIdEntry {
  file: IDGRfpFile | null;
  loading: boolean;
  fetching: boolean;
  loaded: boolean;
  error: string | null;
  lastFetchedAt: string | null;
}

interface IdgRfpState {
  filesByAgentId: Record<string, AgentRfpFilesEntry>;
  fileById: Record<string, RfpFileByIdEntry>;
  apiPackById: ApiPackByIdCacheEntry[];
  /** file_ids for which pack-by-id ran after is_evaluated became 1 */
  evaluatedPackSyncedFileIds: Record<string, string[]>;
}

const initialState: IdgRfpState = {
  filesByAgentId: {},
  fileById: {},
  apiPackById: [],
  evaluatedPackSyncedFileIds: {},
};

function findApiPackByIdEntry(
  state: IdgRfpState,
  packId: string
): ApiPackByIdCacheEntry | undefined {
  const trimmedPackId = packId?.trim();
  if (!trimmedPackId) return undefined;
  return state.apiPackById.find((entry) => entry.packId === trimmedPackId);
}

function upsertApiPackByIdEntry(
  state: IdgRfpState,
  packId: string,
  patch: Partial<ApiPackByIdCacheEntry>
): ApiPackByIdCacheEntry {
  const trimmedPackId = packId?.trim();
  const existing = findApiPackByIdEntry(state, trimmedPackId);
  if (existing) {
    Object.assign(existing, patch);
    return existing;
  }

  const entry: ApiPackByIdCacheEntry = {
    packId: trimmedPackId,
    file: null,
    fetching: false,
    loaded: false,
    error: null,
    lastFetchedAt: null,
    ...patch,
  };
  state.apiPackById.push(entry);
  return entry;
}

export function selectApiPackByIdEntry(
  state: RootState,
  packId: string
): ApiPackByIdCacheEntry | undefined {
  return findApiPackByIdEntry(state.idgRfp, packId);
}

export function selectApiPackByIdFile(state: RootState, packId: string): IDGRfpFile | null {
  return findApiPackByIdEntry(state.idgRfp, packId)?.file ?? null;
}

/** Prefer pack-by-id cache; fall back to file-by-id entry. */
export function selectRfpPackFile(
  state: RootState,
  packId: string,
  fileId: string
): IDGRfpFile | null {
  const packFile = selectApiPackByIdFile(state, packId);
  if (packFile) return packFile;
  return state.idgRfp.fileById[fileId]?.file ?? null;
}

function getOrCreateEntry(state: IdgRfpState, agentId: string): AgentRfpFilesEntry {
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

function getOrCreateFileByIdEntry(state: IdgRfpState, fileId: string): RfpFileByIdEntry {
  if (!state.fileById[fileId]) {
    state.fileById[fileId] = {
      file: null,
      loading: false,
      fetching: false,
      loaded: false,
      error: null,
      lastFetchedAt: null,
    };
  }
  return state.fileById[fileId];
}

const idgRfpSlice = createSlice({
  name: "idgRfp",
  initialState,
  reducers: {
    setIdgRfpFilesLoading: (state, action: PayloadAction<{ agentId: string; loading: boolean }>) => {
      const entry = getOrCreateEntry(state, action.payload.agentId);
      entry.loading = action.payload.loading;
      if (action.payload.loading) {
        entry.error = null;
      }
    },
    setIdgRfpFilesSuccess: (
      state,
      action: PayloadAction<{
        agentId: string;
        files: IDGRfpFile[];
        totalFiles: number;
      }>
    ) => {
      const entry = getOrCreateEntry(state, action.payload.agentId);
      entry.files = action.payload.files ?? [];
      entry.totalFiles = action.payload.totalFiles ?? entry.files.length;
      entry.loading = false;
      entry.loaded = true;
      entry.error = null;
      entry.lastFetchedAt = new Date().toISOString();
    },
    setIdgRfpFilesError: (state, action: PayloadAction<{ agentId: string; error: string | null }>) => {
      const entry = getOrCreateEntry(state, action.payload.agentId);
      entry.error = action.payload.error;
      entry.loading = false;
    },
    removeIdgRfpFileFromCache: (state, action: PayloadAction<{ agentId: string; fileId: string }>) => {
      const { agentId, fileId } = action.payload;
      const entry = getOrCreateEntry(state, agentId);
      const before = entry.files.length;
      entry.files = entry.files.filter((file) => file.file_id !== fileId);
      if (entry.files.length !== before) {
        entry.totalFiles = entry.files.length;
      }
      const synced = state.evaluatedPackSyncedFileIds[agentId];
      if (synced) {
        state.evaluatedPackSyncedFileIds[agentId] = synced.filter((id) => id !== fileId);
      }
      delete state.fileById[fileId];
    },
    removeIdgRfpPackFromCache: (state, action: PayloadAction<{ agentId: string; packId: string }>) => {
      const { agentId, packId } = action.payload;
      const entry = getOrCreateEntry(state, agentId);
      const removedFileIds = entry.files
        .filter((file) => file.pack_id === packId)
        .map((file) => file.file_id)
        .filter(Boolean);
      const before = entry.files.length;
      entry.files = entry.files.filter((file) => file.pack_id !== packId);
      if (entry.files.length !== before) {
        entry.totalFiles = entry.files.length;
      }
      const trimmedPackId = packId?.trim();
      if (trimmedPackId) {
        state.apiPackById = state.apiPackById.filter((item) => item.packId !== trimmedPackId);
      }
      if (removedFileIds.length > 0) {
        const removedSet = new Set(removedFileIds);
        const synced = state.evaluatedPackSyncedFileIds[agentId];
        if (synced) {
          state.evaluatedPackSyncedFileIds[agentId] = synced.filter((id) => !removedSet.has(id));
        }
        for (const removedFileId of removedFileIds) {
          delete state.fileById[removedFileId];
        }
      }
    },
    resetIdgRfpAgent: (state, action: PayloadAction<{ agentId: string }>) => {
      delete state.filesByAgentId[action.payload.agentId];
      delete state.evaluatedPackSyncedFileIds[action.payload.agentId];
    },
    markEvaluatedFilePackSynced: (
      state,
      action: PayloadAction<{ agentId: string; fileId: string }>
    ) => {
      const { agentId, fileId } = action.payload;
      const trimmedFileId = fileId.trim();
      if (!trimmedFileId) return;

      const existing = state.evaluatedPackSyncedFileIds[agentId] ?? [];
      if (!existing.includes(trimmedFileId)) {
        state.evaluatedPackSyncedFileIds[agentId] = [...existing, trimmedFileId];
      }
    },
    setIdgRfpFileByIdLoading: (state, action: PayloadAction<{ fileId: string; loading: boolean }>) => {
      const entry = getOrCreateFileByIdEntry(state, action.payload.fileId);
      entry.loading = action.payload.loading;
      if (action.payload.loading) {
        entry.error = null;
      }
    },
    setIdgRfpFileByIdSuccess: (
      state,
      action: PayloadAction<{
        fileId: string;
        file: IDGRfpFile;
      }>
    ) => {
      const entry = getOrCreateFileByIdEntry(state, action.payload.fileId);
      entry.file = action.payload.file;
      entry.loading = false;
      entry.loaded = true;
      entry.error = null;
      entry.lastFetchedAt = new Date().toISOString();
    },
    setIdgRfpFileByIdError: (state, action: PayloadAction<{ fileId: string; error: string | null }>) => {
      const entry = getOrCreateFileByIdEntry(state, action.payload.fileId);
      entry.error = action.payload.error;
      entry.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIdgRfpFiles.pending, (state, action) => {
        const agentId = action.meta.arg.agentId;
        const entry = getOrCreateEntry(state, agentId);
        entry.fetching = true;
        if (!action.meta.arg.silent) {
          entry.loading = true;
        }
        entry.error = null;
      })
      .addCase(fetchIdgRfpFiles.fulfilled, (state, action) => {
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
      .addCase(fetchIdgRfpFiles.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.condition) return;
        const agentId = action.meta.arg.agentId;
        const entry = getOrCreateEntry(state, agentId);
        entry.fetching = false;
        entry.loading = false;
        entry.loaded = true;
        entry.error = action.error.message || "Failed to fetch RFP files.";
      })
      .addCase(fetchIdgRfpFileById.pending, (state, action) => {
        const fileId = action.meta.arg.fileId;
        const entry = getOrCreateFileByIdEntry(state, fileId);
        entry.loading = true;
        entry.error = null;
      })
      .addCase(fetchIdgRfpFileById.fulfilled, (state, action) => {
        const { fileId, file } = action.payload;
        const entry = getOrCreateFileByIdEntry(state, fileId);
        entry.file = file;
        entry.loading = false;
        entry.loaded = true;
        entry.error = null;
        entry.lastFetchedAt = new Date().toISOString();
      })
      .addCase(fetchIdgRfpFileById.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.condition) return;
        const fileId = action.meta.arg.fileId;
        const entry = getOrCreateFileByIdEntry(state, fileId);
        entry.loading = false;
        entry.loaded = true;
        entry.error = action.error.message || "Failed to fetch RFP file.";
      })
      .addCase(parseIdgRfpPack.pending, (state, action) => {
        const { packId, fileId } = action.meta.arg;
        upsertApiPackByIdEntry(state, packId, { fetching: true, error: null });
        const entry = getOrCreateFileByIdEntry(state, fileId);
        entry.fetching = true;
        if (!action.meta.arg.silent) {
          entry.loading = true;
        }
        entry.error = null;
      })
      .addCase(parseIdgRfpPack.fulfilled, (state, action) => {
        const { packId, fileId, file } = action.payload;
        upsertApiPackByIdEntry(state, packId, {
          file,
          fetching: false,
          loaded: true,
          error: null,
          lastFetchedAt: new Date().toISOString(),
        });
        const entry = getOrCreateFileByIdEntry(state, fileId);
        entry.file = file;
        entry.fetching = false;
        entry.loading = false;
        entry.loaded = true;
        entry.error = null;
        entry.lastFetchedAt = new Date().toISOString();

        const agentId = file.agent_id?.trim();
        if (!agentId) return;

        const agentEntry = state.filesByAgentId[agentId];
        if (!agentEntry) return;

        const packFiles = file.pack_files ?? [file];
        if (packFiles.length === 0) return;

        agentEntry.files = agentEntry.files.map((listFile) => {
          const updated = packFiles.find((packFile) => packFile.file_id === listFile.file_id);
          if (!updated) return listFile;

          return {
            ...listFile,
            title: updated.title ?? listFile.title,
            is_evaluated: updated.is_evaluated ?? listFile.is_evaluated,
            section_counts: updated.section_counts ?? listFile.section_counts,
            status: updated.status ?? listFile.status,
            is_ai_answered: updated.is_ai_answered ?? listFile.is_ai_answered,
            is_evaluated_status: updated.is_evaluated_status ?? listFile.is_evaluated_status,
            is_ai_answered_status: updated.is_ai_answered_status ?? listFile.is_ai_answered_status,
          };
        });
      })
      .addCase(parseIdgRfpPack.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.condition) return;
        const { packId, fileId } = action.meta.arg;
        const errorMessage = action.error.message || "Failed to parse RFP document.";
        upsertApiPackByIdEntry(state, packId, {
          fetching: false,
          loaded: true,
          error: errorMessage,
        });
        const entry = getOrCreateFileByIdEntry(state, fileId);
        entry.fetching = false;
        entry.loading = false;
        entry.loaded = true;
        entry.error = errorMessage;
      });
  },
});

export const {
  setIdgRfpFilesLoading,
  setIdgRfpFilesSuccess,
  setIdgRfpFilesError,
  removeIdgRfpFileFromCache,
  removeIdgRfpPackFromCache,
  resetIdgRfpAgent,
  markEvaluatedFilePackSynced,
  setIdgRfpFileByIdLoading,
  setIdgRfpFileByIdSuccess,
  setIdgRfpFileByIdError,
} = idgRfpSlice.actions;

export default idgRfpSlice.reducer;
