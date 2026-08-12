import { APIClient } from "./APIClient";
import { extractApiErrorMessage } from "./avatarApi";
import { appFetch } from "@/data/appFetch";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
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

const teamApiClientDeps = {
  baseUrl: BASE_URL,
  request: appFetch,
  getAuthHeaders,
  getJsonHeaders,
  extractApiErrorMessage,
};

export type TeamMemberRole = "viewer" | "editor" | "admin";

export interface CreateTeamMemberPayload {
  email: string;
  role: TeamMemberRole;
  user_name: string;
  /** Optional; invitees set their own password when accepting. */
  password?: string;
}

export interface CreateTeamMemberResponse {
  success?: boolean;
  data?: {
    id: number;
    team_id: number;
    user_id: number;
    role: string;
    status: string;
    invite_status: string;
    invited_at: string | null;
    accepted_at: string | null;
  };
  message?: string;
}

export interface TeamMemberApiItem {
  id: number;
  team_id?: number;
  user_id?: number;
  role: string;
  status: string;
  invite_status: string;
  invited_at: string | null;
  accepted_at: string | null;
  user: {
    id: number;
    user_name: string;
    email: string;
    type: string;
  };
}

export interface GetTeamMembersResponse {
  success: boolean;
  data?: {
    team?: {
      id: number;
      name: string;
      owner_user_id: number;
    };
    members: TeamMemberApiItem[];
  };
  message?: string;
}

export interface SendTeamMemberInviteResponse {
  success?: boolean;
  message?: string;
}

export interface UpdateTeamMemberRolePayload {
  role: TeamMemberRole;
}

export interface UpdateTeamMemberRoleResponse {
  success?: boolean;
  message?: string;
}

export interface DeleteTeamMemberResponse {
  success?: boolean;
  message?: string;
}

export interface AcceptTeamInviteResponse {
  success?: boolean;
  data?: {
    invite_status?: string;
    email?: string;
  };
  message?: string;
}

export interface SetTeamInvitePasswordPayload {
  token: string;
  password: string;
  password_confirmation: string;
}

export interface SetTeamInvitePasswordResponse {
  success?: boolean;
  message?: string;
}

export async function createTeamMember(
  payload: CreateTeamMemberPayload
): Promise<CreateTeamMemberResponse> {
  const apiClient = new APIClient("/team/members", {
    fallbackError: "Failed to create team member",
  }, teamApiClientDeps);

  return apiClient.post<CreateTeamMemberResponse>(payload);
}

/** Settings → Team: members only (excludes owner), matches live `/team/members`. */
export async function getTeamMembers(): Promise<GetTeamMembersResponse> {
  const apiClient = new APIClient("/team/members", {
    fallbackError: "Failed to fetch team members",
  }, teamApiClientDeps);

  return apiClient.get<GetTeamMembersResponse>();
}

/** Studio / assignees: includes owner for pickers and dashboards. */
export async function getAllMembersIncludeOwner(): Promise<GetTeamMembersResponse> {
  const apiClient = new APIClient("/team/getAllMembersIncludeOwner", {
    fallbackError: "Failed to fetch team members",
  }, teamApiClientDeps);

  return apiClient.get<GetTeamMembersResponse>();
}

export async function sendTeamMemberInvite(
  memberId: string | number
): Promise<SendTeamMemberInviteResponse> {
  const apiClient = new APIClient(`/team/members/${memberId}/send-invite`, {
    fallbackError: "Failed to send invite",
  }, teamApiClientDeps);

  return apiClient.post<SendTeamMemberInviteResponse>();
}

export async function updateTeamMemberRoleApi(
  memberId: string | number,
  payload: UpdateTeamMemberRolePayload
): Promise<UpdateTeamMemberRoleResponse> {
  const apiClient = new APIClient(`/team/members/${memberId}/role`, {
    fallbackError: "Failed to update team member role",
  }, teamApiClientDeps);

  return apiClient.put<UpdateTeamMemberRoleResponse>(payload);
}

export async function deleteTeamMemberApi(
  memberId: string | number
): Promise<DeleteTeamMemberResponse> {
  const apiClient = new APIClient(`/team/members/${memberId}`, {
    fallbackError: "Failed to delete team member",
  }, teamApiClientDeps);

  return apiClient.delete<DeleteTeamMemberResponse>();
}

export async function acceptTeamInvite(
  token: string
): Promise<AcceptTeamInviteResponse> {
  const apiClient = new APIClient(`/team/invite/accept?token=${encodeURIComponent(token)}`, {
    auth: false,
    fallbackError: "Failed to accept team invite",
  }, teamApiClientDeps);

  return apiClient.get<AcceptTeamInviteResponse>();
}

export async function setTeamInvitePassword(
  payload: SetTeamInvitePasswordPayload
): Promise<SetTeamInvitePasswordResponse> {
  const apiClient = new APIClient("/team/invite/set-password", {
    auth: false,
    fallbackError: "Failed to set invite password",
  }, teamApiClientDeps);

  return apiClient.post<SetTeamInvitePasswordResponse>(payload);
}

