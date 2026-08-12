import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getAvatarUserContext } from "@/lib/avatarApi";

/** Nested `data` from `GET .../user/context` (not the envelope: success, message, paging, etc.). */
export interface UserContextData {
  user?: {
    id?: string;
    email?: string;
    [key: string]: unknown;
  };
  feature?: {
    studio?: { can_access?: boolean; [key: string]: unknown };
    team?: {
      enabled?: boolean;
      role?: string;
      permissions?: {
        can_manage_team?: boolean;
        can_edit_workers?: boolean;
        can_view_billing?: boolean;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function extractUserContextData(raw: unknown): UserContextData | null {
  if (raw == null || typeof raw !== "object") return null;
  const envelope = raw as Record<string, unknown>;
  const inner = envelope.data;
  if (inner != null && typeof inner === "object") {
    return inner as UserContextData;
  }
  return null;
}

export const fetchUserContext = createAsyncThunk(
  "userContext/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const raw = await getAvatarUserContext();
      return extractUserContextData(raw);
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : "Failed to load user context"
      );
    }
  }
);

export interface UserContextState {
  /** Only the API `data` object (`user`, `feature`, …). */
  data: UserContextData | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: UserContextState = {
  data: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

const userContextSlice = createSlice({
  name: "userContext",
  initialState,
  reducers: {
    clearUserContext: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserContext.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserContext.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchUserContext.rejected, (state, action) => {
        state.loading = false;
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : action.error.message ?? "Failed to load user context";
      });
  },
});

export const { clearUserContext } = userContextSlice.actions;
export default userContextSlice.reducer;
