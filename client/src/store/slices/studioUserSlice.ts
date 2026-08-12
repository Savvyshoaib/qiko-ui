import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAvatarStudioUser, type AvatarStudioUserResponse } from "@/lib/avatarApi";
import { clearAuth } from "./authSlice";

interface StudioUserState {
  data: AvatarStudioUserResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: StudioUserState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchStudioUser = createAsyncThunk(
  "studioUser/fetchStudioUser",
  async (_, { rejectWithValue }) => {
    try {
      return await getAvatarStudioUser();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Failed to fetch studio user");
    }
  }
);

const studioUserSlice = createSlice({
  name: "studioUser",
  initialState,
  reducers: {
    clearStudioUser: (state) => {
      state.data = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudioUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudioUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchStudioUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || "Failed to fetch studio user";
      })
      .addCase(clearAuth, (state) => {
        state.data = null;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearStudioUser } = studioUserSlice.actions;
export default studioUserSlice.reducer;
