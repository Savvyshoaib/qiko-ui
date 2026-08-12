import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  getAvatarAgents,
  getAvatarAgentDetail,
  updateAgentStatus,
  deleteAvatar,
  addAvatarBehavior,
  updateAvatarBehavior,
  deleteAvatarBehavior,
  addAvatarFaq,
  deleteAvatarFaq,
  addAvatarWebsite,
  deleteAvatarWebsite,
  addAvatarPolicy,
  deleteAvatarPolicy,
  getAvatarBehaviors,
  getAvatarFaqs,
  getAvatarWebsites,
  getAvatarPolicies,
  getAvatarDocumentsListDirect,
  uploadAvatarDocument,
  deleteAvatarDocument,
  type AvatarAgent,
  type AvatarAgentDetail,
  type AvatarBehavior,
  type AvatarFaq,
  type AvatarWebsite,
  type AvatarPolicy,
  type AvatarDocument,
  type UpdateAgentStatusPayload,
  type AddAvatarBehaviorPayload,
  type AddAvatarFaqPayload,
  type AddAvatarWebsitePayload,
  type AddAvatarPolicyPayload,
  type UploadAvatarDocumentPayload,
} from '@/lib/avatarApi';

interface AvatarState {
  agents: AvatarAgent[];
  agentsLoaded: boolean;
  selectedAgent: AvatarAgentDetail | null;
  behaviors: AvatarBehavior[];
  faqs: AvatarFaq[];
  websites: AvatarWebsite[];
  policies: AvatarPolicy[];
  documents: AvatarDocument[];
  loading: {
    agents: boolean;
    selectedAgent: boolean;
    behaviors: boolean;
    faqs: boolean;
    websites: boolean;
    policies: boolean;
    documents: boolean;
    statusUpdate: boolean;
    delete: boolean;
  };
  error: {
    agents: string | null;
    selectedAgent: string | null;
    behaviors: string | null;
    faqs: string | null;
    websites: string | null;
    policies: string | null;
    documents: string | null;
    statusUpdate: string | null;
    delete: string | null;
  };
}

const initialState: AvatarState = {
  agents: [],
  agentsLoaded: false,
  selectedAgent: null,
  behaviors: [],
  faqs: [],
  websites: [],
  policies: [],
  documents: [],
  loading: {
    agents: false,
    selectedAgent: false,
    behaviors: false,
    faqs: false,
    websites: false,
    policies: false,
    documents: false,
    statusUpdate: false,
    delete: false,
  },
  error: {
    agents: null,
    selectedAgent: null,
    behaviors: null,
    faqs: null,
    websites: null,
    policies: null,
    documents: null,
    statusUpdate: null,
    delete: null,
  },
};

// Async thunks
export const fetchAvatarAgents = createAsyncThunk(
  'avatar/fetchAgents',
  async () => {
    const response = await getAvatarAgents();
    return response;
  }
);

export const fetchAvatarAgentDetail = createAsyncThunk(
  'avatar/fetchAgentDetail',
  async (agentId: string) => {
    const response = await getAvatarAgentDetail(agentId);
    return response;
  }
);

export const updateAvatarStatus = createAsyncThunk(
  'avatar/updateStatus',
  async (payload: UpdateAgentStatusPayload, { rejectWithValue }) => {
    try {
      await updateAgentStatus(payload);
      return payload;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update status');
    }
  }
);

export const deleteAvatarAgent = createAsyncThunk(
  'avatar/deleteAgent',
  async (agentId: string) => {
    await deleteAvatar(agentId);
    return agentId;
  }
);

export const fetchAvatarBehaviors = createAsyncThunk(
  'avatar/fetchBehaviors',
  async (agentId: string) => {
    const response = await getAvatarBehaviors(agentId);
    return response;
  }
);

export const createAvatarBehavior = createAsyncThunk(
  'avatar/createBehavior',
  async (payload: AddAvatarBehaviorPayload) => {
    const response = await addAvatarBehavior(payload);
    return response.data;
  }
);

