/**
 * Application data services — UI and features should depend on these,
 * not on mock-data.json directly. When VITE_USE_MOCK_DATA=true, data comes
 * from the centralized JSON. When false, callers use existing API modules
 * (avatarApi, idgSalesApi, etc.) which hit the network.
 */
export { isMockDataEnabled } from "../isMockEnabled";
export { appFetch } from "../appFetch";
export {
  getMockData,
  findMockAuthUser,
  findMockAuthUserByToken,
  type MockDataRoot,
  type MockAuthUser,
} from "../mockRepository";

import { getMockData } from "../mockRepository";
import { isMockDataEnabled } from "../isMockEnabled";

export function getDashboardMock() {
  return getMockData().dashboard;
}

export function getAgentsMock() {
  return getMockData().agents;
}

export function getStudioUserMock() {
  return getMockData().studioUser;
}

export function getTeamMembersMock() {
  return getMockData().team.members;
}

export function getAssignmentsMock() {
  return getMockData().assignments;
}

export function getSalesIntelMock() {
  return getMockData().salesIntel;
}

export function getFinancialMock() {
  return getMockData().financial;
}

export function getCrmMock() {
  return getMockData().crm;
}

export function getFormsMock() {
  return getMockData().forms;
}

export function getResearchMock() {
  return getMockData().research;
}

export function getRfpMock() {
  return getMockData().rfp;
}

/** Prefer this helper in UI that still seeds from mock JSON when the flag is on. */
export function requireMockOrEmpty<T>(getter: () => T, empty: T): T {
  if (!isMockDataEnabled()) return empty;
  return getter();
}
