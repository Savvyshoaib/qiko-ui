import { APIClient } from "./APIClient";
import { APICONSTANTS } from "./apiConstants";
import { clearCrossSiteLoggedInCookie, setCrossSiteLoggedInCookie } from "./crossSiteAuthCookie";
import { appFetch } from "@/data/appFetch";

const BASE_URL = import.meta.env.VITE_API_BASE_URL

const JSON_CONTENT_TYPE_HEADER = { "Content-Type": "application/json" } as const;

function getSessionToken(): string | null {
  return localStorage.getItem("qiko_session_token");
}

function getAuthHeaders(): HeadersInit {
  const token = getSessionToken();
  return {
    ...JSON_CONTENT_TYPE_HEADER,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function getJsonHeaders(): HeadersInit {
  return JSON_CONTENT_TYPE_HEADER;
}

/** Auth header only (e.g. for FormData uploads where Content-Type must not be set) */
function getAuthOnlyHeaders(): HeadersInit {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Logout from avatar service
 */
export async function logoutAvatar(): Promise<{ success?: boolean }> {
  const apiClient = new APIClient(APICONSTANTS.logout, {
    fallbackError: "Logout failed",
  }, apiClientDeps);
  return apiClient.post<{ success?: boolean }>();
}

async function handleUnauthorizedLogout(res: Response): Promise<void> {
  if (res.status !== 401) return;
  if (typeof window === "undefined") return;

  localStorage.removeItem("qiko_session_token");
  localStorage.removeItem("qiko_user_info");
  localStorage.removeItem("qiko_subscription");
  localStorage.removeItem("qiko_calendly_token");
  clearCrossSiteLoggedInCookie();

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

/**
 * Module-scoped fetch wrapper so every API call in this file
 * gets the same centralized unauthorized handling.
 */
async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await appFetch(input, init);
  await handleUnauthorizedLogout(res);
  return res;
}

export function extractApiErrorMessage(
  data: unknown,
  fallbackMessage: string
): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const message = typeof obj.message === "string" ? obj.message : null;
    const errors = obj.errors;
    if (
      errors &&
      typeof errors === "object" &&
      Object.values(errors as Record<string, unknown>).length > 0
    ) {
      const first = Object.values(errors as Record<string, unknown>)[0];
      if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    }
    if (message) return message;
  }
  return fallbackMessage;
}

const apiClientDeps = {
  baseUrl: BASE_URL,
  request: fetch,
  getAuthHeaders,
  getJsonHeaders,
  extractApiErrorMessage,
  onUnauthorized: handleUnauthorizedLogout,
};

export interface AvatarAgent {
  id: string;
  agent_unique_id?: string;
  agent_name?: string;
  user_name?: string;
  email?: string;
  status?: string;
  created_at?: string;
  studio_linked?: boolean;
  industry?: string;
  specialization?: string;
  template?: string;
  calendly_event_type?: string;
  vapi_credentials_added?: boolean;
  calendly_is_linked?: boolean;
  // add more fields if backend returns them
}

export interface StudioLinkedToggleResponse {
  message?: string;
  studio_linked?: boolean;
}

export interface AvatarStudioUserResponse {
  [key: string]: unknown;
}

/**
 * Get current studio user data
 * Endpoint: GET /avatar/user/studio
 */
export async function getAvatarStudioUser(): Promise<AvatarStudioUserResponse> {
  const apiClient = new APIClient(APICONSTANTS.studioUser, {
    fallbackError: "Failed to fetch studio user",
  }, apiClientDeps);
  return apiClient.get<AvatarStudioUserResponse>();
}

export async function toggleAgentStudioLinked(
  agentId: string,
  studio_linked: boolean
): Promise<StudioLinkedToggleResponse> {
  const trimmedAgentId = agentId?.trim();
  if (!trimmedAgentId) throw new Error("Agent ID is required");
  const payload = { studio_linked: Boolean(studio_linked) };

  const apiClient = new APIClient(APICONSTANTS.studioLinked(trimmedAgentId), {
    fallbackError: "Failed to update Studio state",
  }, apiClientDeps);

  return apiClient.put<StudioLinkedToggleResponse>(payload);
}

// ================= CRM / Sales Pipeline (mock) =================

export interface CrmContact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  /** From chat-history API: conversation_id */
  conversationId?: number;
  /** Messages from chat-history list (no extra API call for thread) */
  messages?: ChatMessageItem[];
  status: "new" | "contacted" | "interested" | "quoted" | "converted" | "lost";
  estimatedValue?: number;
  currency?: string;
  aiSummary?: string;
  sentiment?: "positive" | "neutral" | "negative" | "mixed";
  lastEvent?: {
    type: string;
    title: string;
    summary: string;
    timestamp: string;
  };
  topAction?: {
    actionType: string;
    title: string;
    priority: "low" | "normal" | "high";
  };
  pendingActionsCount?: number;
}

export interface CrmDashboardStats {
  statusBreakdown: Record<string, number>;
}

export interface CrmResponse {
  contacts: CrmContact[];
  total: number;
  dashboard: CrmDashboardStats;
}

/** Chat history API response: GET /avatar/{agentId}/chat-history */
export interface ChatHistoryOtherAgent {
  id: number;
  agent_name: string;
  email?: string;
  agent_unique_id: string;
  type: string;
}

export interface ChatHistoryItem {
  other_agent: ChatHistoryOtherAgent;
  conversation_id: number;
  messages?: ChatMessageItem[];
  [key: string]: unknown;
}

export interface ChatHistoryResponse {
  data?: {
    chats?: ChatHistoryItem[];
  };
}

/** Sender in a message */
export interface ChatMessageSender {
  id: number;
  agent_name: string;
  agent_unique_id: string;
  type: "user" | "worker";
}

/** Single message in conversation detail */
export interface ChatMessageItem {
  id: number;
  message: string;
  message_type: string;
  created_at: string;
  sender: ChatMessageSender;
}

/** Full conversation detail: other_agent + conversation_id + messages[] */
export interface ConversationDetailResponse {
  other_agent: ChatHistoryOtherAgent;
  conversation_id: number;
  messages: ChatMessageItem[];
}

/**
 * GET /avatar/{agentId}/chat-history
 * Returns list of chats; each chat has other_agent, conversation_id, etc.
 */
