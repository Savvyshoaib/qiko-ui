import { clearCrossSiteLoggedInCookie } from "@/lib/crossSiteAuthCookie";

const LOGIN_PATH = "/login";

type GuardConfig = {
  enabled: boolean;
  redirectPath: string;
};

const config: GuardConfig = {
  enabled: true,
  redirectPath: LOGIN_PATH,
};

let installed = false;
let originalFetch: typeof window.fetch | null = null;

function clearAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("qiko_session_token");
  localStorage.removeItem("qiko_user_info");
  localStorage.removeItem("qiko_subscription");
  localStorage.removeItem("qiko_calendly_token");
  clearCrossSiteLoggedInCookie();
}

function forceLogout() {
  if (typeof window === "undefined") return;
  clearAuthStorage();
  if (window.location.pathname !== config.redirectPath) {
    window.location.href = config.redirectPath;
  }
}

function responseLooksUnauthorizedPayload(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  const successFalse = obj.success === false;
  const code = obj.status_code ?? obj.status ?? obj.code;
  return successFalse && Number(code) === 401;
}

export function installUnauthorizedLogoutGuard() {
  if (typeof window === "undefined" || installed) return;
  originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch!(...args);
    if (!config.enabled) return response;

    if (response.status === 401) {
      forceLogout();
      return response;
    }

    try {
      const cloned = response.clone();
      const data = await cloned.json();
      if (responseLooksUnauthorizedPayload(data)) {
        forceLogout();
      }
    } catch {
      // Ignore non-JSON responses and body read errors.
    }

    return response;
  };

  installed = true;
}

export function uninstallUnauthorizedLogoutGuard() {
  if (typeof window === "undefined" || !installed || !originalFetch) return;
  window.fetch = originalFetch;
  installed = false;
}

export function enableUnauthorizedAutoLogout() {
  config.enabled = true;
}

export function disableUnauthorizedAutoLogout() {
  config.enabled = false;
}

export function setUnauthorizedAutoLogoutRedirect(path: string) {
  config.redirectPath = path?.trim() || LOGIN_PATH;
}

export function isUnauthorizedAutoLogoutEnabled() {
  return config.enabled;
}

