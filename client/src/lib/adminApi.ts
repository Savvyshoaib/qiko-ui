import { appFetch } from "@/data/appFetch";
const DEFAULT_ADMIN_API_BASE = "https://admin-backend.qiko.ai";

function getAdminApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined)?.trim();
  return (fromEnv || DEFAULT_ADMIN_API_BASE).replace(/\/$/, "");
}

export type AcceptCustomerInvitePayload = {
  email: string;
  customer_unique_id: string;
  password: string;
  password_confirmation: string;
};

export type AcceptCustomerInviteResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  const msg = o.message ?? o.error;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(o.errors) && o.errors.length > 0 && typeof o.errors[0] === "string") {
    return o.errors[0];
  }
  return fallback;
}

/**
 * POST /api/v1/admin/customer/accept-invite
 * Public invite acceptance (query params from email link).
 */
export async function acceptCustomerInvite(
  payload: AcceptCustomerInvitePayload
): Promise<AcceptCustomerInviteResponse> {
  const email = payload.email?.trim();
  const customer_unique_id = payload.customer_unique_id?.trim();
  const password = payload.password;
  const password_confirmation = payload.password_confirmation;
  if (!email) throw new Error("email is required");
  if (!customer_unique_id) throw new Error("customer_unique_id is required");
  if (!password) throw new Error("password is required");
  if (!password_confirmation) throw new Error("password confirmation is required");

  const url = `${getAdminApiBaseUrl()}/api/v1/admin/customer/accept-invite`;
  const res = await appFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, customer_unique_id, password, password_confirmation }),
  });

  let body: unknown = null;
  try {
    const text = await res.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new Error(extractErrorMessage(body, `Invite acceptance failed (${res.status})`));
  }

  return (body && typeof body === "object" ? body : {}) as AcceptCustomerInviteResponse;
}