export async function getChatHistory(agentId: string): Promise<ChatHistoryResponse> {
  if (!agentId) throw new Error("Agent ID is required");
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(agentId)}/chat-history`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string })?.message || "Failed to fetch chat history");
  }
  return json as ChatHistoryResponse;
}

/**
 * GET /avatar/{agentId}/chat-history/{conversationId}
 * Returns one conversation with other_agent, conversation_id, messages[].
 */
export async function getConversationDetail(
  agentId: string,
  conversationId: number
): Promise<ConversationDetailResponse> {
  if (!agentId) throw new Error("Agent ID is required");
  const res = await fetch(
    `${BASE_URL}/${encodeURIComponent(agentId)}/chat-history/${conversationId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { message?: string })?.message || "Failed to fetch conversation");
  }
  const data = (json as { data?: ConversationDetailResponse }).data ?? json;
  return data as ConversationDetailResponse;
}

/**
 * CRM data: uses GET /avatar/{agentId}/chat-history when agentId is provided.
 * Maps data.chats[].other_agent.agent_name → name, .email → email.
 * Falls back to mock data when agentId is missing.
 */
export async function getCrmData(workerId: number, agentId?: string | null): Promise<CrmResponse> {
  if (agentId) {
    const res = await getChatHistory(agentId);
    const chats = res?.data?.chats ?? [];
    const contacts: CrmContact[] = chats.map((chat) => {
      const o = chat.other_agent;
      return {
        id: o?.id ?? 0,
        name: o?.agent_name ?? "Unknown",
        email: o?.email,
        conversationId: chat.conversation_id,
        messages: chat.messages ?? [],
        status: "contacted",
        aiSummary: "Chat with worker",
      };
    });
    const statusBreakdown: Record<string, number> = {};
    for (const c of contacts) {
      statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1;
    }
    return {
      contacts,
      total: contacts.length,
      dashboard: { statusBreakdown },
    };
  }

  // Fallback mock when no agentId
  const contacts: CrmContact[] = [
    {
      id: 1,
      name: "Alice Johnson",
      email: "alice@example.com",
      status: "interested",
      estimatedValue: 250000,
      currency: "USD",
      aiSummary: "Very interested in a discovery call next week.",
      sentiment: "positive",
      lastEvent: {
        type: "text_chat",
        title: "Chat with AI worker",
        summary: "Asked detailed questions about pricing and onboarding timeline.",
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      topAction: {
        actionType: "schedule_call",
        title: "Schedule intro call",
        priority: "high",
      },
      pendingActionsCount: 1,
    },
    {
      id: 2,
      name: "Brightline Ventures",
      email: "contact@brightline.vc",
      status: "quoted",
      estimatedValue: 750000,
      currency: "USD",
      aiSummary: "Received a quote and requested a follow‑up in two weeks.",
      sentiment: "neutral",
      lastEvent: {
        type: "email",
        title: "Quote sent",
        summary: "AI drafted and sent a quote email with custom terms.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      topAction: {
        actionType: "follow_up",
        title: "Follow up on quote",
        priority: "normal",
      },
      pendingActionsCount: 2,
    },
    {
      id: 3,
      name: "Chris Doe",
      status: "new",
      estimatedValue: 50000,
      currency: "USD",
      aiSummary: "Left email after short chat, wants more information.",
      sentiment: "mixed",
      lastEvent: {
        type: "chat",
        title: "Site chat",
        summary: "Asked general questions about support coverage.",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      topAction: {
        actionType: "send_info",
        title: "Send overview deck",
        priority: "low",
      },
      pendingActionsCount: 1,
    },
  ];

  const statusBreakdown: Record<string, number> = {};
  for (const c of contacts) {
    statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1;
  }

  return {
    contacts,
    total: contacts.length,
    dashboard: {
      statusBreakdown,
    },
  };
}



/**
 * Get all avatar agents
 */
export async function getAvatarAgents(): Promise<AvatarAgent[]> {
  const apiClient = new APIClient("/get-agents", {
    fallbackError: "Failed to fetch avatar agents",
  }, apiClientDeps);
  const data = await apiClient.get<{ data?: AvatarAgent[] } | AvatarAgent[]>();
  return Array.isArray(data) ? data : (data.data || []); // supports both `{ data: [] }` or `[]`
}

export function isDefaultAgentSpecialization(specialization?: string | null): boolean {
  return specialization?.trim().toLowerCase() === "default agent";
}

const CREATE_AVATAR_SPECIALIZATION_BY_INDUSTRY: Record<string, string> = {
  pre_sales_writer_worker: "Pre-Sales RFP Writer",
  sales_intelligence: "Sales Intelligence",
  financial_analyst: "Property Finance Specialist",
};

export function getCreateAvatarSpecialization(industry?: string | null): string | undefined {
  if (!industry?.trim()) return undefined;
  return CREATE_AVATAR_SPECIALIZATION_BY_INDUSTRY[industry.trim()];
}



export interface AvatarHandlePayload {
  user_name: string;
  email: string;
  oliv_id: string;
}


export async function checkAvatarHandle(payload: AvatarHandlePayload) {

  const res = await fetch(`${BASE_URL}/create`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(
    data?.errors?.user_name?.[0] ||
    data?.message ||
    "Username unavailable"
    );
  }

  return res.json();
}


export interface CreateAvatarPayload {
    user_name?: string;
    oliv_id?: string;
    email?: string;
    agent_name?: string;
    industry?: string;
    template?: string;
    studio_linked?: boolean;
    specialization?: string;
  }
  
  export interface CreateAvatarResponse {
    success?: boolean;
    message?: string;
    data?: {
      agent_unique_id?: string;
      id?: string;
      user_name?: string;
      oliv_id?: string;
      email?: string;
    };
    avatar?: {
      id?: string;
      user_name?: string;
      oliv_id?: string;
      email?: string;
    };
  }
  
  export async function createAvatar(
    payload: CreateAvatarPayload
  ): Promise<CreateAvatarResponse> {
    const res = await fetch(`${BASE_URL}/create`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  
    const data: CreateAvatarResponse = await res.json().catch(() => ({} as CreateAvatarResponse));
  
    if (!res.ok) {
      throw new Error(
        (data as any)?.errors?.user_name?.[0] ??
        (data as any)?.message ??
        "Failed to create avatar"
      );
    }
  
    const agentId = data?.data?.agent_unique_id;
  
    if (agentId) {
      await updateAgentStatus({ agentId, status: "training" });
    }
  
    // Persist onboarding avatar data into qiko_user_info.
    // If qiko_user_info already exists (user is logged in), do NOT overwrite it.
    if (typeof window !== "undefined" && data?.data) {
      try {
        const existing = localStorage.getItem("qiko_user_info");
        if (!existing) {
          localStorage.setItem("qiko_user_info", JSON.stringify(data.data));
        }
      } catch {
        // ignore storage errors (quota, etc.)
      }
    }
  
    return data;
  }

/**
 * Sign up (create account) for avatar service
 */
export interface SignupAvatarPayload {
  user_name: string;
  email: string;
  password: string;
}

export interface SignupAvatarResponse {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    [key: string]: unknown;
  } | unknown;
}

export async function signupAvatar(
  payload: SignupAvatarPayload
): Promise<SignupAvatarResponse> {
  const apiClient = new APIClient(APICONSTANTS.signup, {
    auth: false,
    fallbackError: "Sign up failed",
  }, apiClientDeps);
  const data = await apiClient.post<SignupAvatarResponse>(payload);

  const sessionToken = (data as { data?: { token?: string } })?.data?.token;
  if (sessionToken) {
    localStorage.setItem("qiko_session_token", sessionToken);
    setCrossSiteLoggedInCookie();
  }

  // Persist signed-in user for Redux hydration (qiko_user_info).
  // Only write if it doesn't already exist to avoid clobbering existing user info.
  const signedInUser = (data as { data?: { user?: any } })?.data?.user;
  if (signedInUser && typeof window !== "undefined") {
    const existing = localStorage.getItem("qiko_user_info");
    if (!existing) {
      try {
        const userInfo = {
          ...signedInUser,
          id: signedInUser?.id != null ? String(signedInUser.id) : signedInUser?.id,
          name: signedInUser?.user_name ?? signedInUser?.name,
        };
        localStorage.setItem("qiko_user_info", JSON.stringify(userInfo));
      } catch {
        // ignore storage errors
      }
    }
  }

  return data;
}

/**
 * Login for avatar service
 */
export interface LoginAvatarPayload {
  email: string;
  password: string;
}

export interface LoginAvatarResponse {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    user?: any;
  };
}

export async function loginAvatar(
  payload: LoginAvatarPayload
): Promise<LoginAvatarResponse> {
  const apiClient = new APIClient(APICONSTANTS.login, {
    auth: false,
    fallbackError: "Login failed",
  }, apiClientDeps);
  return apiClient.post<LoginAvatarResponse>(payload);
}

/**
 * Request password reset email
 */
export async function forgotPasswordAvatar(email: string): Promise<{ success?: boolean; message?: string }> {
  const res = await fetch(`${BASE_URL}/forgot-password`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      (data?.errors && typeof data.errors === "object" && (Object.values(data.errors).flat() as string[])[0]) ||
      data?.message ||
      "Failed to send reset email"
    );
  }

  return data;
}

