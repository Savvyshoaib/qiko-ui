/**
 * Cross-subdomain “logged in” hint so the marketing site can show “Go to dashboard”.
 * The real session token stays in localStorage on the app origin only.
 *
 * ## Why two cookie names?
 * `Domain=.qiko.ai` applies to **every** subdomain. One shared name would make a stage
 * login look “logged in” on production (and the reverse). We use **different cookie names**
 * per environment on the same parent domain.
 *
 * | Environment | App              | Landing           | Cookie name              |
 * |-------------|------------------|-------------------|--------------------------|
 * | LIVE        | app.qiko.ai      | www.qiko.ai       | `qiko_logged_in`         |
 * | STAGE       | stage-app.qiko.ai| stage.qiko.ai     | `stage_logged_in`        |
 *
 * On each site, only check the cookie for **that** environment (see `getCrossSiteLoggedInCookieName()`).
 *
 * Overrides:
 * - `VITE_AUTH_LOGGED_IN_COOKIE_NAME` — force cookie name (e.g. local testing).
 * - `VITE_AUTH_COOKIE_DOMAIN` — force Domain= (default: `.qiko.ai` when host ends with `qiko.ai`).
 */
const COOKIE_NAME = import.meta.env.VITE_ENV === "stage" ? "stage_logged_in" : "qiko_logged_in";
const COOKIE_VALUE = "1";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

/** Cookie name the current app + matching landing should use (exported for Next.js parity). */
export function getCrossSiteLoggedInCookieName(): string {
  const fromEnv = import.meta.env.VITE_AUTH_LOGGED_IN_COOKIE_NAME;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }
  if (typeof window === "undefined") {
    return "qiko_logged_in";
  }
  const host = window.location.hostname.toLowerCase();
  if (host.startsWith("stage.") || host.startsWith("stage-")) {
    return "stage_logged_in";
  }
  return "qiko_logged_in";
}

function getCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const fromEnv = import.meta.env.VITE_AUTH_COOKIE_DOMAIN;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }
  const host = window.location.hostname;
  if (host === "qiko.ai" || host.endsWith(".qiko.ai")) {
    return ".qiko.ai";
  }
  return undefined;
}

function buildCookieString(opts: { name: string; maxAge: number; value?: string }): string {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const parts = [
    opts.value !== undefined ? `${opts.name}=${opts.value}` : `${opts.name}=`,
    "Path=/",
    `Max-Age=${opts.maxAge}`,
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  const domain = getCookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join("; ");
}

export function setCrossSiteLoggedInCookie(): void {
  if (typeof document === "undefined") return;
  const name = getCrossSiteLoggedInCookieName();
  document.cookie = buildCookieString({ name, maxAge: MAX_AGE_SECONDS, value: COOKIE_VALUE });
}

export function clearCrossSiteLoggedInCookie(): void {
  if (typeof document === "undefined") return;
  const name = getCrossSiteLoggedInCookieName();
  document.cookie = buildCookieString({ name, maxAge: 0, value: "" });
}