export const modifyAvatarBehavior = createAsyncThunk(
  'avatar/modifyBehavior',
  async ({ id, payload }: { id: string | number; payload: AddAvatarBehaviorPayload }) => {
    const response = await updateAvatarBehavior(id, payload);
    return response.data;
  }
);

export const removeAvatarBehavior = createAsyncThunk(
  'avatar/removeBehavior',
  async (id: string | number) => {
    await deleteAvatarBehavior(id);
    return id;
  }
);

export const fetchAvatarFaqs = createAsyncThunk(
  'avatar/fetchFaqs',
  async (agentId: string) => {
    const response = await getAvatarFaqs(agentId);
    return response;
  }
);

export const createAvatarFaq = createAsyncThunk(
  'avatar/createFaq',
  async (payload: AddAvatarFaqPayload) => {
    const response = await addAvatarFaq(payload);
    return response?.faq;
  }
);

export const removeAvatarFaq = createAsyncThunk(
  'avatar/removeFaq',
  async (id: string | number) => {
    await deleteAvatarFaq(id);
    return id;
  }
);

export const fetchAvatarWebsites = createAsyncThunk(
  'avatar/fetchWebsites',
  async (agentId: string) => {
    const response = await getAvatarWebsites(agentId);
    return response;
  }
);

export const createAvatarWebsite = createAsyncThunk(
  'avatar/createWebsite',
  async (payload: AddAvatarWebsitePayload) => {
    const response = await addAvatarWebsite(payload);
    return response.data;
  }
);

export const removeAvatarWebsite = createAsyncThunk(
  'avatar/removeWebsite',
  async (id: string | number) => {
    await deleteAvatarWebsite(id);
    return id;
  }
);

export const fetchAvatarPolicies = createAsyncThunk(
  'avatar/fetchPolicies',
  async (agentId: string) => {
    const response = await getAvatarPolicies(agentId);
    return response;
  }
);

export const createAvatarPolicy = createAsyncThunk(
  'avatar/createPolicy',
  async (payload: AddAvatarPolicyPayload) => {
    const response = await addAvatarPolicy(payload);
    return response.data;
  }
);

export const removeAvatarPolicy = createAsyncThunk(
  'avatar/removePolicy',
  async (id: string | number) => {
    await deleteAvatarPolicy(id);
    return id;
  }
);

// Documents
export const fetchAvatarDocuments = createAsyncThunk(
  'avatar/fetchDocuments',
  async (agentUniqueId: string) => {
    const documents = await getAvatarDocumentsListDirect(agentUniqueId);
    return { agentUniqueId, documents };
  }
);

export const addAvatarDocument = createAsyncThunk(
  'avatar/addDocument',
  async (payload: UploadAvatarDocumentPayload) => {
    const response = await uploadAvatarDocument(payload);
    const doc = response?.data;
    if (!doc) throw new Error(response?.message || 'Failed to upload document');
    return { document: doc, agentUniqueId: payload.agent_unique_id };
  }
);

export const removeAvatarDocument = createAsyncThunk(
  'avatar/removeDocument',
  async (documentId: string | number) => {
    await deleteAvatarDocument(documentId);
    return documentId;
  }
);