/**
 * Reset password with OTP from email
 * Payload: email, otp, password
 * Response may include data.user and data.token to log the user in.
 */
export interface ResetPasswordAvatarPayload {
  email: string;
  otp: string;
  password: string;
}

export interface ResetPasswordAvatarResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: {
    user?: { id?: number; user_name?: string; email?: string; agent_unique_id?: string; type?: string; [key: string]: unknown };
    token?: string;
  };
}

export async function resetPasswordAvatar(
  payload: ResetPasswordAvatarPayload
): Promise<ResetPasswordAvatarResponse> {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({})) as ResetPasswordAvatarResponse;

  if (!res.ok) {
    throw new Error(
      (data?.errors && typeof data.errors === "object" && (Object.values(data.errors).flat() as string[])[0]) ||
      data?.message ||
      "Failed to reset password"
    );
  }

  return data;
}


export interface AvatarChatPayload {
    user_name?: string;
    agent_unique_id?: string;
    message: string;
    email: string;
}
  
export type AvatarChatResponse = any;


export async function sendAvatarMessage(
  payload: AvatarChatPayload,
  username: string
): Promise<AvatarChatResponse> {
  const res = await fetch(
    `${BASE_URL}/${username}/chat-with-history`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      extractApiErrorMessage(data, "Failed to add avatar knowledge")
    );
  }

  return data;
}
  
export async function sendPublicAvatarMessage(
    payload: AvatarChatPayload,
    username: string
): Promise<AvatarChatResponse> {
  const res = await fetch(
      `${BASE_URL}/public/${username}/chat`,
      {
      method: "POST",
      headers: {
      ...getAuthHeaders(),
    },
      body: JSON.stringify(payload),
      }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
      throw new Error(
        extractApiErrorMessage(data, "Failed to add avatar knowledge")
      );
  }

  return data;
}

/** Web call config response from GET /voice/{agentId}/web-call-config */
export interface WebCallConfigResponse {
  agent?: {
    agentId?: string;
    agent_name?: string;
  };
  voice?: {
    customLlmUrl?: string;
    vapiPublicKey?: string;
    assistantId?: string;
    knowledgeSummary?: string;
    systemPrompt?: string;
  };
}

const VAPI_WEB_CALL_URL = "https://api.vapi.ai/call/web";

/** Vapi web call response – use webCallUrl to join the room and talk/listen (Daily.co) */
export interface VapiWebCallResponse {
  id?: string;
  webCallUrl?: string;
  status?: string;
  transport?: { callUrl?: string; provider?: string };
  monitor?: { listenUrl?: string; controlUrl?: string };
  [key: string]: unknown;
}

/**
 * Fetch voice web-call config from API (React equivalent of Laravel @json($voiceCallConfig)).
 * Use this to get config in the client, e.g. const config = await getWebCallConfig(agentId);
 */
