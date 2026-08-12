import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getAgentGmailConfig,
  saveAgentGmailConfig as saveAgentGmailConfigApi,
  updateGmailCredentials,
} from '@/lib/avatarApi';

export interface GmailConfigPayload {
  gmail_email: string;
  gmail_app_password: string;
  timezone?: string;
}

export interface GmailAgentConfig {
  agent_unique_id: string;
  gmail_email: string;
  timezone: string;
  gmail_configured: boolean;
}

export interface GmailConfigState {
  gmail_email: string;
  gmail_app_password: string;
  timezone: string;
}

interface GmailState {
  configByAgent: Record<string, GmailAgentConfig>;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: GmailState = {
  configByAgent: {},
  loading: false,
  saving: false,
  error: null,
};

export const fetchAgentGmailConfig = createAsyncThunk<
  GmailAgentConfig,
  string,
  { rejectValue: string }
>('gmail/fetchAgentConfig', async (agentId, { rejectWithValue }) => {
  try {
    const response = await getAgentGmailConfig(agentId);
    const payload = (response as any)?.data ?? response;
    const agent = payload?.agent ?? payload;

    return {
      agent_unique_id: agent?.agent_unique_id ?? agentId,
      gmail_email: agent?.gmail_email ?? '',
      timezone: agent?.timezone ?? '',
      gmail_configured: Boolean(agent?.gmail_configured),
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to load Gmail config');
  }
});

export const saveGmailConfig = createAsyncThunk<
  GmailAgentConfig,
  { agentId?: string; payload: GmailConfigPayload },
  { rejectValue: string }
>('gmail/saveGmailConfig', async ({ agentId, payload }, { rejectWithValue }) => {
  try {
    if (agentId) {
      const response = await saveAgentGmailConfigApi(agentId, payload);
      const responsePayload = (response as any)?.data ?? response;
      const agent = responsePayload?.agent ?? responsePayload;

      return {
        agent_unique_id: agent?.agent_unique_id ?? agentId,
        gmail_email: agent?.gmail_email ?? payload.gmail_email,
        timezone: agent?.timezone ?? payload.timezone ?? '',
        gmail_configured: agent?.gmail_configured ?? true,
      };
    }

    await updateGmailCredentials(payload);
    return {
      agent_unique_id: 'user',
      gmail_email: payload.gmail_email,
      timezone: payload.timezone ?? '',
      gmail_configured: true,
    };
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to save Gmail settings');
  }
});

const gmailSlice = createSlice({
  name: 'gmail',
  initialState,
  reducers: {
    clearGmailError: (state) => {
      state.error = null;
    },
    setGmailConfig: (state, action: PayloadAction<GmailAgentConfig>) => {
      state.configByAgent[action.payload.agent_unique_id] = action.payload;
    },
    resetGmailConfig: (state) => {
      state.configByAgent = {};
      state.error = null;
      state.loading = false;
      state.saving = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgentGmailConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgentGmailConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.configByAgent[action.payload.agent_unique_id] = action.payload;
      })
      .addCase(fetchAgentGmailConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Unable to load Gmail config';
      })
      .addCase(saveGmailConfig.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveGmailConfig.fulfilled, (state, action) => {
        state.saving = false;
        state.configByAgent[action.payload.agent_unique_id] = action.payload;
      })
      .addCase(saveGmailConfig.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? 'Unable to save Gmail settings';
      });
  },
});

export const { clearGmailError, setGmailConfig, resetGmailConfig } = gmailSlice.actions;
export default gmailSlice.reducer;
