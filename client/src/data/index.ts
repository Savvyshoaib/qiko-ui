/**
 * Central mock-data system.
 *
 * - Toggle: VITE_USE_MOCK_DATA=true|false
 * - Source of truth: ./mock-data.json (only mock JSON in the app)
 * - UI / features: import from ./services (or keep using API modules —
 *   they route through appFetch and short-circuit when mock is on)
 */
export { isMockDataEnabled } from "./isMockEnabled";
export { appFetch } from "./appFetch";
export { getMockData, findMockAuthUser, findMockAuthUserByToken } from "./mockRepository";
export * from "./services";
