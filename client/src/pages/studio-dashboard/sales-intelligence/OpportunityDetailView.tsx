import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  MoreVertical,
  ClipboardList,
  CloudUpload,
  ExternalLink,
  History,
  LayoutGrid,
  Loader2,
  Pencil,
  RotateCcw,
  StickyNote,
  Trash2,
  Bell,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { updateIdgSalesOpportunity } from "@/lib/idgSalesApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildSalesforceOpportunitiesListUrl,
  buildSalesforceOpportunityRecordUrl,
  daysUntil,
  formatCurrency,
  formatDate,
  SourceBadge,
  StageBadge,
  StatusBadge,
} from "./salesIntelUtils";
import { useSalesIntelData } from "./useSalesIntelData";
import {
  DimensionScoresHelpIcon,
  ExtractionConfidenceHelpIcon,
  OverallScoreHelpIcon,
} from "./qualificationScoringHelp";
import {
  AiInsightBlock,
  DimensionScoreBars,
  QualificationPanel,
  RecommendationList,
  ScoreRing,
} from "./QualificationScorePanels";
import { OverviewFields } from "./opportunity-form/OverviewFields";
import { SummaryFields } from "./opportunity-form/SummaryFields";
import { QualificationFields } from "./opportunity-form/QualificationFields";
import { NotesFields } from "./opportunity-form/NotesFields";
import OpportunityHistoryPanel from "./OpportunityHistoryPanel";
import AssignReviewerControl from "./AssignReviewerControl";
import OpportunityDetailSkeleton from "./OpportunityDetailSkeleton";
import { getAllMembersIncludeOwner, type TeamMemberApiItem } from "@/lib/TeamApi";
import {
  buildUpdateOpportunityPayload,
  draftFromOpportunity,
  isOpportunityFormDirty,
  OPPORTUNITY_FORM_INPUT_CLASS,
  type OpportunityFormDraft,
} from "./opportunityFormTypes";
import {
  firstOverviewFieldError,
  getOverviewFieldErrors,
} from "./opportunity-form/overviewFieldValidation";
import {
  SALES_INTEL_PANEL_CHART,
  SALES_INTEL_SECTION_TITLE,
} from "./salesIntelUi";
import type {
  Opportunity,
  OpportunityContact,
  OpportunityDetailSections,
  OpportunityDetailTab,
} from "./salesIntelTypes";

interface OpportunityDetailViewProps {
  agentId: string;
  opportunityId: string;
  onBack: () => void;
}

const DETAIL_TABS: {
  id: OpportunityDetailTab;
  label: string;
  icon: typeof LayoutGrid;
  color: string;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, color: "#8B5CF6" },
  { id: "summary", label: "Summary", icon: ClipboardList, color: "#A855F7" },
  { id: "qualification", label: "Qualification", icon: BadgeCheck, color: "#6366F1" },
  { id: "notes", label: "Notes", icon: StickyNote, color: "#ec4899" },
  { id: "history", label: "History", icon: History, color: "#38BDF8" },
  { id: "completed", label: "Status", icon: Check, color: "#22D3EE" },
];

const DIMENSION_ORDER = [
  "serviceMatch",
  "geography",
  "industry",
  "technology",
  "securityClearance",
  "framework",
  "contractValue",
  "deadline",
  "strategicCustomer",
] as const;

const DIMENSION_LABELS: Record<string, string> = {
  serviceMatch: "Service Match",
  geography: "Geography",
  industry: "Industry",
  technology: "Technology",
  securityClearance: "Security Clearance",
  framework: "Framework",
  contractValue: "Contract Value",
  deadline: "Deadline",
  strategicCustomer: "Strategic Customer",
};

