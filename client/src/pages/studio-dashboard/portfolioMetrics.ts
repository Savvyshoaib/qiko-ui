export interface OutcomeMetric {
  value: string;
  label: string;
  trend?: string;
  trendUp?: boolean;
  tone?: "default" | "success" | "warning" | "danger";
}

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  action: string;
}

export interface InsightItem {
  id: string;
  category: "risk" | "opportunity" | "trend" | "recommendation" | "action";
  title: string;
  narrative: string;
  metricRef?: string;
  suggestedAction: string;
}

export const OVERVIEW_HEADLINE = {
  status: "Needs attention before next deadline",
  summary:
    "Two active NHS bids are progressing, but readiness is uneven. Compliance and evidence gaps on the Manned Guarding response are the main blockers before the 24 May deadline.",
  period: "Last updated 2h ago · Q2 2026",
};

export const OVERVIEW_PRIMARY_METRICS: OutcomeMetric[] = [
  {
    value: "68%",
    label: "Avg Submission Readiness",
    trend: "↑ 12 pts vs last month",
    trendUp: true,
    tone: "success",
  },
  {
    value: "£8.2M",
    label: "Pipeline Under Review",
    trend: "2 active opportunities",
    trendUp: true,
    tone: "default",
  },
  {
    value: "86%",
    label: "Compliance Coverage",
    trend: "mandatory requirements",
    trendUp: true,
    tone: "success",
  },
  {
    value: "72%",
    label: "Evidence-Backed Answers",
    trend: "↑ from 58%",
    trendUp: true,
    tone: "success",
  },
];

export const OVERVIEW_ATTENTION_METRICS: OutcomeMetric[] = [
  {
    value: "15",
    label: "High-Risk Sections",
    trend: "require immediate review",
    trendUp: false,
    tone: "danger",
  },
  {
    value: "5",
    label: "Evidence Gaps",
    trend: "no KB source linked",
    trendUp: false,
    tone: "warning",
  },
  {
    value: "2",
    label: "Critical Unowned",
    trend: "Compliance & Pricing",
    trendUp: false,
    tone: "danger",
  },
  {
    value: "4",
    label: "Blocked Sections",
    trend: "awaiting input",
    trendUp: false,
    tone: "warning",
  },
];

export const OVERVIEW_WIN_LOSS_METRICS: OutcomeMetric[] = [
  {
    value: "12",
    label: "RFPs Submitted",
    trend: "this month",
    trendUp: true,
    tone: "default",
  },
  {
    value: "61%",
    label: "Win Rate (Tracked)",
    trend: "11 of 18 outcomes known",
    trendUp: true,
    tone: "success",
  },
  {
    value: "78%",
    label: "Win Probability",
    trend: "across active opportunities",
    trendUp: true,
    tone: "success",
  },
  {
    value: "4",
    label: "Lessons Added to KB",
    trend: "from post-bid reviews",
    trendUp: true,
    tone: "default",
  },
];

export const OVERVIEW_TEAM_METRICS: OutcomeMetric[] = [
  {
    value: "9/12",
    label: "Sections Assigned",
    trend: "75% ownership coverage",
    trendUp: true,
    tone: "success",
  },
  {
    value: "3",
    label: "Reviewers Active",
    trend: "Ronan, Sarah, James",
    trendUp: true,
    tone: "default",
  },
  {
    value: "4.8 days",
    label: "Avg Draft Turnaround",
    trend: "↓ 24% vs manual baseline",
    trendUp: true,
    tone: "success",
  },
  {
    value: "82%",
    label: "Review Completion",
    trend: "sections reviewed on time",
    trendUp: true,
    tone: "success",
  },
];

export const OVERVIEW_ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: "a1",
    title: "NHS Manned Guarding — submission readiness at 62%",
    detail: "5 evidence gaps and 2 mandatory requirements still unresolved with 8 days to deadline.",
    severity: "high",
    action: "Prioritise compliance & pricing sections",
  },
  {
    id: "a2",
    title: "Pricing section unowned and blocked",
    detail: "Commercial input required before draft can progress. No assignee on critical path.",
    severity: "high",
    action: "Assign owner in Section Assignment",
  },
  {
    id: "a3",
    title: "3 disqualifier risks flagged",
    detail: "Mandatory pass/fail requirements lack evidence or contradict KB content.",
    severity: "high",
    action: "Run Compliance Checker review",
  },
  {
    id: "a4",
    title: "12 stale KB items flagged",
    detail: "Certificates and policies may be outdated for Security & Compliance responses.",
    severity: "medium",
    action: "Refresh knowledge base evidence",
  },
  {
    id: "a5",
    title: "Security Approach at risk",
    detail: "Sarah's section has 2 gaps and blocked status pending specialist input.",
    severity: "medium",
    action: "Escalate to operations lead",
  },
];