export async function getWebCallConfig(agentId: string): Promise<WebCallConfigResponse> {
  if (!agentId) {
    throw new Error("Agent ID is required");
  }
  const configRes = await fetch(`${BASE_URL}/voice/${encodeURIComponent(agentId)}/web-call-config`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const configData = await configRes.json().catch(() => ({}));
  console.log("configData", configData);
  if (!configRes.ok) {
    throw new Error((configData as { message?: string })?.message || "Almost there. Add your Vapi keys in Connections to enable voice for this worker.");
  }
  return configData as WebCallConfigResponse;
}

/**
 * Get web call config then start a Vapi web call.
 * 1) GET /voice/{agentId}/web-call-config
 * 2) POST https://api.vapi.ai/call/web with { assistantId }
 * Returns the Vapi call object. Use response.webCallUrl to join the call and talk/listen (embed in iframe or open in new tab).
 */
export async function startVoiceCall(agentId: string): Promise<VapiWebCallResponse> {
  const config = await getWebCallConfig(agentId);
  const assistantId = config?.voice?.assistantId;
  if (!assistantId) {
    throw new Error("Voice config missing assistantId");
  }
  const vapiPublicKey = config?.voice?.vapiPublicKey;
  const vapiRes = await fetch(VAPI_WEB_CALL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(vapiPublicKey && { Authorization: `Bearer ${vapiPublicKey}` }),
    },
    body: JSON.stringify({ assistantId }),
  });
  const vapiData = (await vapiRes.json().catch(() => ({}))) as VapiWebCallResponse;
  if (!vapiRes.ok) {
    throw new Error((vapiData as { message?: string })?.message || "Failed to start Vapi call");
  }
  const webCallUrl = vapiData?.webCallUrl ?? vapiData?.transport?.callUrl;
  if (!webCallUrl || typeof webCallUrl !== "string") {
    throw new Error("No call URL in Vapi response");
  }
  return { ...vapiData, webCallUrl };
}







export interface AvatarAgentDetail {
  id: string;
  agent_id?: string; // agent_unique_id (UUID)
  agent_name?: string;
  vapi_credentials_added?: boolean;
  calendly_is_linked?: boolean;
  /** Status from agents list (synced from Redux agents when available) */
  agent_status?: string;
  name?: string;
  knowledge?: string;
  user_name?: string;
  full_name?: string;
  email?: string;
  fullName?: string;
  professionalTitle?: string;
  industry?: string;
  status?: "ready" | "training";
  planType?: "free" | "premium";
  wizardCompleted?: number;
  createdAt?: string;
  headline?: string;
  location?: string;
  tone?: string;
  short_bio?: string;
  skills?: string[];
  strength?: string;
  about_yourself?: string;
  expertise?: string;
  target_audience?: string;
  main_goal?: string;
  what_makes_you_unique?: string;
  more_info?: string;
  // add other fields returned by backend
}

/**
 * Get public avatar agent details (no auth required)
 * Endpoint: /avatar/public/{agent_unique_id}/get-agent
 */
