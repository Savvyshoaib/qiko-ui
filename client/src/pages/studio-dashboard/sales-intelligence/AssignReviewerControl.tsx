import { useEffect, useMemo, useState } from "react";
import { Loader2, UserCheck } from "lucide-react";
import type { TeamMemberApiItem } from "@/lib/TeamApi";

export type ReviewerOption = {
  userId: number;
  label: string;
};

interface AssignReviewerControlProps {
  opportunityId: string;
  assignedReviewerId?: number;
  assignedReviewer?: string;
  assigning: boolean;
  disabled?: boolean;
  members: TeamMemberApiItem[];
  onAssign: (userId: number | null) => Promise<void>;
}

export function mapTeamMembersToReviewerOptions(members: TeamMemberApiItem[]): ReviewerOption[] {
  return members
    .filter((member) => member.status === "active" && member.user?.id)
    .map((member) => ({
      userId: member.user.id,
      label: `${member.user.user_name || member.user.email}${
        member.role ? ` (${member.role})` : ""
      }`,
    }));
}

export default function AssignReviewerControl({
  opportunityId,
  assignedReviewerId,
  assignedReviewer,
  assigning,
  disabled = false,
  members,
  onAssign,
}: AssignReviewerControlProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    assignedReviewerId != null ? String(assignedReviewerId) : ""
  );

  useEffect(() => {
    setSelectedUserId(assignedReviewerId != null ? String(assignedReviewerId) : "");
  }, [assignedReviewerId, opportunityId]);

  const options = useMemo(() => mapTeamMembersToReviewerOptions(members), [members]);

  const dirty =
    (selectedUserId === "" && assignedReviewerId != null) ||
    (selectedUserId !== "" && Number(selectedUserId) !== assignedReviewerId);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md border border-indigo-500/20 bg-indigo-500/10">
          <UserCheck className="size-3 text-indigo-300" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-200">Reviewer</p>
          <p className="truncate text-[10px] text-slate-500">
            {assignedReviewer ? assignedReviewer : "Unassigned"}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor={`assign-reviewer-${opportunityId}`}>
          Assign reviewer
        </label>
        <select
          id={`assign-reviewer-${opportunityId}`}
          value={selectedUserId}
          disabled={disabled || assigning}
          onChange={(event) => setSelectedUserId(event.target.value)}
          className="min-w-0 w-full flex-1 rounded-lg border border-white/10 bg-[#0a0f1a] px-2.5 py-1.5 text-[11px] text-slate-200 outline-none focus:border-indigo-500/40 disabled:opacity-50 sm:max-w-xs"
        >
          <option value="">Unassigned</option>
          {options.map((option) => (
            <option key={option.userId} value={String(option.userId)}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled || assigning || !dirty}
          onClick={() =>
            void onAssign(selectedUserId === "" ? null : Number(selectedUserId))
          }
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {assigning ? "Saving…" : selectedUserId === "" ? "Clear" : "Assign"}
        </button>
      </div>
    </div>
  );
}