function fallbackDetail(opportunity: Opportunity): OpportunityDetailSections {
  return {
    overview: {
      deadlineAt: opportunity.deadlineAt,
      estimatedValue: opportunity.estimatedValue,
      currency: opportunity.currency,
      country: opportunity.country,
      category: opportunity.category,
      buyer: opportunity.buyer,
      source: opportunity.source,
      sourceUrl: opportunity.sourceUrl,
      extractionConfidence: opportunity.confidence,
      technology: opportunity.category,
    },
    summary: {
      executiveSummary: opportunity.qualificationSummary,
      riskSummary: opportunity.risks?.join(" "),
      opportunitySummary: opportunity.title,
      requirements: opportunity.qualificationReasons ?? [],
      deliverables: opportunity.category ? [opportunity.category] : [],
    },
    qualification: {
      overallScore: opportunity.qualificationScore,
      recommendation: opportunity.recommendation,
      confidence: opportunity.confidence,
      dimensions: {},
      aiReasoning: opportunity.qualificationSummary,
      recommendations: [],
      reasons: opportunity.qualificationReasons ?? [],
      risks: opportunity.risks ?? [],
      rejectionReasons: opportunity.rejectionReasons ?? [],
    },
    completed: {
      isComplete: ["pushed", "rejected", "validated", "push_failed"].includes(opportunity.stage),
      stage: opportunity.stage,
      humanReviewStatus: opportunity.humanReviewStatus,
      reviewedAt: opportunity.reviewedAt,
      salesforcePushStatus: opportunity.salesforcePushStatus,
      salesforceOpportunityId: opportunity.salesforceOpportunityId,
      salesforcePushedAt: opportunity.salesforcePushedAt,
      salesforcePushError: opportunity.salesforcePushError,
    },
    notes: {
      humanReviewNotes: opportunity.humanReviewNotes ?? null,
      updatedAt: opportunity.updatedAt,
    },
  };
}

function DetailField({
  label,
  value,
  help,
}: {
  label: string;
  value?: string | number | ReactNode | null;
  help?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        {help}
      </div>
      <div className="mt-1 text-[12px] font-medium text-white">{value ?? "—"}</div>
    </div>
  );
}