export async function getPublicAvatarAgentDetail(agent_unique_id: string): Promise<AvatarAgentDetail> {
  const res = await fetch(`${BASE_URL}/public/${agent_unique_id}/get-agent`, {
    method: "GET",
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch avatar details");
  }

  return data?.data || data;
}

/**
 * Get avatar agent details by username (auth required)
 */
export async function getAvatarAgentDetail(agent_unique_id: string): Promise<AvatarAgentDetail> {
  const res = await fetch(`${BASE_URL}/details?agent_unique_id=${agent_unique_id}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch avatar details");
  }

  return data?.data[0] || data[0];
}

/**
 * Avatar behavior/rule item from API
 */
export interface AvatarBehavior {
  id?: number | string;
  agent_unique_id?: string;
  category?: string;
  type?: string;
  title?: string;
  description?: string;
  content?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
}

/**
 * Get avatar behaviors (prompts, guardrails, rules) by agent_unique_id
 */
export async function getAvatarBehaviors(
  agent_unique_id: string
): Promise<AvatarBehavior[]> {
  const res = await fetch(
    `${BASE_URL}/behaviors?agent_unique_id=${encodeURIComponent(agent_unique_id)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  const data = await res.json();
  // console.log("data", data)

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch avatar behaviors");
  }

  const items = data?.data?.behaviors ?? data?.behaviors ?? data?.data ?? data;
  return Array.isArray(items) ? items : [];
}

export interface AvatarFaq {
  id?: number | string;
  question?: string;
  answer?: string;
  title?: string;
  content?: string;
  prompt?: string;
  completion?: string;
  created_at?: string;
  createdAt?: string;
}

/**
 * Get avatar FAQs by agent_unique_id
 */
export async function getAvatarFaqs(
  agent_unique_id: string
): Promise<AvatarFaq[]> {
  const res = await fetch(
    `${BASE_URL}/faqs?agent_unique_id=${encodeURIComponent(agent_unique_id)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch FAQs");
  }

  const items = data?.data?.faqs ?? data?.faqs ?? data?.data ?? data;
  return Array.isArray(items) ? items : [];
}

export interface AvatarWebsite {
  id?: number | string;
  url?: string;
  title?: string;
  content?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
}

/**
 * Get avatar websites by agent_unique_id
 */
export async function getAvatarWebsites(
  agent_unique_id: string
): Promise<AvatarWebsite[]> {
  const res = await fetch(
    `${BASE_URL}/websites?agent_unique_id=${encodeURIComponent(agent_unique_id)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch websites");
  }

  const items = data?.data?.websites ?? data?.websites ?? data?.data ?? data;
  return Array.isArray(items) ? items : [];
}

export interface AvatarPolicy {
  id?: number | string;
  title?: string;
  name?: string;
  content?: string;
  description?: string;
  created_at?: string;
  createdAt?: string;
}

/**
 * Get avatar policies by agent_unique_id
 */
export async function getAvatarPolicies(
  agent_unique_id: string
): Promise<AvatarPolicy[]> {
  const res = await fetch(
    `${BASE_URL}/policies?agent_unique_id=${encodeURIComponent(agent_unique_id)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch policies");
  }

  const items = data?.data?.policies ?? data?.policies ?? data?.data ?? data;
  return Array.isArray(items) ? items : [];
}

export interface AddAvatarPolicyPayload {
  agent_unique_id: string;
  name: string;
  details: string;
}

/**
 * Add a policy
 */
export async function addAvatarPolicy(
  payload: AddAvatarPolicyPayload
): Promise<{ success?: boolean; data?: AvatarPolicy }> {
  const res = await fetch(`${BASE_URL}/policy`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to add policy");
  }

  syncVapiAssistantPromptAfterResponse(payload.agent_unique_id);
  return data?.data ?? data;
}

/**
 * Delete a policy
 */
export async function deleteAvatarPolicy(
  id: string | number
): Promise<{ success?: boolean }> {
  const res = await fetch(`${BASE_URL}/policy/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Failed to delete policy");
  }

  return data;
}

export interface AddAvatarWebsitePayload {
  agent_unique_id: string;
  website_name: string;
  url: string;
  /** Scraped homepage text (from client-side scraper) sent as payload to API */
  details?: string;
}

/**
 * Add a website
 */
export async function addAvatarWebsite(
  payload: AddAvatarWebsitePayload
): Promise<{ success?: boolean; data?: AvatarWebsite }> {
  const res = await fetch(`${BASE_URL}/website`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to add website");
  }

  syncVapiAssistantPromptAfterResponse(payload.agent_unique_id);
  return data?.data ?? data;
}

/**
 * Delete a website
 */
export async function deleteAvatarWebsite(
  id: string | number
): Promise<{ success?: boolean }> {
  const res = await fetch(`${BASE_URL}/website/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Failed to delete website");
  }

  return data;
}

export interface AddAvatarFaqPayload {
  agent_unique_id: string;
  question: string;
  answer: string;
}

/**
 * Add an FAQ
 */
export async function addAvatarFaq(
  payload: AddAvatarFaqPayload
): Promise<{ success?: boolean; data?: AvatarFaq }> {
  const res = await fetch(`${BASE_URL}/faq`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to add FAQ");
  }

  syncVapiAssistantPromptAfterResponse(payload.agent_unique_id);
  return data?.data ?? data;
}

/**
 * Delete an FAQ
 */
export async function deleteAvatarFaq(
  id: string | number
): Promise<{ success?: boolean }> {
  const res = await fetch(`${BASE_URL}/faq/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Failed to delete FAQ");
  }

  return data;
}

export interface AddAvatarBehaviorPayload {
  agent_unique_id: string;
  type: string;
  title: string;
  description: string;
}

/**
 * Add a behavior (prompt, guardrail, or rule)
 */
export async function addAvatarBehavior(
  payload: AddAvatarBehaviorPayload
): Promise<{ success?: boolean; data?: AvatarBehavior }> {
  const res = await fetch(`${BASE_URL}/behavior`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to add behavior");
  }

  syncVapiAssistantPromptAfterResponse(payload.agent_unique_id);
  return data?.data ?? data;
}

/**
 * Update a behavior (prompt, guardrail, or rule)
 */
export async function updateAvatarBehavior(
  id: string | number,
  payload: AddAvatarBehaviorPayload
): Promise<{ success?: boolean; data?: AvatarBehavior }> {
  const res = await fetch(`${BASE_URL}/behavior/${id}`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to update behavior");
  }

  syncVapiAssistantPromptAfterResponse(payload.agent_unique_id);
  return data?.data ?? data;
}

/**
 * Delete a behavior
 */
export async function deleteAvatarBehavior(
  id: string | number
): Promise<{ success?: boolean }> {
  const res = await fetch(`${BASE_URL}/behavior/${id}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Failed to delete behavior");
  }

  return data;
}


export interface AddAvatarKnowledgePayload {
  agent_unique_id?: string;
  knowledge?: string;
  user_name?: string;
  full_name?: string;
  headline?: string;
  location?: string;
  short_bio?: string;
  personality?: string;
  skills?: string[];
  about_yourself?: string;
  strength?: string;
  expertise?: string;
  industry?: string;
  target_audience?: string;
  main_goal?: string;
  what_makes_you_unique?: string;
  more_info?: string;
}

export interface AddAvatarKnowledgeResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/**
 * PATCH /avatar/voice/{agentId}/vapi-assistant-prompt
 * Updates VAPI assistant knowledge/prompt. Controlled by VITE_UPDATE_VAPI_ASSISTANT_AFTER_KNOWLEDGE.
 */
export async function updateVapiAssistantPrompt(agentId: string): Promise<{ success?: boolean; message?: string }> {
  if (!agentId) throw new Error("Agent ID is required");
  const res = await fetch(
    `${BASE_URL}/voice/${encodeURIComponent(agentId)}/vapi-assistant-prompt`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to update VAPI assistant prompt");
  }
  return data as { success?: boolean; message?: string };
}

/** Call vapi-assistant-prompt after knowledge/behavior/faq/website/policy/document updates. Set VITE_SYNC_VAPI_ASSISTANT_PROMPT=true to enable. */
const SYNC_VAPI_PROMPT = true

function syncVapiAssistantPromptAfterResponse(agentId: string | undefined): void {
  if (!SYNC_VAPI_PROMPT || !agentId) return;
  // Lazy-load store to avoid circular deps (avatarSlice imports from this module).
  (async () => {
    try {
      const mod = await import("@/store");
      const agents = mod.store.getState().avatar.agents as AvatarAgent[];
      
      // console.log("agents", agents);
      
      const matchedAgent = agents.find(
        (agent) => agent.agent_unique_id === agentId || agent.id === agentId
      );

      if (!matchedAgent?.vapi_credentials_added) return null;

      await updateVapiAssistantPrompt(agentId);
    } catch (err) {
      console.warn("[avatarApi] VAPI assistant prompt sync failed:", err);
    }
  })();
}

export async function addAvatarKnowledge(
  payload: AddAvatarKnowledgePayload
): Promise<AddAvatarKnowledgeResponse> {

  const res = await fetch(`${BASE_URL}/add-knowledge`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  // console.log("data", res);

  if (!res.ok) {
    throw new Error(
      extractApiErrorMessage(data, "Failed to add avatar knowledge")
    );
  }

  syncVapiAssistantPromptAfterResponse(payload.agent_unique_id ?? undefined);
  return data as AddAvatarKnowledgeResponse;
}


export async function deleteAvatar(agentId: string) {
  const res = await fetch(`${BASE_URL}/agent/${agentId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  // Handle errors
  if (!res.ok) {
    let data: any = null;

    try {
      data = await res.json();
    } catch {
      throw new Error("Failed to delete agent");
    }

    throw new Error(
      data?.message || "Unable to delete avatar agent"
    );
  }

  // Return JSON response if backend sends one
  return res.json();
}

export interface UpdateAgentStatusPayload {
  agentId: string;
  status: "ready" | "training";
}

export interface UpdateAgentStatusResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Update agent status (ready or training)
 */
export async function updateAgentStatus(
  payload: UpdateAgentStatusPayload
): Promise<UpdateAgentStatusResponse> {
  const { agentId, status } = payload;
  
  const res = await fetch(`${BASE_URL}/agent/${agentId}/status?status=${status}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Failed to update agent status");
  }

  return data;
}

export interface VapiCredentialsResponse {
  vapi_assistant_id?: string | null;
  vapi_public_key?: string | null;
  vapi_api_key?: string | null;
}

/**
 * Get Vapi credentials for an avatar agent
 * GET {{BaseUrl}}/avatar/agent/:agentId/vapi-credentials
 */
export async function getVapiCredentials(agentId: string): Promise<VapiCredentialsResponse> {
  if (!agentId) throw new Error("Agent ID is required");

  const res = await fetch(`${BASE_URL}/agent/${encodeURIComponent(agentId)}/vapi-credentials`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to fetch Vapi credentials");
  }

  return (data?.data ?? data) as VapiCredentialsResponse;
}

export interface SaveVapiCredentialsPayload {
  vapi_public_key: string;
  vapi_api_key: string;
  vapi_assistant_id: string;
}

export interface SaveVapiCredentialsResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Save Vapi credentials for an avatar agent
 * POST {{BaseUrl}}/avatar/agent/:agentId/vapi-credentials
 */
export async function saveVapiCredentials(
  agentId: string,
  payload: SaveVapiCredentialsPayload
): Promise<SaveVapiCredentialsResponse> {
  if (!agentId) throw new Error("Agent ID is required");

  const res = await fetch(`${BASE_URL}/agent/${encodeURIComponent(agentId)}/vapi-credentials`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to save Vapi credentials");
  }

  return data;
}

/**
 * Update Calendly event type for an avatar agent
 * PUT {{BaseUrl}}/avatar/agent/:agentId/calendly-event-type
 */
export async function updateCalendlyEventType(
  agentId: string,
  payload: { calendly_event_type: string }
): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  if (!agentId) throw new Error("Agent ID is required");

  const res = await fetch(`${BASE_URL}/agent/${encodeURIComponent(agentId)}/calendly-event-type`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to update Calendly event type");
  }

  return data;
}

/**
 * Sync VAPI Calendly tools for an avatar agent (call after calendly event type is saved)
 * POST {{BaseUrl}}/avatar/voice/:agentId/vapi-calendly-tools
 */
export async function syncVapiCalendlyTools(
  agentId: string
): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  if (!agentId) throw new Error("Agent ID is required");
  const res = await fetch(
    `${BASE_URL}/voice/${encodeURIComponent(agentId)}/vapi-calendly-tools`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { vapi_body?: { message?: string }; message?: string })?.vapi_body?.message ||
      (data as { message?: string })?.message ||
      "Failed to sync VAPI Calendly tools"
    );
  }
  return data;
}

/**
 * Update Calendly token for the current user
 * PUT {{BaseUrl}}/avatar/user/calendly-token
 */
export async function updateCalendlyToken(payload: {
  calendly_token: string;
}): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  const res = await fetch(`${BASE_URL}/user/calendly-token`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to update Calendly token");
  }

  return data;
}

/**
 * Authenticated user context (session enrichment).
 * GET `.../api/avatar/user/context` (relative to `VITE_API_BASE_URL`).
 */
export async function getAvatarUserContext(): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/user/context`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(extractApiErrorMessage(data, "Failed to load user context"));
  }

  return data;
}

/** Calendly API: GET /users/me response */
export interface CalendlyUserMeResponse {
  resource?: {
    uri?: string;
    name?: string;
    email?: string;
    scheduling_url?: string;
    [key: string]: unknown;
  };
}

/**
 * Calendly API: get current user (uses Calendly token, not app auth)
 */
export async function getCalendlyUserMe(calendlyToken: string): Promise<CalendlyUserMeResponse> {
  if (!calendlyToken?.trim()) throw new Error("Calendly token is required");
  // Use native fetch for third-party API to avoid triggering app logout on Calendly auth errors.
  const res = await globalThis.fetch("https://api.calendly.com/users/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${calendlyToken.trim()}`,
      Accept: "application/json",
    },
  });
  const data = (await res.json().catch(() => ({}))) as CalendlyUserMeResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data?.message || `Calendly API error: ${res.status}`);
  }
  return data;
}

/** Calendly API: GET /event_types response (collection of event types) */
export interface CalendlyEventTypesResponse {
  collection?: Array<{
    uri?: string;
    name?: string;
    scheduling_url?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Calendly API: list event types for a user
 * GET https://api.calendly.com/event_types?user=URI
 */
export async function getCalendlyEventTypes(
  calendlyToken: string,
  userUri: string
): Promise<CalendlyEventTypesResponse> {
  if (!calendlyToken?.trim()) throw new Error("Calendly token is required");
  if (!userUri?.trim()) throw new Error("User URI is required");
  const url = `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri.trim())}`;
  // Use native fetch for third-party API to avoid triggering app logout on Calendly auth errors.
  const res = await globalThis.fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${calendlyToken.trim()}`,
      Accept: "application/json",
    },
  });
  const data = (await res.json().catch(() => ({}))) as CalendlyEventTypesResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data?.message || `Calendly API error: ${res.status}`);
  }
  return data;
}

export interface DeleteChatHistoryResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Delete/clear chat history for an avatar agent
 */
export async function deleteChatHistory(
  avatarId: string
): Promise<{ success?: boolean }> {
  if (!avatarId) throw new Error("Avatar ID is required");

  const token = localStorage.getItem("qiko_session_token");
  if (!token) throw new Error("No session token found");

  const url = `${BASE_URL}/${avatarId}/chat-history`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    // Parse JSON safely
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Failed to delete chat history");
    }

    return data;
  } catch (err: any) {
    console.error("deleteChatHistory error:", err);
    // Throw a more readable error for UI
    throw new Error(
      err.message || "Network error: Unable to delete chat history"
    );
  }
}


export interface AvatarDocument {
  id?: string | number;
  agent_id?: number;
  agent_unique_id?: string;
  title?: string;
  description?: string;
  category?: string;
  extension_type?: string;
  file_name?: string;
  original_filename?: string;
  file_path?: string;
  file_type?: string;
  file_size?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  createdAt?: string;
}

/**
 * Vector metadata types for different vector types
 */
export interface VectorMetadataBase {
  agent_id: string;
}

export interface BehaviorMetadata extends VectorMetadataBase {
  type: 'prompt' | 'guardrail';
  title: string;
  description: string;
}

export interface FAQMetadata extends VectorMetadataBase {
  question: string;
  answer: string;
}

export interface WebsiteMetadata extends VectorMetadataBase {
  url: string;
  website_name: string;
}

export interface ChunkMetadata extends VectorMetadataBase {
  created_at: string;
  description: string;
  source: string; // The document filename (e.g., "filename.pdf")
  text: string;
  title: string;
}

export interface AgentMetadata extends VectorMetadataBase {
  about_yourself: string;
  agent_id: string;
  bio: string;
  created_at: string;
  description: string;
  expertise: string;
  headline: string;
  language: string;
  location: string;
  main_goal: string;
  max_response_length: number;
  more_info: string;
  name: string;
  personality: string;
  skills: string[];
  status: string;
  strength: string;
  target_audience: string;
  timezone: string;
  what_makes_you_unique: string;
}

export type VectorMetadata = 
  | BehaviorMetadata 
  | FAQMetadata 
  | WebsiteMetadata 
  | ChunkMetadata 
  | AgentMetadata;

/**
 * Vector item in the response
 */
export interface AvatarVector {
  id: string;
  metadata: VectorMetadata;
  score: number;
}

/**
 * Agent with vectors from details-multiple endpoint
 */
export interface AvatarAgentWithVectors {
  agent_id: string;
  vectors: AvatarVector[];
}

/**
 * Response from /avatar/details-multiple endpoint
 */
export interface AvatarDetailsMultipleResponse {
  success: boolean;
  data: {
    agents: AvatarAgentWithVectors[];
  };
  errors: any[];
  message: string;
  paging: any[];
}

/**
 * Document extracted from chunks
 */
export interface DocumentInfo {
  source: string; // Document filename
  agent_id: string;
  chunks: Array<{
    id: string;
    title: string;
    description: string;
    text: string;
    created_at: string;
  }>;
  totalChunks: number;
}

export interface UploadAvatarDocumentPayload {
  file: File;
  agent_unique_id: string;
  title: string;
  description: string;
  category?: string;
}

export interface UploadAvatarDocumentResponse {
  success?: boolean;
  message?: string;
  data?: AvatarDocument;
}

/**
 * Upload a document (PDF, DOC, or DOCX) for an avatar agent
 */
export async function uploadAvatarDocument(
  payload: UploadAvatarDocumentPayload
): Promise<UploadAvatarDocumentResponse> {
  const { file, agent_unique_id, title, description, category } = payload;

  // Validate file type (MIME and/or extension; .jsonl often has empty or wrong MIME)
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'application/csv',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/x-ndjson',
  ];
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.json', '.jsonl', '.csv', '.txt', '.md'];
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  const allowedByMime = allowedTypes.includes(file.type);
  const allowedByExt = allowedExtensions.includes(ext);

  if (!allowedByMime && !allowedByExt) {
    throw new Error('Invalid file type. Please select a valid file type (e.g. PDF, CSV, JSON, JSONL, TXT, MD).');
  }

  // Create FormData for file upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('agent_unique_id', agent_unique_id);
  formData.append('title', title || 'title');
  formData.append('description', description || 'description');
  if (category != null && category !== '') {
    formData.append('category', category);
  }

  const res = await fetch(`${BASE_URL}/${agent_unique_id}/upload-document`, {
    method: "POST",
    headers: getAuthOnlyHeaders(),
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Failed to upload document");
  }

  syncVapiAssistantPromptAfterResponse(agent_unique_id);
  return data;
}

/**
 * Get avatar details for multiple agents by their unique IDs
 * @param agentUniqueIds - Array of agent unique IDs
 */
export async function getAvatarDetailsMultiple(
  agentUniqueIds: string[]
): Promise<AvatarDetailsMultipleResponse> {
  // Build query string with array parameters
  const queryParams = agentUniqueIds
    .map(id => `agent_unique_ids[]=${encodeURIComponent(id)}`)
    .join('&');

  const res = await fetch(`${BASE_URL}/details-multiple?${queryParams}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch avatar details for multiple agents");
  }

  return data;
}

/**
 * Extract documents list from avatar details response
 * Groups chunks by their source document
 * @param response - Response from getAvatarDetailsMultiple
 */
export function extractDocumentsList(
  response: AvatarDetailsMultipleResponse
): DocumentInfo[] {
  const documentsMap = new Map<string, DocumentInfo>();

  // Process each agent
  response.data.agents.forEach(agent => {
    // Filter only chunk vectors
    const chunkVectors = agent.vectors.filter(vector => 
      vector.id.includes('-chunk-') && 
      'source' in vector.metadata
    );

    // Group chunks by source document
    chunkVectors.forEach(vector => {
      const metadata = vector.metadata as ChunkMetadata;
      const { source, agent_id, title, description, text, created_at } = metadata;

      // Create a unique key combining source and agent_id
      const key = `${agent_id}:${source}`;

      if (!documentsMap.has(key)) {
        documentsMap.set(key, {
          source,
          agent_id,
          chunks: [],
          totalChunks: 0,
        });
      }

      const doc = documentsMap.get(key)!;
      doc.chunks.push({
        id: vector.id,
        title,
        description,
        text,
        created_at,
      });
      doc.totalChunks = doc.chunks.length;
    });
  });

  return Array.from(documentsMap.values());
}

/**
 * Get documents list for specific agent(s)
 * Convenience function that combines getAvatarDetailsMultiple and extractDocumentsList
 * @param agentUniqueIds - Array of agent unique IDs
 */
export async function getAvatarDocumentsList(
  agentUniqueIds: string[]
): Promise<DocumentInfo[]> {
  const response = await getAvatarDetailsMultiple(agentUniqueIds);
  return extractDocumentsList(response);
}

/**
 * Delete a document by its ID
 * @param documentId - Document ID
 */
export async function deleteAvatarDocument(
  documentId: number | string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/document/${documentId}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "Failed to delete document");
  }

  return data;
}

