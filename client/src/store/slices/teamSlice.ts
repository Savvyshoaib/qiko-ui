import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getAllMembersIncludeOwner, type TeamMemberApiItem } from "@/lib/TeamApi";
import type { RootState } from "@/store/index";

export const fetchTeamMembers = createAsyncThunk(
  "team/fetchMembers",
  async ({ force: _force }: { force?: boolean } = {}) => {
    const response = await getAllMembersIncludeOwner();
    const members = response.data?.members ?? [];
    return members.filter((member) => member.status?.toLowerCase() === "active");
  },
  {
    condition: ({ force }, { getState }) => {
      if (force) return true;
      const state = (getState() as RootState).team;
      if (state.loading) return false;
      if (state.loaded) return false;
      return true;
    },
  }
);

interface TeamState {
  members: TeamMemberApiItem[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  lastFetchedAt: string | null;
}

const initialState: TeamState = {
  members: [],
  loading: false,
  loaded: false,
  error: null,
  lastFetchedAt: null,
};

const teamSlice = createSlice({
  name: "team",
  initialState,
  reducers: {
    setTeamMembers: (state, action: PayloadAction<TeamMemberApiItem[]>) => {
      state.members = action.payload;
      state.loaded = true;
      state.error = null;
    },
    addTeamMember: (state, action: PayloadAction<TeamMemberApiItem>) => {
      const idx = state.members.findIndex((member) => member.id === action.payload.id);
      if (idx >= 0) {
        state.members[idx] = action.payload;
        return;
      }
      state.members.unshift(action.payload);
    },
    updateTeamMemberRole: (
      state,
      action: PayloadAction<{ id: number; role: TeamMemberApiItem["role"] }>
    ) => {
      const member = state.members.find((item) => item.id === action.payload.id);
      if (member) member.role = action.payload.role;
    },
    updateTeamMemberInviteStatus: (
      state,
      action: PayloadAction<{ id: number; invite_status: TeamMemberApiItem["invite_status"] }>
    ) => {
      const member = state.members.find((item) => item.id === action.payload.id);
      if (member) member.invite_status = action.payload.invite_status;
    },
    removeTeamMember: (state, action: PayloadAction<number>) => {
      state.members = state.members.filter((member) => member.id !== action.payload);
    },
    clearTeamMembers: (state) => {
      state.members = [];
      state.loaded = false;
      state.error = null;
      state.lastFetchedAt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.members = action.payload;
        state.loading = false;
        state.loaded = true;
        state.error = null;
        state.lastFetchedAt = new Date().toISOString();
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.condition) return;
        state.loading = false;
        state.loaded = true;
        state.error = action.error.message || "Failed to fetch team members.";
      });
  },
});

export const {
  setTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  updateTeamMemberInviteStatus,
  removeTeamMember,
  clearTeamMembers,
} = teamSlice.actions;
export default teamSlice.reducer;