export interface QuestionAssignmentDashboardSection {
  section_id: string;
  section_title: string;
  rfp_title: string;
  due_at: string;
}

export interface QuestionAssignmentDashboardMember {
  team_member_id: number;
  user: {
    id: number;
    user_name: string;
    email: string;
    initials: string;
  };
  role: string;
  sections: QuestionAssignmentDashboardSection[];
  assigned: number;
  completed: number;
  pending: number;
  progress: number;
  status: string;
}

export interface GetQuestionAssignmentsDashboardResponse {
  success: boolean;
  data?: {
    members: QuestionAssignmentDashboardMember[];
  };
  errors: unknown[];
  message: string;
  paging: unknown[];
}

export async function getQuestionAssignmentsDashboard(
  agentUniqueId: string
): Promise<GetQuestionAssignmentsDashboardResponse> {
  if (!BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not defined in .env");
  }

  const trimmedAgentUniqueId = agentUniqueId.trim();
  if (!trimmedAgentUniqueId) {
    throw new Error("agent_unique_id is required to fetch question assignments dashboard.");
  }

  const apiClient = new APIClient(
    `/team/question-assignments/dashboard?agent_unique_id=${encodeURIComponent(trimmedAgentUniqueId)}`,
    {
      fallbackError: "Failed to fetch question assignments dashboard",
    },
    teamApiClientDeps
  );

  return apiClient.get<GetQuestionAssignmentsDashboardResponse>();
}

export interface QuestionAssignmentAssignee {
  id: number;
  user_name: string;
  email?: string;
}

export interface QuestionAssignmentItem {
  id?: number;
  pack_id?: string;
  section_id?: string | number;
  section_title?: string;
  assignee: QuestionAssignmentAssignee;
  due_at: string;
}

export interface GetQuestionAssignmentsResponse {
  success: boolean;
  data?: {
    assignments: Record<string, QuestionAssignmentItem[]>;
  };
  errors?: unknown[];
  message?: string;
}

export async function getQuestionAssignments(): Promise<GetQuestionAssignmentsResponse> {
  if (!BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not defined in .env");
  }

  const apiClient = new APIClient("/team/question-assignments", {
    fallbackError: "Failed to fetch question assignments",
  }, teamApiClientDeps);

  return apiClient.get<GetQuestionAssignmentsResponse>();
}

export interface DeleteQuestionAssignmentsResponse {
  success?: boolean;
  message?: string;
}

export async function deleteQuestionAssignments(
  id: string | number
): Promise<DeleteQuestionAssignmentsResponse> {
  if (!BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not defined in .env");
  }

  const trimmedId = String(id).trim();
  if (!trimmedId) {
    throw new Error("id is required to delete question assignments.");
  }

  const apiClient = new APIClient(`/team/question-assignments/pack/${encodeURIComponent(trimmedId)}`, {
    fallbackError: "Failed to delete question assignments",
  }, teamApiClientDeps);

  return apiClient.delete<DeleteQuestionAssignmentsResponse>();
}

export async function deleteQuestionAssignmentsBySection(
  sectionId: string | number
): Promise<DeleteQuestionAssignmentsResponse> {
  if (!BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not defined in .env");
  }

  const trimmedSectionId = String(sectionId).trim();
  if (!trimmedSectionId) {
    throw new Error("sectionId is required to delete question assignments.");
  }

  const apiClient = new APIClient(
    `/team/question-assignments/section/${encodeURIComponent(trimmedSectionId)}`,
    {
      fallbackError: "Failed to delete section question assignments",
    },
    teamApiClientDeps
  );

  return apiClient.delete<DeleteQuestionAssignmentsResponse>();
}

export interface BulkAssignmentSectionPayload {
  section_id: string;
  title: string;
  assignee_user_id: number;
  due_at: string;
  questions: string[];
}

export interface BulkAssignmentsPayload {
  agent_unique_id: string;
  rfp_title: string;
  pack_id: string;
  sections: BulkAssignmentSectionPayload[];
}

export interface BulkAssignmentsResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

export async function createBulkAssignments(
  payload: BulkAssignmentsPayload
): Promise<BulkAssignmentsResponse> {
  if (!BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not defined in .env");
  }

  const apiClient = new APIClient("/team/assignments/bulk", {
    fallbackError: "Failed to confirm assignments",
  }, teamApiClientDeps);

  return apiClient.post<BulkAssignmentsResponse>(payload);
}

export interface SendQuestionAssignmentReminderPayload {
  assignee_user_id: number;
  agent_unique_id: string;
}

export interface SendQuestionAssignmentReminderResponse {
  success?: boolean;
  message?: string;
}

export async function sendQuestionAssignmentReminder(
  payload: SendQuestionAssignmentReminderPayload
): Promise<SendQuestionAssignmentReminderResponse> {
  if (!BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not defined in .env");
  }

  const apiClient = new APIClient("/team/question-assignments/send-reminder", {
    fallbackError: "Failed to send reminder",
  }, teamApiClientDeps);

  return apiClient.post<SendQuestionAssignmentReminderResponse>(payload);
}

