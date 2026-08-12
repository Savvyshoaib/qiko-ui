import { useMemo, useState } from "react";
import { Bell, ChevronRight, Users } from "lucide-react";
import { toast } from "sonner";
import type {
  QuestionAssignmentDashboardMember,
  QuestionAssignmentDashboardSection,
} from "@/lib/TeamApi";
import { sendQuestionAssignmentReminder } from "@/lib/TeamApi";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getAssignmentsMock, isMockDataEnabled } from "@/data/services";

export type SectionAssignmentStatus = "assigned" | "ai_drafted" | "awaiting_review" | "completed";

export type TeamMemberProgressStatus = "complete" | "pending" | "review_due" | "overdue";

export interface AssignmentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
  active: boolean;
}

export interface AssignmentRfp {
  id: string;
  title: string;
  client: string;
  country: string;
  deadline: string;
  status: string;
}

export interface SectionAssignment {
  id: string;
  userId: string;
  rfpId: string;
  sectionName: string;
  sectionType: string;
  status: SectionAssignmentStatus;
  dueDate: string;
}

export interface UserAssignmentSummary {
  user: AssignmentUser;
  totalAssigned: number;
  completedCount: number;
  pendingCount: number;
  awaitingReviewCount: number;
  overdueCount: number;
  progressPercent: number;
  progressStatus: TeamMemberProgressStatus;
  assignments: SectionAssignment[];
}

export const MOCK_ASSIGNMENT_USERS: AssignmentUser[] = isMockDataEnabled()
  ? (getAssignmentsMock().users as AssignmentUser[])
  : [];

export const MOCK_ASSIGNMENT_RFPS: AssignmentRfp[] = isMockDataEnabled()
  ? (getAssignmentsMock().rfps as AssignmentRfp[])
  : [];

export const MOCK_SECTION_ASSIGNMENTS: SectionAssignment[] = isMockDataEnabled()
  ? (getAssignmentsMock().sections as SectionAssignment[])
  : [];

function isAssignmentOverdue(dueDate: string, status: SectionAssignmentStatus): boolean {
  if (status === "completed") return false;
  const due = new Date(`${dueDate}T23:59:59`);
  return !Number.isNaN(due.getTime()) && due < new Date();
}

function isPendingStatus(status: SectionAssignmentStatus): boolean {
  return status === "assigned" || status === "ai_drafted" || status === "awaiting_review";
}

export function buildUserAssignmentSummaries(
  users: AssignmentUser[],
  assignments: SectionAssignment[]
): UserAssignmentSummary[] {
  return users
    .filter((user) => user.active)
    .map((user) => {
      const userAssignments = assignments.filter((item) => item.userId === user.id);
      const completedCount = userAssignments.filter((item) => item.status === "completed").length;
      const awaitingReviewCount = userAssignments.filter((item) => item.status === "awaiting_review").length;
      const overdueCount = userAssignments.filter((item) => isAssignmentOverdue(item.dueDate, item.status)).length;
      const pendingCount = userAssignments.filter((item) => isPendingStatus(item.status)).length;
      const totalAssigned = userAssignments.length;
      const progressPercent =
        totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

      let progressStatus: TeamMemberProgressStatus = "complete";
      if (overdueCount > 0) progressStatus = "overdue";
      else if (awaitingReviewCount > 0) progressStatus = "review_due";
      else if (pendingCount > 0) progressStatus = "pending";

      return {
        user,
        totalAssigned,
        completedCount,
        pendingCount,
        awaitingReviewCount,
        overdueCount,
        progressPercent,
        progressStatus,
        assignments: userAssignments,
      };
    })
    .filter((summary) => summary.totalAssigned > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount || b.overdueCount - a.overdueCount);
}

export function buildTeamOverviewMetrics(summaries: UserAssignmentSummary[]) {
  const totalAssigned = summaries.reduce((sum, item) => sum + item.totalAssigned, 0);
  const sectionsCompleted = summaries.reduce((sum, item) => sum + item.completedCount, 0);
  const sectionsPending = summaries.reduce((sum, item) => sum + item.pendingCount, 0);

  return {
    teamMembersActive: summaries.length,
    totalSectionsAssigned: totalAssigned,
    sectionsCompleted,
    sectionsPending,
  };
}

function formatDueDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatSectionStatus(status: SectionAssignmentStatus): string {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "ai_drafted":
      return "AI drafted";
    case "awaiting_review":
      return "Awaiting review";
    case "completed":
      return "Completed";
  }
}

function TeamProgressStatusBadge({ status }: { status: TeamMemberProgressStatus }) {
  const config = {
    complete: { label: "Complete", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    pending: { label: "Pending", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    review_due: { label: "Review Due", className: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
    overdue: { label: "Overdue", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  };
  const item = config[status];
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${item.className}`}>
      {item.label}
    </span>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-indigo-400 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function groupSectionsByRfpTitle(sections: QuestionAssignmentDashboardSection[]) {
  return sections.reduce<Map<string, QuestionAssignmentDashboardSection[]>>((acc, item) => {
    const list = acc.get(item.rfp_title) ?? [];
    list.push(item);
    acc.set(item.rfp_title, list);
    return acc;
  }, new Map());
}

function MemberSectionDetailGroup({ sections }: { sections: QuestionAssignmentDashboardSection[] }) {
  if (sections.length === 0) return null;

  const grouped = groupSectionsByRfpTitle(sections);

  return (
    <div className="mb-5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pending Sections</p>
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([rfpTitle, items]) => (
          <div
            key={rfpTitle}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <div className="mb-2">
              <p className="text-[12px] font-semibold text-white">{rfpTitle}</p>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.section_id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.04] bg-black/10 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-slate-200">{item.section_title}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-slate-600">Due {formatDueDate(item.due_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberDetailSheet({
  member,
  open,
  onOpenChange,
}: {
  member: QuestionAssignmentDashboardMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!member) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-white/10 bg-[#0D1B2A] text-white sm:max-w-md"
      >
        <SheetHeader className="border-b border-white/[0.06] pb-4">
          <SheetTitle className="text-white" style={{ fontFamily: "var(--font-display)" }}>
            {member.user.user_name}
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            {member.role} · {member.assigned} sections assigned
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          <MemberSectionDetailGroup sections={member.sections} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ApiStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const config: Record<string, string> = {
    complete: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    overdue: "bg-red-500/10 text-red-400 border-red-500/20",
    review_due: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  };
  const className = config[normalized] ?? config.complete;

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${className}`}>
      {status}
    </span>
  );
}

function mapMemberToSummary(member: QuestionAssignmentDashboardMember): UserAssignmentSummary {
  return {
    user: {
      id: String(member.user.id),
      name: member.user.user_name,
      email: member.user.email,
      role: member.role,
      avatarInitials: member.user.initials,
      active: true,
    },
    totalAssigned: member.assigned,
    completedCount: member.completed,
    pendingCount: member.pending,
    awaitingReviewCount: 0,
    overdueCount: 0,
    progressPercent: member.progress,
    progressStatus: member.status.toLowerCase() === "complete" ? "complete" : "pending",
    assignments: [],
  };
}

function getAvatarClass(userId: string | number): string {
  if (userId === "lisa" || userId === "sarah") {
    return "bg-amber-500/15 border-amber-500/25 text-amber-200";
  }
  if (userId === "james") {
    return "bg-cyan-500/15 border-cyan-500/25 text-cyan-200";
  }
  return "bg-indigo-500/15 border-indigo-500/25 text-indigo-200";
}

function SectionAssignmentSkeleton() {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-white/[0.06] px-4 py-3"
            style={{ background: "rgba(255,255,255,0.015)" }}
          >
            <Skeleton className="h-3 w-24 bg-white/10" />
            <Skeleton className="mt-3 h-7 w-12 bg-white/10" />
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.01)" }}>
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Team member</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">QS Assigned</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Completed</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pending</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-b border-white/[0.03]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
                    <Skeleton className="h-4 w-24 bg-white/10" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-14 bg-white/10" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-6 bg-white/10" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-6 bg-white/10" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-6 bg-white/10" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-16 rounded-full bg-white/10" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Skeleton className="h-7 w-24 rounded-lg bg-white/10" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function SectionAssignmentView({
  members = [],
  isLoading = false,
  agentUniqueId = "",
}: {
  members?: QuestionAssignmentDashboardMember[];
  isLoading?: boolean;
  agentUniqueId?: string;
}) {
  const [selectedMember, setSelectedMember] = useState<QuestionAssignmentDashboardMember | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [remindingMemberId, setRemindingMemberId] = useState<number | null>(null);

  const teamOverview = useMemo(
    () => ({
      teamMembersActive: members.length,
      totalSectionsAssigned: members.reduce((sum, member) => sum + member.assigned, 0),
      sectionsCompleted: members.reduce((sum, member) => sum + member.completed, 0),
      sectionsPending: members.reduce((sum, member) => sum + member.pending, 0),
    }),
    [members]
  );

  const openDetails = (member: QuestionAssignmentDashboardMember) => {
    setSelectedMember(member);
    setDetailOpen(true);
  };

  const handleSendReminder = async (member: QuestionAssignmentDashboardMember) => {
    const trimmedAgentUniqueId = agentUniqueId.trim();
    if (!trimmedAgentUniqueId) {
      toast.error("Agent ID is missing from the URL.");
      return;
    }

    setRemindingMemberId(member.team_member_id);
    try {
      const response = await sendQuestionAssignmentReminder({
        assignee_user_id: member.user.id,
        agent_unique_id: trimmedAgentUniqueId,
      });
      toast.success(
        response.message ||
          `Reminder sent to ${member.user.user_name} for ${member.pending} pending section${member.pending === 1 ? "" : "s"}.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reminder.");
    } finally {
      setRemindingMemberId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Team Assignments
        </h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Who owns each section, what is done, and who may need a follow-up
        </p>
      </div>

      {isLoading ? (
        <SectionAssignmentSkeleton />
      ) : (
        <>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Team Members Active", value: String(teamOverview.teamMembersActive) },
          { label: "Total Sections Assigned", value: String(teamOverview.totalSectionsAssigned) },
          { label: "Sections Completed", value: String(teamOverview.sectionsCompleted) },
          { label: "Sections Pending", value: String(teamOverview.sectionsPending) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/[0.06] px-4 py-3"
            style={{ background: "rgba(255,255,255,0.015)" }}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
            <p className="mt-1 text-[22px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.01)" }}>
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Team member</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">QS Assigned</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Completed</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pending</th>
              {/* <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Progress</th> */}
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.team_member_id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-semibold ${getAvatarClass(member.user.id)}`}
                    >
                      {member.user.initials}
                    </div>
                    <p className="text-[13px] font-semibold text-white">{member.user.user_name}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-[12px] text-slate-400">{member.role}</td>
                <td className="px-4 py-3 text-[12px] text-slate-300">{member.assigned}</td>
                <td className="px-4 py-3 text-[12px] text-emerald-400/90">{member.completed}</td>
                <td className="px-4 py-3 text-[12px] text-amber-300/90">{member.pending}</td>
                <td className="px-4 py-3">
                  <ApiStatusBadge status={member.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {member.pending > 0 && member.status.toLowerCase() !== "complete" ? (
                      <button
                        type="button"
                        onClick={() => void handleSendReminder(member)}
                        disabled={remindingMemberId === member.team_member_id}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[10px] font-medium text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Bell className="h-3 w-3" />
                        {remindingMemberId === member.team_member_id ? "Sending..." : "Send Reminder"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openDetails(member)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/25"
                    >
                      View Details
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {members.length === 0 && (
        <div
          className="mt-4 rounded-xl border border-white/[0.06] p-8 text-center"
          style={{ background: "rgba(255,255,255,0.015)" }}
        >
          <Users className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-[13px] text-slate-400">No team members with section assignments yet.</p>
        </div>
      )}
        </>
      )}

      <MemberDetailSheet
        member={selectedMember}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
