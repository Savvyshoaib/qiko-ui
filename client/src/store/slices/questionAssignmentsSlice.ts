import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getQuestionAssignments,
  type QuestionAssignmentItem,
} from "@/lib/TeamApi";
import type { RootState } from "@/store/index";

export const fetchQuestionAssignments = createAsyncThunk(
  "questionAssignments/fetch",
  async ({ force: _force }: { force?: boolean } = {}) => {
    const response = await getQuestionAssignments();
    return response.data?.assignments ?? {};
  },
  {
    condition: ({ force }, { getState }) => {
      if (force) return true;
      const state = (getState() as RootState).questionAssignments;
      if (state.loading) return false;
      if (state.loaded) return false;
      return true;
    },
  }
);

export interface SectionAssignmentSummary {
  sectionId?: string;
  assigneeUserId: number;
  assigneeName: string;
  dueAt: string;
  dueDate: string;
}

interface QuestionAssignmentsState {
  assignmentsBySectionId: Record<string, QuestionAssignmentItem[]>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  lastFetchedAt: string | null;
}

const initialState: QuestionAssignmentsState = {
  assignmentsBySectionId: {},
  loading: false,
  loaded: false,
  error: null,
  lastFetchedAt: null,
};

function summaryFromAssignmentItem(item: QuestionAssignmentItem): SectionAssignmentSummary | null {
  const assigneeName = item.assignee?.user_name?.trim();
  if (!assigneeName) return null;

  const dueAt = item.due_at ?? "";
  return {
    sectionId: item.section_id != null ? String(item.section_id) : undefined,
    assigneeUserId: item.assignee.id,
    assigneeName,
    dueAt,
    dueDate: dueAt ? dueAt.slice(0, 10) : "",
  };
}

export function getSectionAssignmentSummary(
  assignmentsBySectionId: Record<string, QuestionAssignmentItem[]>,
  sectionId?: string | number | null
): SectionAssignmentSummary | null {
  if (sectionId == null || sectionId === "") return null;

  const items = assignmentsBySectionId[String(sectionId)];
  if (!items?.length) return null;

  return summaryFromAssignmentItem(items[0]);
}

export function getAssignedPackIdsForEmail(
  assignmentsBySectionId: Record<string, QuestionAssignmentItem[]>,
  email: string
): Set<string> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return new Set();

  const packIds = new Set<string>();

  for (const items of Object.values(assignmentsBySectionId)) {
    for (const item of items) {
      const assigneeEmail = item.assignee?.email?.trim().toLowerCase();
      if (!assigneeEmail || assigneeEmail !== normalizedEmail) continue;

      const packId = String(item.pack_id ?? "").trim();
      if (packId) packIds.add(packId);
    }
  }

  return packIds;
}

function filterOutAssignmentsForPackId(
  assignmentsBySectionId: Record<string, QuestionAssignmentItem[]>,
  packId: string
): Record<string, QuestionAssignmentItem[]> {
  const normalizedPackId = packId.trim();
  if (!normalizedPackId) return assignmentsBySectionId;

  const next: Record<string, QuestionAssignmentItem[]> = {};

  for (const [sectionId, items] of Object.entries(assignmentsBySectionId)) {
    const filteredItems = items.filter(
      (item) => String(item.pack_id ?? "").trim() !== normalizedPackId
    );
    if (filteredItems.length > 0) {
      next[sectionId] = filteredItems;
    }
  }

  return next;
}

const questionAssignmentsSlice = createSlice({
  name: "questionAssignments",
  initialState,
  reducers: {
    resetQuestionAssignments: () => initialState,
    removeQuestionAssignmentsByPackId: (state, action: { payload: string }) => {
      state.assignmentsBySectionId = filterOutAssignmentsForPackId(
        state.assignmentsBySectionId,
        action.payload
      );
    },
    removeQuestionAssignmentsBySectionId: (state, action: { payload: string }) => {
      const sectionId = action.payload.trim();
      if (!sectionId) return;

      const next = { ...state.assignmentsBySectionId };
      delete next[sectionId];
      state.assignmentsBySectionId = next;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestionAssignments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestionAssignments.fulfilled, (state, action) => {
        state.assignmentsBySectionId = action.payload;
        state.loading = false;
        state.loaded = true;
        state.error = null;
        state.lastFetchedAt = new Date().toISOString();
      })
      .addCase(fetchQuestionAssignments.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.condition) return;
        state.loading = false;
        state.loaded = true;
        state.error = action.error.message || "Failed to fetch question assignments.";
      });
  },
});

export const { resetQuestionAssignments, removeQuestionAssignmentsByPackId, removeQuestionAssignmentsBySectionId } =
  questionAssignmentsSlice.actions;
export default questionAssignmentsSlice.reducer;