/**
 * Response interface for getAvatarDocumentsListDirect
 */
export interface AvatarDocumentsListResponse {
  data: {
    documents: AvatarDocument[];
  };
}

/**
 * Get documents list for a specific agent (direct endpoint)
 * Fetches actual document records from the database
 * @param agentUniqueId - Agent unique ID (UUID)
 */
export async function getAvatarDocumentsListDirect(
  agentUniqueId: string
): Promise<AvatarDocument[]> {
  const res = await fetch(`${BASE_URL}/${agentUniqueId}/documents`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
    cache: "no-store",
  });

  const data: AvatarDocumentsListResponse = await res.json();

  if (!res.ok) {
    throw new Error(data?.data?.documents?.[0] as any || "Failed to fetch documents list");
  }

  return data?.data?.documents || [];
}

// ─── Subscription / Pricing ───────────────────────────────────────────────

/** Response shape: [{ id, name, price_id, amount, interval, display_price, description }] */
export interface SubscriptionPlan {
  id: number;
  name: string;
  price_id: string;
  amount: number;
  display_price?: string | number;
  interval: string;
  display_price?: string | number;
  description?: string;
  /**
   * API returns a JSON-string (or empty string) in `feature`.
   * Example: "[\"a\",\"b\"]"
   */
  feature?: string;
  /** Parsed `feature` into an array for UI rendering. */
  features?: string[];
}