export const OVERVIEW_PROGRESS_TRENDS = [
  { label: "Submission readiness", current: "68%", previous: "56%", direction: "up" as const },
  { label: "Compliance coverage", current: "86%", previous: "79%", direction: "up" as const },
  { label: "Evidence-backed rate", current: "72%", previous: "58%", direction: "up" as const },
  { label: "Draft turnaround", current: "4.8 days", previous: "6.3 days", direction: "up" as const },
  { label: "Critical gaps open", current: "15", previous: "22", direction: "up" as const },
  { label: "KB reuse in drafts", current: "68%", previous: "54%", direction: "up" as const },
];

export const AI_INSIGHTS_NARRATIVE = {
  title: "Portfolio briefing",
  summary:
    "Your pre-sales pipeline is moving faster than last quarter, but the NHS Manned Guarding bid needs focused attention before deadline. Readiness and compliance are improving overall, yet unowned commercial sections and evidence gaps remain the primary bottlenecks.",
  confidence: "Based on 2 active bids, 847 KB items, and 18 tracked submissions",
};

export const AI_INSIGHTS_ITEMS: InsightItem[] = [
  {
    id: "i1",
    category: "risk",
    title: "Deadline risk on NHS Manned Guarding",
    narrative:
      "Submission readiness is 62% with 8 days remaining. At the current pace, mandatory compliance items may not be covered before review lock. This is the highest-impact risk in the portfolio.",
    metricRef: "62% readiness · 8 days to deadline",
    suggestedAction: "Reassign Pricing and Compliance owners today and schedule a gap-closure session.",
  },
  {
    id: "i2",
    category: "action",
    title: "15 high-risk sections need review",
    narrative:
      "These sections combine low evidence coverage, unassigned ownership, or mandatory gaps. They represent the bulk of submission risk across active bids.",
    metricRef: "15 high-risk sections",
    suggestedAction: "Open Section Assignment and clear critical unowned sections first.",
  },
  {
    id: "i3",
    category: "trend",
    title: "Draft turnaround improved 24%",
    narrative:
      "Average time from upload to review-ready draft dropped from 6.3 to 4.8 days. Knowledge reuse in active drafts rose to 68%, indicating the KB investment is paying off.",
    metricRef: "4.8 days avg turnaround · 68% KB reuse",
    suggestedAction: "Maintain momentum — prioritise evidence linking on remaining gaps.",
  },
  {
    id: "i4",
    category: "opportunity",
    title: "£8.2M pipeline with strong win signals",
    narrative:
      "Active opportunities show 78% modelled win probability where outcomes are tracked. Win rate on known outcomes is 61% — above the 42% baseline from last year.",
    metricRef: "£8.2M pipeline · 78% win probability",
    suggestedAction: "Prioritise senior review on the NHS bid to protect the largest near-term value.",
  },
  {
    id: "i5",
    category: "recommendation",
    title: "Close evidence gaps before compliance sign-off",
    narrative:
      "72% of generated answers are source-backed, but 5 mandatory items on the primary bid still lack linked certificates or case studies. Disqualifier risk remains at 3 items.",
    metricRef: "72% evidence-backed · 3 disqualifier risks",
    suggestedAction: "Run Compliance Checker and attach missing documents from Knowledge Base.",
  },
  {
    id: "i6",
    category: "trend",
    title: "Team load is uneven",
    narrative:
      "Ronan holds 7 of 9 assigned sections while Lisa has no active assignments. Blocked pricing work may stall without commercial coverage.",
    metricRef: "3 reviewers active · 4 blocked sections",
    suggestedAction: "Rebalance assignments and activate Lisa for Pricing & Commercial.",
  },
  {
    id: "i7",
    category: "recommendation",
    title: "Win/Loss learning loop is working",
    narrative:
      "11 of 18 submitted bids have recorded outcomes. Four lessons were added to KB after recent losses — pricing evidence was the top gap.",
    metricRef: "11 known outcomes · Top gap: Pricing",
    suggestedAction: "Review Win/Loss tags before the next pricing section draft.",
  },
];
