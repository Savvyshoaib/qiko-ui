import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEADLINE_FILTER_OPTIONS,
  type DeadlineFilterId,
  type ReviewerFilterOption,
  type SourceFilterOption,
} from "./opportunityFilters";

const triggerClass =
  "h-auto min-w-0 max-w-[8.5rem] flex-1 basis-0 truncate rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[11px] font-normal text-slate-200 shadow-none hover:bg-white/[0.05] focus-visible:border-indigo-500/40 focus-visible:ring-0 data-[size=default]:h-auto data-[size=sm]:h-auto [&>span]:truncate [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-slate-500";

const contentClass =
  "z-[80] rounded-lg border border-white/[0.08] bg-[#121421] text-slate-200 shadow-xl shadow-black/50";

const itemClass =
  "cursor-pointer rounded-md py-1.5 pl-2 pr-8 text-[11px] text-slate-300 focus:bg-indigo-500/20 focus:text-indigo-100 data-[highlighted]:bg-indigo-500/20 data-[highlighted]:text-indigo-100";

export function OpportunitySourceDeadlineFilters({
  sourceOptions,
  reviewerOptions,
  sourceKey,
  deadlineFilter,
  reviewerId,
  onSourceKeyChange,
  onDeadlineFilterChange,
  onReviewerIdChange,
}: {
  sourceOptions: SourceFilterOption[];
  reviewerOptions: ReviewerFilterOption[];
  sourceKey: string | null;
  deadlineFilter: DeadlineFilterId | null;
  reviewerId: string | null;
  onSourceKeyChange: (key: string | null) => void;
  onDeadlineFilterChange: (value: DeadlineFilterId | null) => void;
  onReviewerIdChange: (value: string | null) => void;
}) {
  return (
    <>
      <Select
        value={sourceKey ?? "__all__"}
        onValueChange={(value) => onSourceKeyChange(value === "__all__" ? null : value)}
      >
        <SelectTrigger size="sm" className={triggerClass} aria-label="Filter by source" title="Source">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent align="start" className={contentClass}>
          <SelectItem value="__all__" className={itemClass}>
            All sources
          </SelectItem>
          {sourceOptions.map((option) => (
            <SelectItem key={option.key} value={option.key} className={itemClass}>
              {option.label} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={deadlineFilter ?? "__any__"}
        onValueChange={(value) =>
          onDeadlineFilterChange(value === "__any__" ? null : (value as DeadlineFilterId))
        }
      >
        <SelectTrigger size="sm" className={triggerClass} aria-label="Filter by deadline" title="Deadline">
          <SelectValue placeholder="Any deadline" />
        </SelectTrigger>
        <SelectContent align="start" className={contentClass}>
          <SelectItem value="__any__" className={itemClass}>
            Any deadline
          </SelectItem>
          {DEADLINE_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id} className={itemClass}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={reviewerId ?? "__all__"}
        onValueChange={(value) => onReviewerIdChange(value === "__all__" ? null : value)}
      >
        <SelectTrigger
          size="sm"
          className={triggerClass}
          aria-label="Filter by reviewer"
          title="Reviewer"
        >
          <SelectValue placeholder="All reviewers" />
        </SelectTrigger>
        <SelectContent align="start" className={contentClass}>
          <SelectItem value="__all__" className={itemClass}>
            All reviewers
          </SelectItem>
          {reviewerOptions.map((option) => (
            <SelectItem key={option.id} value={option.id} className={itemClass}>
              {option.label} ({option.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
