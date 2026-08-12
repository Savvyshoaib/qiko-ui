/**
 * Feature flag for the centralized mock-data system.
 * When true, services serve data from mock-data.json and skip network calls.
 */
export function isMockDataEnabled(): boolean {
  const raw = (import.meta.env.VITE_USE_MOCK_DATA as string | undefined)?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

if (import.meta.env.DEV && isMockDataEnabled()) {
  // Visible in browser console so QA can confirm the flag loaded for this Vite mode.
  console.info("[qiko-mock] VITE_USE_MOCK_DATA is ON — all API traffic is served from mock-data.json");
}