/**
 * Get subscription / pricing plans
 * GET {{BaseUrl}}/avatar/subscription/plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const res = await fetch(`${BASE_URL}/subscription/plans`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null as any);

  if (!res.ok) {
    await handleUnauthorizedLogout(res);
    throw new Error((data as { message?: string })?.message || "Failed to fetch subscription plans");
  }

  const plans = (data?.data?.plans ?? []) as SubscriptionPlan[];
  return plans.map((plan) => {
    const rawAny: unknown = (plan as any)?.features ?? (plan as any)?.feature;

    const parsedFeatures =
      Array.isArray(rawAny)
        ? rawAny.filter((f): f is string => typeof f === "string" && f.trim().length > 0)
        : typeof rawAny === "string"
          ? (() => {
              const t = rawAny.trim();
              if (!t) return undefined;
              try {
                const parsed: unknown = JSON.parse(t);
                if (!Array.isArray(parsed)) return undefined;
                return parsed.filter((f): f is string => typeof f === "string" && f.trim().length > 0);
              } catch {
                return undefined;
              }
            })()
          : undefined;

    return {
      ...plan,
      name: plan.name === "Pro" ? "Premium" : plan.name,
      features: parsedFeatures,
    };
  });
}

/**
 * Create subscription checkout session
 * POST {{BaseUrl}}/avatar/subscription/checkout
 * Body: { price_id }
 * Response: { data: { checkout_url: string } }
 */
