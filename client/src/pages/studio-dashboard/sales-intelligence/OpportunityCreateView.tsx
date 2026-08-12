import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardList,
  LayoutGrid,
  Loader2,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import {
  createIdgSalesOpportunity,
  saveIdgSalesOpportunityNotes,
} from "@/lib/idgSalesApi";
import { pushIdgSalesInboxItems } from "./notifications/inboxPush";
import { OverviewFields } from "./opportunity-form/OverviewFields";
import { SummaryFields } from "./opportunity-form/SummaryFields";
import { QualificationFields } from "./opportunity-form/QualificationFields";
import { NotesFields } from "./opportunity-form/NotesFields";
import {
  buildCreateOpportunityPayload,
  EMPTY_OPPORTUNITY_FORM,
  isOpportunityFormDirty,
  OPPORTUNITY_FORM_INPUT_CLASS,
  type OpportunityFormDraft,
} from "./opportunityFormTypes";
import {
  firstOverviewFieldError,
  getOverviewFieldErrors,
} from "./opportunity-form/overviewFieldValidation";

type CreateSection = "overview" | "summary" | "qualification" | "notes";

const SECTIONS: {
  id: CreateSection;
  label: string;
  icon: typeof LayoutGrid;
  color: string;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, color: "#8B5CF6" },
  { id: "summary", label: "Summary", icon: ClipboardList, color: "#A855F7" },
  { id: "qualification", label: "Qualification", icon: BadgeCheck, color: "#6366F1" },
  { id: "notes", label: "Notes", icon: StickyNote, color: "#ec4899" },
];

export default function OpportunityCreateView({
  agentId,
  onBack,
  onCreated,
}: {
  agentId: string;
  onBack: () => void;
  onCreated?: (opportunityId: number) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<OpportunityFormDraft>(EMPTY_OPPORTUNITY_FORM);
  const [section, setSection] = useState<CreateSection>("overview");
  const [submitting, setSubmitting] = useState(false);
  const initial = useMemo(() => EMPTY_OPPORTUNITY_FORM, []);
  const dirty = isOpportunityFormDirty(draft, initial);

  const handleCancel = () => {
    if (submitting) return;
    if (dirty && !window.confirm("Discard this new opportunity?")) return;
    onBack();
  };

  const handleCreate = async () => {
    if (submitting) return;

    if (!draft.title.trim()) {
      toast.error("Title is required");
      setSection("overview");
      return;
    }

    const overviewError = firstOverviewFieldError(getOverviewFieldErrors(draft.overview));
    if (overviewError) {
      toast.error(overviewError);
      setSection("overview");
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildCreateOpportunityPayload(draft);
      const result = await createIdgSalesOpportunity(agentId, payload);
      const opportunityId = result.opportunity?.id;
      pushIdgSalesInboxItems(result.pushNotifications);

      const notes = draft.notes.trim();
      if (opportunityId && notes) {
        try {
          await saveIdgSalesOpportunityNotes(agentId, opportunityId, { notes });
        } catch {
          toast.message("Opportunity created, but notes could not be saved");
        }
      }

      toast.success("Opportunity created");
      // Refresh list data in parent, then always return to pipeline (never open detail/edit).
      if (onCreated && opportunityId) {
        await onCreated(opportunityId);
      }
      onBack();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to create opportunity";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCancel}
        disabled={submitting}
        className="mb-5 inline-flex items-center gap-2 text-[12px] text-slate-500 hover:text-slate-300 disabled:opacity-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to pipeline
      </button>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <span className="rounded border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-300">
              New
            </span>
            <span className="rounded border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Draft
            </span>
          </div>

          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.04] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-[11px] font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {submitting ? "Creating…" : "Create opportunity"}
            </button>
          </div>
        </div>

        <div className="min-w-0 max-w-full space-y-2">
          <input
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Opportunity title"
            disabled={submitting}
            className={`${OPPORTUNITY_FORM_INPUT_CLASS} text-base font-semibold sm:text-[18px]`}
            style={{ fontFamily: "var(--font-display)" }}
            aria-label="Opportunity title"
          />
          <input
            value={draft.buyer}
            onChange={(e) => setDraft((prev) => ({ ...prev, buyer: e.target.value }))}
            placeholder="Buyer"
            disabled={submitting}
            className={OPPORTUNITY_FORM_INPUT_CLASS}
            aria-label="Buyer"
          />
        </div>
      </div>

      <div className="-mx-1 mb-5 overflow-x-auto border-b border-white/[0.06] pb-0">
        <div className="flex min-w-max gap-1 px-1">
          {SECTIONS.map((item) => {
            const Icon = item.icon;
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                disabled={submitting}
                className={`relative flex items-center gap-2 rounded-t-lg px-3 py-2.5 transition-all ${
                  isActive
                    ? "border border-b-0 border-white/[0.08] bg-white/[0.04] text-white"
                    : "border border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-slate-200"
                }`}
              >
                <div
                  className="flex size-5 items-center justify-center rounded-md"
                  style={{ backgroundColor: isActive ? `${item.color}22` : `${item.color}14` }}
                >
                  <Icon className="size-3" style={{ color: item.color }} />
                </div>
                <span className="text-[11px] font-medium sm:text-xs">{item.label}</span>
                {isActive ? (
                  <span
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {section === "overview" && (
        <div className="space-y-4">
          <OverviewFields
            value={draft.overview}
            onChange={(overview) => setDraft((prev) => ({ ...prev, overview }))}
          />
        </div>
      )}
      {section === "summary" && (
        <div className="space-y-4">
          <SummaryFields
            value={draft.summary}
            onChange={(summary) => setDraft((prev) => ({ ...prev, summary }))}
          />
        </div>
      )}
      {section === "qualification" && (
        <div className="space-y-4">
          <QualificationFields
            value={draft.qualification}
            onChange={(qualification) => setDraft((prev) => ({ ...prev, qualification }))}
          />
        </div>
      )}
      {section === "notes" && (
        <div className="space-y-4">
          <NotesFields
            value={draft.notes}
            onChange={(notes) => setDraft((prev) => ({ ...prev, notes: notes.slice(0, 2000) }))}
          />
        </div>
      )}
    </div>
  );
}