const avatarSlice = createSlice({
  name: 'avatar',
  initialState,
  reducers: {
    clearSelectedAgent: (state) => {
      state.selectedAgent = null;
    },
    clearError: (state, action: PayloadAction<keyof AvatarState['error']>) => {
      state.error[action.payload] = null;
    },
    // Documents: update one document in state (e.g. after edit)
    updateDocument: (state, action: PayloadAction<{ id: string | number; changes: Partial<AvatarDocument> }>) => {
      const { id, changes } = action.payload;
      const index = state.documents.findIndex((d) => d.id === id);
      if (index !== -1) {
        state.documents[index] = { ...state.documents[index], ...changes };
      }
    },
    // Clear documents (e.g. when switching agent)
    clearDocuments: (state) => {
      state.documents = [];
    },
    // Update selected agent's profile fields (e.g. after saving settings)
    updateSelectedAgentProfile: (
      state,
      action: PayloadAction<{
        fullName?: string;
        headline?: string;
        location?: string;
        tone?: string;
        expertise?: string;
        industry?: string;
        target_audience?: string;
        main_goal?: string;
        what_makes_you_unique?: string;
        more_info?: string;
        about_yourself?: string;
      }>
    ) => {
      if (!state.selectedAgent) return;
      const {
        fullName,
        headline,
        location,
        tone,
        about_yourself,
        expertise,
        industry,
        target_audience,
        main_goal,
        what_makes_you_unique,
        more_info,
      } = action.payload;

      // Update only selectedAgent so WorkersPage header shows new name/headline.
      // Do not mutate state.agents here, otherwise WorkersPage useEffect
      // (selectedWorkerKey, agents) re-runs and triggers loadWorker → "Loading worker..."
      const next: typeof state.selectedAgent = {
        ...state.selectedAgent,
        fullName: fullName !== undefined ? fullName : state.selectedAgent.fullName,
        full_name: fullName !== undefined ? fullName : state.selectedAgent.full_name,
        name: fullName !== undefined ? fullName : state.selectedAgent.name,
        headline: headline !== undefined ? headline : state.selectedAgent.headline,
        about_yourself: about_yourself !== undefined ? about_yourself : state.selectedAgent.about_yourself,
        location: location !== undefined ? location : state.selectedAgent.location,
        tone: tone !== undefined ? tone : state.selectedAgent.tone,
        expertise: expertise !== undefined ? expertise : state.selectedAgent.expertise,
        industry: industry !== undefined ? industry : state.selectedAgent.industry,
        target_audience: target_audience !== undefined ? target_audience : state.selectedAgent.target_audience,
        main_goal: main_goal !== undefined ? main_goal : state.selectedAgent.main_goal,
        what_makes_you_unique:
          what_makes_you_unique !== undefined
            ? what_makes_you_unique
            : state.selectedAgent.what_makes_you_unique,
        more_info: more_info !== undefined ? more_info : state.selectedAgent.more_info,
      };
      if (headline !== undefined) {
        next.headline = headline;
        next.professionalTitle = headline;
      }
      state.selectedAgent = next;
    },
    updateAgentListProfile: (
      state,
      action: PayloadAction<{
        workerId?: string | number;
        agentId?: string;
        fullName?: string;
        headline?: string;
        location?: string;
        tone?: string;
        about_yourself?: string;
        industry?: string;
      }>
    ) => {
      const {
        workerId,
        agentId,
        fullName,
        headline,
        location,
        tone,
        about_yourself,
        industry,
      } = action.payload;

      const hasWorkerId = workerId !== undefined && workerId !== null;
      state.agents = state.agents.map((agent) => {
        const matchesByWorkerId = hasWorkerId && String(agent.id) === String(workerId);
        const matchesByAgentId = Boolean(agentId) && agent.agent_unique_id === agentId;
        if (!matchesByWorkerId && !matchesByAgentId) return agent;

        const nextName = fullName !== undefined ? fullName : (agent.user_name ?? agent.agent_name ?? "");
        return {
          ...agent,
          user_name: nextName,
          agent_name: nextName,
          headline: headline !== undefined ? headline : (agent as { headline?: string | null }).headline,
          location: location !== undefined ? location : (agent as { location?: string | null }).location,
          tone: tone !== undefined ? tone : (agent as { tone?: string | null }).tone,
          about_yourself:
            about_yourself !== undefined
              ? about_yourself
              : (agent as { about_yourself?: string | null }).about_yourself,
          industry: industry !== undefined ? industry : (agent as { industry?: string | null }).industry,
        };
      });
    },
    // Policies: update one policy in state (e.g. after edit)
    updatePolicy: (state, action: PayloadAction<{ id: string | number; changes: Partial<AvatarPolicy> }>) => {
      const { id, changes } = action.payload;
      const index = state.policies.findIndex((p) => p.id === id);
      if (index !== -1) {
        state.policies[index] = { ...state.policies[index], ...changes };
      }
    },
    // Clear policies (e.g. when switching agent)
    clearPolicies: (state) => {
      state.policies = [];
    },
    // Optimistic update for agent status
    optimisticUpdateStatus: (state, action: PayloadAction<UpdateAgentStatusPayload>) => {
      const { agentId, status } = action.payload;
      // Update in agents list
      const agentIndex = state.agents.findIndex((a) => a.agent_unique_id === agentId);
      if (agentIndex !== -1) {
        state.agents[agentIndex] = {
          ...state.agents[agentIndex],
          status,
        };
      }

      console.log("agentIndex", agentIndex, agentId);
      // Update selected agent if it matches
      if (state.selectedAgent?.agent_id === agentId) {
        state.selectedAgent = {
          ...state.selectedAgent,
          status,
        };
      }
    },
    updateAgentStudioLinked: (
      state,
      action: PayloadAction<{ agentId: string; studio_linked: boolean }>
    ) => {
      const { agentId, studio_linked } = action.payload;
      state.agents = state.agents.map((agent) => {
        if (agent.agent_unique_id !== agentId) return agent;
        return {
          ...agent,
          studio_linked,
        };
      });
    },
  },
  extraReducers: (builder) => {
    // Fetch agents
    builder
      .addCase(fetchAvatarAgents.pending, (state) => {
        state.loading.agents = true;
        state.error.agents = null;
      })
      .addCase(fetchAvatarAgents.fulfilled, (state, action) => {
        state.loading.agents = false;
        state.agentsLoaded = true;
        state.agents = action.payload;
        if (state.selectedAgent) {
          const fromList = state.agents.find(
            (a) => a.agent_unique_id === state.selectedAgent?.agent_id || a.id === state.selectedAgent?.id
          );
          if (fromList) {
            state.selectedAgent.agent_status = fromList.status;
            state.selectedAgent.vapi_credentials_added = fromList.vapi_credentials_added;
            state.selectedAgent.calendly_is_linked = fromList.calendly_is_linked;
          }
        }
      })
      .addCase(fetchAvatarAgents.rejected, (state, action) => {
        state.loading.agents = false;
        state.agentsLoaded = true;
        state.error.agents = action.error.message || 'Failed to fetch agents';
      });

    // Fetch agent detail
    builder
      .addCase(fetchAvatarAgentDetail.pending, (state) => {
        state.loading.selectedAgent = true;
        state.error.selectedAgent = null;
      })
      .addCase(fetchAvatarAgentDetail.fulfilled, (state, action) => {
        state.loading.selectedAgent = false;
        const detail = action.payload;
        if (!detail) {
          const fromList = state.agents.find(
            (a) => a.agent_unique_id === action.meta.arg || a.id === action.meta.arg
          );
          

          const fallbackFullName =
            (fromList as { full_name?: string; fullName?: string; name?: string } | undefined)?.full_name ||
            (fromList as { full_name?: string; fullName?: string; name?: string } | undefined)?.fullName ||
            (fromList as { full_name?: string; fullName?: string; name?: string } | undefined)?.name ||
            '';
          const fallbackHeadline =
            (fromList as { headline?: string; professionalTitle?: string } | undefined)?.headline ||
            (fromList as { headline?: string; professionalTitle?: string } | undefined)?.professionalTitle ||
            '';
          const fallbackSkills = Array.isArray((fromList as { skills?: string[] } | undefined)?.skills)
            ? ((fromList as { skills?: string[] } | undefined)?.skills ?? [])
            : [];

            // console.log("fromList", fallbackFullName);

          state.selectedAgent = {
            id: action.meta.arg,
            agent_id: action.meta.arg,
            full_name: fallbackFullName,
            fullName: fallbackFullName,
            name: fallbackFullName,
            headline: fallbackHeadline,
            skills: fallbackSkills,
            agent_status:
              (fromList as { status?: string; agent_status?: string } | undefined)?.status ||
              (fromList as { status?: string; agent_status?: string } | undefined)?.agent_status,
            agent_name:
              (fromList as { agent_name?: string; user_name?: string } | undefined)?.agent_name ||
              (fromList as { agent_name?: string; user_name?: string } | undefined)?.user_name ||
              fallbackFullName,
            vapi_credentials_added:
              (fromList as { vapi_credentials_added?: boolean } | undefined)?.vapi_credentials_added,
            calendly_is_linked:
              (fromList as { calendly_is_linked?: boolean } | undefined)?.calendly_is_linked,
          };
          state.error.selectedAgent = 'Agent detail not found';
          return;
        }
        const fromList = state.agents.find(
          (a) => a.agent_unique_id === detail.agent_id || a.id === detail.id
        );
        state.selectedAgent = {
          ...detail,
          agent_status: fromList?.status ?? detail?.agent_status,
          vapi_credentials_added:
            fromList?.vapi_credentials_added ?? detail?.vapi_credentials_added,
          calendly_is_linked:
            fromList?.calendly_is_linked ?? detail?.calendly_is_linked,
        };
      })
      .addCase(fetchAvatarAgentDetail.rejected, (state, action) => {
        state.loading.selectedAgent = false;
        state.error.selectedAgent = action.error.message || 'Failed to fetch agent detail';
      });

    // Update status
    builder
      .addCase(updateAvatarStatus.pending, (state) => {
        state.loading.statusUpdate = true;
        state.error.statusUpdate = null;
      })
      .addCase(updateAvatarStatus.fulfilled, (state, action) => {
        state.loading.statusUpdate = false;
        const { agentId, status } = action.payload;
        
        // Update in agents list
        const agentIndex = state.agents.findIndex((a) => a.id === agentId);
        if (agentIndex !== -1) {
          state.agents[agentIndex] = {
            ...state.agents[agentIndex],
            status,
          };
        }
        
        // Update selected agent
        if (state.selectedAgent?.agent_id === agentId) {
          state.selectedAgent = {
            ...state.selectedAgent,
            status,
            agent_status: status,
          };
        }
      })
      .addCase(updateAvatarStatus.rejected, (state, action) => {
        state.loading.statusUpdate = false;
        state.error.statusUpdate = action.payload as string || 'Failed to update status';
      });

    // Delete agent
    builder
      .addCase(deleteAvatarAgent.pending, (state) => {
        state.loading.delete = true;
        state.error.delete = null;
      })
      .addCase(deleteAvatarAgent.fulfilled, (state, action) => {
        state.loading.delete = false;
        const agentId = action.payload;
        state.agents = state.agents.filter((a) => (a.agent_unique_id ?? a.id) !== agentId);
        if (state.selectedAgent?.agent_id === agentId) {
          state.selectedAgent = null;
        }
      })
      .addCase(deleteAvatarAgent.rejected, (state, action) => {
        state.loading.delete = false;
        state.error.delete = action.error.message || 'Failed to delete agent';
      });

    // Fetch behaviors
    builder
      .addCase(fetchAvatarBehaviors.pending, (state) => {
        state.loading.behaviors = true;
        state.error.behaviors = null;
      })
      .addCase(fetchAvatarBehaviors.fulfilled, (state, action) => {
        state.loading.behaviors = false;
        state.behaviors = action.payload;
      })
      .addCase(fetchAvatarBehaviors.rejected, (state, action) => {
        state.loading.behaviors = false;
        state.error.behaviors = action.error.message || 'Failed to fetch behaviors';
      });

    // Create behavior
    builder
      .addCase(createAvatarBehavior.fulfilled, (state, action) => {
        if (action.payload) {
          state.behaviors.push(action.payload);
        }
      });

    // Modify behavior
    builder
      .addCase(modifyAvatarBehavior.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.behaviors.findIndex((b) => b.id === action.payload?.id);
          if (index !== -1) {
            state.behaviors[index] = action.payload;
          }
        }
      });

    // Remove behavior
    builder
      .addCase(removeAvatarBehavior.fulfilled, (state, action) => {
        state.behaviors = state.behaviors.filter((b) => b.id !== action.payload);
      });

    // Fetch FAQs
    builder
      .addCase(fetchAvatarFaqs.pending, (state) => {
        state.loading.faqs = true;
        state.error.faqs = null;
      })
      .addCase(fetchAvatarFaqs.fulfilled, (state, action) => {
        state.loading.faqs = false;
        state.faqs = action.payload;
      })
      .addCase(fetchAvatarFaqs.rejected, (state, action) => {
        state.loading.faqs = false;
        state.error.faqs = action.error.message || 'Failed to fetch FAQs';
      });

    // Create FAQ
    builder
      .addCase(createAvatarFaq.fulfilled, (state, action) => {
        if (action.payload) {
          state.faqs.push(action.payload);
        }
      });

    // Remove FAQ
    builder
      .addCase(removeAvatarFaq.fulfilled, (state, action) => {
        state.faqs = state.faqs.filter((f) => f.id !== action.payload);
      });

    // Fetch websites
    builder
      .addCase(fetchAvatarWebsites.pending, (state) => {
        state.loading.websites = true;
        state.error.websites = null;
      })
      .addCase(fetchAvatarWebsites.fulfilled, (state, action) => {
        state.loading.websites = false;
        state.websites = action.payload;
      })
      .addCase(fetchAvatarWebsites.rejected, (state, action) => {
        state.loading.websites = false;
        state.error.websites = action.error.message || 'Failed to fetch websites';
      });

    // Create website
    builder
      .addCase(createAvatarWebsite.fulfilled, (state, action) => {
        if (action.payload) {
          state.websites.push(action.payload);
        }
      });

    // Remove website
    builder
      .addCase(removeAvatarWebsite.fulfilled, (state, action) => {
        state.websites = state.websites.filter((w) => w.id !== action.payload);
      });

    // Fetch policies
    builder
      .addCase(fetchAvatarPolicies.pending, (state) => {
        state.loading.policies = true;
        state.error.policies = null;
      })
      .addCase(fetchAvatarPolicies.fulfilled, (state, action) => {
        state.loading.policies = false;
        state.policies = action.payload;
      })
      .addCase(fetchAvatarPolicies.rejected, (state, action) => {
        state.loading.policies = false;
        state.error.policies = action.error.message || 'Failed to fetch policies';
      });

    // Create policy
    builder
      .addCase(createAvatarPolicy.fulfilled, (state, action) => {
        if (action.payload) {
          state.policies.push(action.payload);
        }
      });

    // Remove policy
    builder
      .addCase(removeAvatarPolicy.fulfilled, (state, action) => {
        state.policies = state.policies.filter((p) => p.id !== action.payload);
      });

    // Fetch documents
    builder
      .addCase(fetchAvatarDocuments.pending, (state) => {
        state.loading.documents = true;
        state.error.documents = null;
      })
      .addCase(fetchAvatarDocuments.fulfilled, (state, action) => {
        state.loading.documents = false;
        state.documents = action.payload.documents;
      })
      .addCase(fetchAvatarDocuments.rejected, (state, action) => {
        state.loading.documents = false;
        state.error.documents = action.error.message || 'Failed to fetch documents';
      });

    // Add document (upload)
    builder
      .addCase(addAvatarDocument.fulfilled, (state, action) => {
        if (action.payload.document) {
          state.documents.push(action.payload.document);
        }
      });

    // Remove document
    builder
      .addCase(removeAvatarDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter((d) => d.id !== action.payload);
      });
  },
});

export const {
  clearSelectedAgent,
  clearError,
  optimisticUpdateStatus,
  updateAgentStudioLinked,
  updateAgentListProfile,
  updateDocument,
  clearDocuments,
  updatePolicy,
  clearPolicies,
  updateSelectedAgentProfile,
} = avatarSlice.actions;
export default avatarSlice.reducer;

