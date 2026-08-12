import type { Opportunity } from "./salesIntelTypes";
import { daysUntil } from "./salesIntelUtils";

export const DEADLINE_FILTER_OPTIONS = [
  { id: "1_day", label: "1 day", withinDays: 1 },
  { id: "1_week", label: "1 week", withinDays: 7 },
  { id: "1_month", label: "1 month", withinDays: 30 },
  { id: "none", label: "No Deadline", withinDays: null },
] as const;

export type DeadlineFilterId = (typeof DEADLINE_FILTER_OPTIONS)[number]["id"];

export type OpportunityFilterState = {
  searchQuery: string;
  /** Lowercased sourceKey (or normalized source). null = all sources. */
  sourceKey: string | null;
  /** null = any deadline. */
  deadlineFilter: DeadlineFilterId | null;
  /**
   * Assigned reviewer filter.
   * null = all; "__unassigned__" = no reviewer; otherwise assignedReviewerId as string.
   */
  reviewerId: string | null;
};

export function opportunitySourceKey(item: Opportunity): string {
  const key = (item.sourceKey ?? "").trim().toLowerCase();
  if (key) return key;
  return (item.source ?? "").trim().toLowerCase();
}

export function opportunitySourceLabel(item: Opportunity): string {
  const key = (item.sourceKey ?? "").trim();
  if (key) return key.toUpperCase();
  const name = (item.source ?? "").trim();
  return name || "Unknown";
}

export function matchesOpportunitySearch(item: Opportunity, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (item.title ?? "").toLowerCase().includes(q) ||
    (item.buyer ?? "").toLowerCase().includes(q) ||
    (item.source ?? "").toLowerCase().includes(q) ||
    (item.sourceKey ?? "").toLowerCase().includes(q)
  );
}

export function matchesOpportunitySource(item: Opportunity, sourceKey: string | null): boolean {
  if (!sourceKey) return true;
  return opportunitySourceKey(item) === sourceKey;
}

export function matchesOpportunityDeadline(
  item: Opportunity,
  deadlineFilter: DeadlineFilterId | null
): boolean {
  if (deadlineFilter == null) return true;

  if (deadlineFilter === "none") {
    const raw = (item.deadlineAt ?? "").trim();
    return raw === "";
  }

  const option = DEADLINE_FILTER_OPTIONS.find((entry) => entry.id === deadlineFilter);
  const withinDays = option?.withinDays;
  if (withinDays == null) return true;

  const days = daysUntil(item.deadlineAt);
  if (days == null) return false;
  return days >= 0 && days <= withinDays;
}

export const UNASSIGNED_REVIEWER_FILTER = "__unassigned__";

export function matchesOpportunityReviewer(
  item: Opportunity,
  reviewerId: string | null
): boolean {
  if (reviewerId == null) return true;
  if (reviewerId === UNASSIGNED_REVIEWER_FILTER) {
    return item.assignedReviewerId == null;
  }
  return String(item.assignedReviewerId ?? "") === reviewerId;
}

export function filterOpportunities(
  items: Opportunity[],
  filters: OpportunityFilterState
): Opportunity[] {
  return items.filter(
    (item) =>
      matchesOpportunitySearch(item, filters.searchQuery) &&
      matchesOpportunitySource(item, filters.sourceKey) &&
      matchesOpportunityDeadline(item, filters.deadlineFilter) &&
      matchesOpportunityReviewer(item, filters.reviewerId)
  );
}

export type SourceFilterOption = {
  key: string;
  label: string;
  count: number;
};

export type ReviewerFilterOption = {
  id: string;
  label: string;
  count: number;
};

/** Unique sources present in the loaded opportunities (dynamic — not a static TED/UNGM list). */
export function buildSourceFilterOptions(items: Opportunity[]): SourceFilterOption[] {
  const byKey = new Map<string, SourceFilterOption>();
  for (const item of items) {
    const key = opportunitySourceKey(item);
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(key, { key, label: opportunitySourceLabel(item), count: 1 });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label));
}

/** Unique assigned reviewers in the loaded opportunities (plus unassigned count). */
export function buildReviewerFilterOptions(items: Opportunity[]): ReviewerFilterOption[] {
  const byId = new Map<string, ReviewerFilterOption>();
  let unassigned = 0;

  for (const item of items) {
    if (item.assignedReviewerId == null) {
      unassigned += 1;
      continue;
    }
    const id = String(item.assignedReviewerId);
    const label =
      (item.assignedReviewer ?? "").trim() ||
      (item.assignedReviewerEmail ?? "").trim() ||
      `User #${id}`;
    const existing = byId.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      byId.set(id, { id, label, count: 1 });
    }
  }

  const reviewers = Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
  if (unassigned > 0) {
    reviewers.unshift({
      id: UNASSIGNED_REVIEWER_FILTER,
      label: "Unassigned",
      count: unassigned,
    });
  }
  return reviewers;
}
