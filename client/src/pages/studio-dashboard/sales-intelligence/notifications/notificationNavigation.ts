import type { SalesNotificationType } from "./types";

/** Studio Sales Intelligence use-case ids for notification deep links. */
export const NOTIFICATION_USE_CASE_IDS = {
  pipeline: "si1",
  salesforceLog: "si4",
  scanHistory: "si7",
} as const;

/**
 * Maps notification type → screen to open on click.
 * - review / deadline → Opportunity Pipeline
 * - salesforce sync → Salesforce Push Log
 * - scan → History Scan
 */
export function useCaseIdForNotificationType(
  type: SalesNotificationType
): string {
  switch (type) {
    case "review_required":
    case "deadline_reminder":
      return NOTIFICATION_USE_CASE_IDS.pipeline;
    case "sf_sync_success":
    case "sf_sync_failed":
      return NOTIFICATION_USE_CASE_IDS.salesforceLog;
    case "scan_success":
    case "scan_failed":
      return NOTIFICATION_USE_CASE_IDS.scanHistory;
    default:
      return NOTIFICATION_USE_CASE_IDS.pipeline;
  }
}