export async function createSubscriptionCheckout(price_id: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/subscription/checkout`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ price_id }),
  });

  const data = await res.json().catch(() => null as any);

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Checkout failed");
  }

  const url =
    (data as { data?: { checkout_url?: string } })?.data?.checkout_url ??
    (data as { checkout_url?: string })?.checkout_url;

  if (!url || typeof url !== "string") {
    throw new Error("No checkout URL in response");
  }

  return url;
}

/** Current subscription info for the logged-in user */
export interface CurrentSubscription {
  id?: number | string;
  tier?: string;
  plan_name?: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Get current subscription for the logged-in user
 * GET {{BaseUrl}}/avatar/subscription
 */
export async function getCurrentSubscription(): Promise<CurrentSubscription | null> {
  const res = await fetch(`${BASE_URL}/subscription`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null as any);

  if (!res.ok) {
    if (res.status === 404) return null;
    await handleUnauthorizedLogout(res);
    throw new Error((data as { message?: string })?.message || "Failed to fetch subscription");
  }

  const raw =
    (data as { data?: unknown; subscription?: unknown })?.data ??
    (data as { subscription?: unknown })?.subscription ??
    data;

  return raw && typeof raw === "object" ? (raw as CurrentSubscription) : null;
}

/**
 * Get Stripe customer portal URL for managing subscription
 * GET {{BaseUrl}}/avatar/subscription/portal
 * Response: { data: { portal_url: string } }
 */
export async function getSubscriptionPortalUrl(): Promise<string> {
  const res = await fetch(`${BASE_URL}/subscription/portal`, {
    method: "POST",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null as any);

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to get portal URL");
  }

  const url =
    (data as { data?: { portal_url?: string } })?.data?.portal_url ??
    (data as { portal_url?: string })?.portal_url;

  if (!url || typeof url !== "string") {
    throw new Error("No portal URL in response");
  }

  return url;
}




/**
 * Update Slack bot token for the current user
 * PUT {{BaseUrl}}/avatar/user/slack-bot-token
 */
export async function updateSlackBotToken(payload: {
  slack_token: string;
}): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  const res = await fetch(`${BASE_URL}/user/slack-token`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message || "Failed to update Slack bot token"
    );
  }

  return data;
}

/**
 * Update ClickUp credentials for the current user
 * PUT {{BaseUrl}}/avatar/user/clickup-credentials
 */
export async function updateClickUpCredentials(payload: {
  clickup_token: string;
  clickup_list_id: string;
  clickup_team_id: string;
}): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  const res = await fetch(`${BASE_URL}/user/clickup-credentials`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message || "Failed to update ClickUp credentials"
    );
  }

  return data;
}

/**
 * Update Gmail credentials for the current user
 * PUT {{BaseUrl}}/avatar/user/gmail-credentials
 */
export async function updateGmailCredentials(payload: {
  gmail_email: string;
  gmail_app_password: string;
  timezone?: string;
}): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  const res = await fetch(`${BASE_URL}/user/gmail-credentials`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to update Gmail credentials");
  }

  return data;
}

/**
 * Save Gmail config for a specific avatar agent
 * POST {{BaseUrl}}/avatar/agent/:agentId/gmail-config
 */
export async function saveAgentGmailConfig(
  agentId: string,
  payload: { gmail_email: string; gmail_app_password: string; timezone?: string }
): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  if (!agentId) throw new Error("Agent ID is required");

  const res = await fetch(`${BASE_URL}/agent/${encodeURIComponent(agentId)}/gmail-config`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to save Gmail config for agent");
  }

  return data;
}

/**
 * Get Gmail config for a specific avatar agent
 * GET {{BaseUrl}}/avatar/agent/:agentId/gmail-config
 */
export async function getAgentGmailConfig(
  agentId: string
): Promise<{ success?: boolean; message?: string; data?: unknown }> {
  if (!agentId) throw new Error("Agent ID is required");

  const res = await fetch(`${BASE_URL}/agent/${encodeURIComponent(agentId)}/gmail-config`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || "Failed to load Gmail config for agent");
  }

  return data;
}
