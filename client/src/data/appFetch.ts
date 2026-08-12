import { isMockDataEnabled } from "./isMockEnabled";
import { handleMockHttpRequest } from "./mockHttp";

/**
 * Application fetch entry point.
 * When VITE_USE_MOCK_DATA is true, serves responses from mock-data.json (no network).
 * When false, uses the real fetch (existing / future APIs).
 */
export async function appFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (isMockDataEnabled()) {
    return handleMockHttpRequest(input, init);
  }
  return globalThis.fetch(input, init);
}