function DetailStatusField({
  label,
  value,
  displayLabel,
}: {
  label: string;
  value?: string | null;
  displayLabel?: string | null;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1.5">
        <StatusBadge value={value} label={displayLabel} />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  help,
  children,
  className,
}: {
  title: string;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`p-4 sm:p-5 ${SALES_INTEL_PANEL_CHART} ${className ?? ""}`}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent"
        aria-hidden="true"
      />
      <div className="relative mb-3 flex items-center gap-1.5">
        <h3 className={SALES_INTEL_SECTION_TITLE}>{title}</h3>
        {help}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function ContactCard({ contacts }: { contacts: OpportunityContact[] }) {
  if (contacts.length === 0) {
    return (
      <SummaryCard title="Contact">
        <p className="text-[12px] text-slate-400">—</p>
      </SummaryCard>
    );
  }

  return (
    <SummaryCard title="Contact">
      <div className="space-y-3">
        {contacts.map((contact, index) => (
          <div
            key={`${contact.email ?? contact.phone ?? contact.name ?? index}-${index}`}
            className={index > 0 ? "border-t border-white/[0.06] pt-3" : undefined}
          >
            {contact.name && <p className="text-[12px] font-medium text-white">{contact.name}</p>}
            <div className="mt-1 space-y-1">
              {contact.email && (
                <p className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Email:</span>{" "}
                  <a href={`mailto:${contact.email}`} className="text-sky-300 hover:text-sky-200">
                    {contact.email}
                  </a>
                </p>
              )}
              {contact.phone && (
                <p className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Phone:</span>{" "}
                  <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="text-sky-300 hover:text-sky-200">
                    {contact.phone}
                  </a>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SummaryCard>
  );
}

export default function OpportunityDetailView({ agentId, opportunityId, onBack }: OpportunityDetailViewProps) {
  const {
    opportunities,
    selectOpportunity,
    approveReview,
    rejectReview,
    restoreReview,
    pushToSalesforce,
    saveNotes,
    assignReviewer,
    sendDeadlineReminder,
    archiveOpportunity,
    deleteOpportunity,
    salesforce,
    processingId,
    archivingId,
    deletingId,
    pushingId,
    savingNotesId,
    assigningReviewerId,
    sendingDeadlineReminderId,
    detailLoadingId,
    loading,
    initialized,
  } = useSalesIntelData(agentId);

  const opportunity = opportunities.find((item) => item.id === opportunityId);
  const [activeTab, setActiveTab] = useState<OpportunityDetailTab>("overview");
  const [notesDraft, setNotesDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [formDraft, setFormDraft] = useState<OpportunityFormDraft | null>(null);
  const [formInitial, setFormInitial] = useState<OpportunityFormDraft | null>(null);
  const [localOverrides, setLocalOverrides] = useState<{
    title?: string;
    buyer?: string;
    detail?: OpportunityDetailSections;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leavingAfterArchive, setLeavingAfterArchive] = useState(false);
  const [leavingAfterDelete, setLeavingAfterDelete] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberApiItem[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(true);

  useEffect(() => {
    void selectOpportunity(opportunityId);
  }, [opportunityId, selectOpportunity]);

  useEffect(() => {
    let cancelled = false;
    setTeamMembersLoading(true);
    void getAllMembersIncludeOwner()
      .then((response) => {
        if (cancelled) return;
        const list = Array.isArray(response.data?.members) ? response.data.members : [];
        setTeamMembers(list);
      })
      .catch(() => {
        if (!cancelled) setTeamMembers([]);
      })
      .finally(() => {
        if (!cancelled) setTeamMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIsEditing(false);
    setFormDraft(null);
    setFormInitial(null);
    setLocalOverrides(null);
  }, [opportunityId]);

  useEffect(() => {
    const savedNotes =
      opportunity?.detail?.notes?.humanReviewNotes ??
      opportunity?.humanReviewNotes ??
      "";
    setNotesDraft(savedNotes ?? "");
  }, [opportunity?.id, opportunity?.humanReviewNotes, opportunity?.detail?.notes?.humanReviewNotes]);

  const detail = useMemo(() => {
    if (!opportunity) return null;
    const base = opportunity.detail ? opportunity.detail : fallbackDetail(opportunity);
    return localOverrides?.detail ?? base;
  }, [opportunity, localOverrides]);

  const displayTitle = localOverrides?.title ?? opportunity?.title ?? "";
  const displayBuyer = localOverrides?.buyer ?? opportunity?.buyer ?? "";

  const dimensionChartData = useMemo(() => {
    const dimensions = detail?.qualification.dimensions ?? {};

    return DIMENSION_ORDER.filter((key) => dimensions[key] != null).map((key) => ({
      label: DIMENSION_LABELS[key] ?? key,
      score: dimensions[key] ?? 0,
    }));
  }, [detail?.qualification.dimensions]);

  const formDirty =
    isEditing && formDraft && formInitial
      ? isOpportunityFormDirty(formDraft, formInitial)
      : false;

  const startEditing = () => {
    if (!opportunity || !detail) return;
    const draft = draftFromOpportunity(
      { ...opportunity, title: displayTitle, buyer: displayBuyer },
      detail
    );
    setFormDraft(draft);
    setFormInitial(draft);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (savingEdit) return;
    if (formDirty && !window.confirm("Discard unsaved changes?")) return;
    setIsEditing(false);
    setFormDraft(null);
    setFormInitial(null);
  };

  const saveEditing = async () => {
    if (!formDraft || !detail || !opportunity || savingEdit) return;
    if (!formDraft.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const overviewError = firstOverviewFieldError(getOverviewFieldErrors(formDraft.overview));
    if (overviewError) {
      toast.error(overviewError);
      setActiveTab("overview");
      return;
    }

    setSavingEdit(true);
    try {
      const payload = buildUpdateOpportunityPayload(formDraft);
      await updateIdgSalesOpportunity(agentId, opportunityId, payload);

      const notes = formDraft.notes.trim();
      const previousNotes = (formInitial?.notes ?? "").trim();
      if (notes !== previousNotes) {
        try {
          await saveNotes(opportunityId, notes);
        } catch {
          toast.message("Fields saved, but notes could not be updated");
        }
      }

      await selectOpportunity(opportunityId, { silent: true });
      setLocalOverrides(null);
      setNotesDraft(notes);
      setIsEditing(false);
      setFormDraft(null);
      setFormInitial(null);
      toast.success("Changes saved");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to save changes";
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  // After a successful archive/delete the item leaves local state before navigation;
  // keep the detail shell instead of flashing "Opportunity not found".
  if (leavingAfterArchive || leavingAfterDelete) {
    return <OpportunityDetailSkeleton />;
  }

  if (
    (!initialized && loading) ||
    detailLoadingId === opportunityId ||
    teamMembersLoading
  ) {
    return <OpportunityDetailSkeleton />;
  }

  if (!opportunity || !detail) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-slate-400">Opportunity not found.</p>
        <button type="button" onClick={onBack} className="mt-3 text-[12px] text-indigo-400 hover:text-indigo-300">
          Back to pipeline
        </button>
      </div>
    );
  }

  const deadlineDays = daysUntil(opportunity.deadlineAt);
  const canReview = opportunity.stage === "awaiting_review";
  const isApproved =
    opportunity.humanReviewStatus === "approved" ||
    ["validated", "push_pending", "pushed"].includes(opportunity.stage);
  const canRestore = opportunity.stage === "rejected";
  const canPush =
    (opportunity.stage === "validated" || opportunity.stage === "push_failed") &&
    opportunity.salesforcePushStatus !== "success";
  const salesforceOpportunitiesUrl = buildSalesforceOpportunitiesListUrl(salesforce.instanceUrl);
  const salesforceRecordUrl = buildSalesforceOpportunityRecordUrl(
    salesforce.instanceUrl,
    detail.completed?.salesforceOpportunityId ?? opportunity.salesforceOpportunityId
  );
  const isPushed = opportunity.stage === "pushed";
  const openInSalesforceUrl = isPushed
    ? salesforceRecordUrl ?? salesforceOpportunitiesUrl
    : null;
  const isProcessing = processingId === opportunityId;
  const isArchiving = archivingId === opportunityId;
  const isDeleting = deletingId === opportunityId;
  const isPushing = pushingId === opportunityId;
  const isSendingDeadlineReminder = sendingDeadlineReminderId === opportunityId;
  const isSavingNotes = savingNotesId === opportunityId;
  const canSendDeadlineReminder = Boolean(opportunity.deadlineAt) && !isPushed;
  const hasAssignedReviewer = Boolean(opportunity.assignedReviewerId);
  const savedNotes =
    detail.notes?.humanReviewNotes ?? opportunity.humanReviewNotes ?? "";
  const notesDirty = notesDraft !== (savedNotes ?? "");

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-[12px] text-slate-500 hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to pipeline
      </button>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <SourceBadge sourceKey={opportunity.sourceKey} sourceName={opportunity.source} />
            <StageBadge stage={opportunity.stage} />
            {deadlineDays != null && deadlineDays <= 14 && deadlineDays >= 0 && (
              <span className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-amber-300">
                {deadlineDays} days to deadline
              </span>
            )}
          </div>

          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:max-w-[min(100%,28rem)] sm:justify-end">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.04] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveEditing()}
                  disabled={!formDirty || savingEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-[11px] font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {savingEdit ? "Saving..." : "Save changes"}
                </button>
              </>
            ) : (
              <>
                {canReview ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void approveReview(opportunityId)}
                      disabled={isProcessing || isArchiving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void rejectReview(opportunityId)}
                      disabled={isProcessing || isArchiving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-[11px] font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </>
                ) : isApproved ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-2 text-[11px] font-semibold text-emerald-300 opacity-70"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approved
                  </button>
                ) : null}
                {canRestore && (
                  <button
                    type="button"
                    onClick={() => void restoreReview(opportunityId)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Restore for Review
                  </button>
                )}
                {canPush && (
                  <button
                    type="button"
                    onClick={() => void pushToSalesforce(opportunityId)}
                    disabled={isPushing || !salesforce.connected}
                    title={
                      salesforce.connected
                        ? "Create Salesforce Opportunity"
                        : "Connect your Salesforce from the Push Log view first"
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-[11px] font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
                  >
                    {isPushing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
                    Push to Salesforce
                  </button>
                )}
                {openInSalesforceUrl ? (
                  <a
                    href={openInSalesforceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open this opportunity in Salesforce"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Salesforce
                  </a>
                ) : null}
                {canSendDeadlineReminder ? (
                  <button
                    type="button"
                    onClick={() => void sendDeadlineReminder(opportunityId)}
                    disabled={isSendingDeadlineReminder || isEditing || !hasAssignedReviewer}
                    title={
                      hasAssignedReviewer
                        ? "Notify the assigned reviewer about the submission deadline"
                        : "Assign a reviewer first, then send a deadline reminder"
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
                  >
                    {isSendingDeadlineReminder ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Bell className="h-3.5 w-3.5" />
                    )}
                    Reminder
                  </button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={isArchiving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.04] disabled:opacity-50"
                    >
                      {isArchiving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                          Archiving...
                        </>
                      ) : (
                        <>
                          Actions
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        </>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-[11rem] border-white/10 bg-[#121421] text-slate-200"
                  >
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-[12px] focus:bg-white/[0.06] focus:text-white"
                      disabled={isArchiving || isPushed}
                      title={isPushed ? "Editing is disabled after Salesforce push" : undefined}
                      onSelect={() => startEditing()}
                    >
                      <Pencil className="size-3.5 text-slate-400" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-[12px] focus:bg-white/[0.06] focus:text-white"
                      disabled={!opportunity.sourceUrl || isArchiving}
                      onSelect={() => {
                        if (!opportunity.sourceUrl) return;
                        window.open(opportunity.sourceUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <ExternalLink className="size-3.5 text-slate-400" />
                      Source
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/[0.08]" />
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-[12px] focus:bg-white/[0.06] focus:text-white"
                      disabled={isProcessing || isArchiving}
                      onSelect={() => {
                        void (async () => {
                          try {
                            await archiveOpportunity(opportunityId, {
                              onBeforeRemove: () => setLeavingAfterArchive(true),
                            });
                            onBack();
                          } catch {
                            setLeavingAfterArchive(false);
                            // toast handled in archiveOpportunity
                          }
                        })();
                      }}
                    >
                      {isArchiving ? (
                        <Loader2 className="size-3.5 animate-spin text-slate-400" />
                      ) : (
                        <Archive className="size-3.5 text-slate-400" />
                      )}
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer gap-2 text-[12px] text-red-300 focus:bg-red-500/10 focus:text-red-200"
                      disabled={isArchiving || isDeleting || isPushed}
                      title={isPushed ? "Delete is disabled after Salesforce push" : undefined}
                      onSelect={() => setDeleteConfirmOpen(true)}
                    >
                      {isDeleting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0 max-w-full">
          {isEditing && formDraft ? (
            <div className="space-y-2">
              <input
                value={formDraft.title}
                onChange={(e) =>
                  setFormDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                }
                className={`${OPPORTUNITY_FORM_INPUT_CLASS} text-base font-semibold sm:text-[18px]`}
                style={{ fontFamily: "var(--font-display)" }}
                placeholder="Opportunity title"
              />
              <input
                value={formDraft.buyer}
                onChange={(e) =>
                  setFormDraft((prev) => (prev ? { ...prev, buyer: e.target.value } : prev))
                }
                className={OPPORTUNITY_FORM_INPUT_CLASS}
                placeholder="Buyer"
              />
              {opportunity.externalId ? (
                <p className="text-[12px] text-slate-500">{opportunity.externalId}</p>
              ) : null}
            </div>
          ) : (
            <>
              <h2
                className="break-words text-base font-semibold leading-snug text-white [overflow-wrap:anywhere] sm:text-[18px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {displayTitle}
              </h2>
              <p className="mt-1 break-words text-[12px] text-slate-500">
                {displayBuyer}
                {opportunity.externalId ? ` · ${opportunity.externalId}` : ""}
              </p>
            </>
          )}
        </div>

        
      </div>

      <div className="mb-5">
        <AssignReviewerControl
          opportunityId={opportunityId}
          assignedReviewerId={opportunity.assignedReviewerId}
          assignedReviewer={opportunity.assignedReviewer}
          assigning={assigningReviewerId === opportunityId}
          disabled={isEditing}
          members={teamMembers}
          onAssign={(userId) => assignReviewer(opportunityId, userId)}
        />
      </div>

      <div className="-mx-1 mb-5 overflow-x-auto border-b border-white/[0.06] pb-0">
        <div className="flex min-w-max gap-1 px-1">
          {DETAIL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-t-lg px-3 py-2.5 transition-all ${
                  isActive
                    ? "border border-b-0 border-white/[0.08] bg-white/[0.04] text-white"
                    : "border border-transparent text-slate-400 hover:bg-white/[0.02] hover:text-slate-200"
                }`}
              >
                <div
                  className="flex size-5 items-center justify-center rounded-md"
                  style={{ backgroundColor: isActive ? `${tab.color}22` : `${tab.color}14` }}
                >
                  <Icon className="size-3" style={{ color: tab.color }} />
                </div>
                <span className="text-[11px] font-medium sm:text-xs">{tab.label}</span>
                {isActive ? (
                  <span
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full"
                    style={{ backgroundColor: tab.color }}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          {isEditing && formDraft ? (
            <OverviewFields
              value={formDraft.overview}
              onChange={(overview) => setFormDraft((prev) => (prev ? { ...prev, overview } : prev))}
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <DetailField label="Deadline" value={formatDate(detail.overview.deadlineAt)} />
                <DetailField
                  label="Estimated Value"
                  value={formatCurrency(
                    detail.overview.estimatedValue,
                    detail.overview.currency ?? opportunity.currency
                  )}
                />
                <DetailField label="Country" value={detail.overview.country} />
                <DetailField label="Category" value={detail.overview.category} />
                <DetailField label="Reference" value={detail.overview.reference} />
                <DetailField label="Notice Type" value={detail.overview.noticeType} />
                <DetailField label="Security Clearance" value={detail.overview.securityClearance} />
                <DetailField
                  label="Extraction Confidence"
                  help={<ExtractionConfidenceHelpIcon />}
                  value={
                    detail.overview.extractionConfidence != null
                      ? `${detail.overview.extractionConfidence}%`
                      : undefined
                  }
                />
                <DetailField label="Framework" value={detail.overview.framework} />
                <DetailField label="Contract Duration" value={detail.overview.contractDuration} />
                <DetailField label="Technology" value={detail.overview.technology} />
              </div>
              <ContactCard contacts={detail.overview.contacts ?? []} />
              {(detail.overview.links ?? []).length > 0 && (
                <SummaryCard title="Links">
                  <ul className="space-y-2 text-[12px] text-slate-300">
                    {detail.overview.links?.map((link, index) => (
                      <li key={link.url || `link-${index}`}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-300 hover:text-sky-200"
                        >
                          {link.description || link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </SummaryCard>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "summary" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {isEditing && formDraft ? (
            <div className="lg:col-span-2">
              <SummaryFields
                value={formDraft.summary}
                onChange={(summary) => setFormDraft((prev) => (prev ? { ...prev, summary } : prev))}
              />
            </div>
          ) : (
            <>
              <SummaryCard title="Executive Summary">
                <p className="text-[12px] leading-relaxed text-slate-300">
                  {detail.summary.executiveSummary ?? "—"}
                </p>
              </SummaryCard>
              <SummaryCard title="Risk Summary">
                <p className="text-[12px] leading-relaxed text-slate-300">
                  {detail.summary.riskSummary ?? "—"}
                </p>
              </SummaryCard>
              <SummaryCard title="Opportunity Summary">
                <p className="text-[12px] leading-relaxed text-slate-300">
                  {detail.summary.opportunitySummary ?? "—"}
                </p>
              </SummaryCard>
              <SummaryCard title="Requirements">
                <ul className="space-y-1 text-[12px] text-slate-300">
                  {(detail.summary.requirements ?? []).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </SummaryCard>
              <SummaryCard title="Deliverables">
                <ul className="space-y-1 text-[12px] text-slate-300">
                  {(detail.summary.deliverables ?? []).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </SummaryCard>
            </>
          )}
        </div>
      )}

      {activeTab === "qualification" && (
        <div className="space-y-4">
          {isEditing && formDraft ? (
            <QualificationFields
              value={formDraft.qualification}
              onChange={(qualification) =>
                setFormDraft((prev) => (prev ? { ...prev, qualification } : prev))
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                <AiInsightBlock
                  title="AI Reasoning"
                  body={detail.qualification.aiReasoning}
                  confidence={detail.qualification.confidence}
                />
                <RecommendationList items={detail.qualification.recommendations ?? []} />
              </div>

              <div className="space-y-4">
                <QualificationPanel title="Overall Score" help={<OverallScoreHelpIcon />}>
                  <ScoreRing
                    score={detail.qualification.overallScore}
                    recommendation={detail.qualification.recommendation}
                  />
                </QualificationPanel>

                <QualificationPanel title="Dimension Scores" help={<DimensionScoresHelpIcon />}>
                  <DimensionScoreBars data={dimensionChartData} />
                </QualificationPanel>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "notes" && (
        <SummaryCard title="Notes">
          {isEditing && formDraft ? (
            <NotesFields
              value={formDraft.notes}
              onChange={(notes) =>
                setFormDraft((prev) =>
                  prev ? { ...prev, notes: notes.slice(0, 2000) } : prev
                )
              }
            />
          ) : (
            <>
              <p className="mb-3 text-[11px] text-slate-500">
                Saved to human review notes for this opportunity.
              </p>
              <textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                rows={8}
                maxLength={2000}
                placeholder="Add internal notes about this opportunity..."
                className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500/40"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] text-slate-500">
                  {notesDraft.length}/2000
                  {detail.notes?.updatedAt
                    ? ` · Last updated ${formatDate(detail.notes.updatedAt)}`
                    : ""}
                </p>
                <button
                  type="button"
                  onClick={() => void saveNotes(opportunityId, notesDraft)}
                  disabled={isSavingNotes || !notesDirty}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-[11px] font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
                >
                  {isSavingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save Notes
                </button>
              </div>
            </>
          )}
        </SummaryCard>
      )}

      {activeTab === "history" ? (
        <OpportunityHistoryPanel
          agentId={agentId}
          opportunity={opportunity}
          active={activeTab === "history"}
        />
      ) : null}

      {activeTab === "completed" && (
        <div className="space-y-3">
          {isEditing ? (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-500">
              Status is managed by review and Salesforce push actions and cannot be edited here.
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <DetailStatusField
              label="Status"
              value={detail.completed.isComplete ? "complete" : "in_progress"}
              displayLabel={detail.completed.isComplete ? "Complete" : "In progress"}
            />
            <DetailStatusField label="Stage" value={detail.completed.stage} />
            <DetailStatusField label="Review Status" value={detail.completed.humanReviewStatus} />
            <DetailField
              label="Reviewed By"
              value={
                opportunity.reviewedBy ??
                detail.completed.reviewedBy?.userName ??
                detail.completed.reviewedBy?.email
              }
            />
            <DetailField label="Reviewed At" value={formatDate(detail.completed.reviewedAt)} />
            <DetailField label="Assigned Reviewer" value={opportunity.assignedReviewer} />
            <DetailField label="Assigned At" value={formatDate(opportunity.assignedAt)} />
            <DetailField label="Completed At" value={formatDate(detail.completed.completedAt)} />
            <DetailStatusField
              label="Salesforce Push Status"
              value={detail.completed.salesforcePushStatus}
            />
            <DetailField
              label="Salesforce Opportunity ID"
              value={
                (() => {
                  const sfId =
                    detail.completed.salesforceOpportunityId ?? opportunity.salesforceOpportunityId;
                  if (sfId && salesforceRecordUrl) {
                    return (
                      <a
                        href={salesforceRecordUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-sky-300 hover:underline"
                      >
                        {sfId}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    );
                  }
                  return sfId ?? "—";
                })()
              }
            />
            <DetailField
              label="Salesforce Pushed At"
              value={formatDate(detail.completed.salesforcePushedAt)}
            />
            {detail.completed.salesforcePushError && (
              <div className="md:col-span-2">
                <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
                  {detail.completed.salesforcePushError}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setDeleteConfirmOpen(open);
        }}
      >
        <AlertDialogContent className="border-white/10 bg-[#0a0f1a] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this opportunity?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove &ldquo;{displayTitle}&rdquo; from the pipeline. It will no longer appear in
              active lists or archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/15 bg-transparent text-slate-200 hover:bg-white/[0.04] hover:text-white"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="inline-flex items-center justify-center gap-2 bg-red-500 text-white hover:bg-red-400 disabled:pointer-events-none disabled:opacity-60"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void (async () => {
                  try {
                    await deleteOpportunity(opportunityId, {
                      onBeforeRemove: () => setLeavingAfterDelete(true),
                    });
                    setDeleteConfirmOpen(false);
                    onBack();
                  } catch {
                    setLeavingAfterDelete(false);
                  }
                })();
              }}
            >
              {isDeleting ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : null}
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
