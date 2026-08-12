import { getRfpMock, isMockDataEnabled } from "@/data/services";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parse, startOfToday } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  FileText,
  Download,
  Lock,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  addRfpQuestion,
  addRfpSection,
  deleteRfpQuestion,
  formatWordLimitLabel,
  getPackEvaluationProgress,
  getPackFilesFromRfpFile,
  getRfpSectionApiTarget,
  getRfpSectionsFromFile,
  groupRfpListItemsByPack,
  mapRfpFileToListItem,
  retryRfpIngest,
  parseWordLimitForApi,
  submitRfpAnswerByUser,
  triggerAnswerByAiForEvaluatedFiles,
  updateRfpQuestion,
  updateRfpSection,
  type IDGRfpSectionQuestion,
  type IDGRfpFile,
} from "@/lib/IDGApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchIdgRfpFileById, fetchIdgRfpFiles, IDG_RFP_FILES_POLL_INTERVAL_MS, IDG_RFP_PACK_POLL_INTERVAL_MS, isIdgRfpThunkSkipped, parseIdgRfpPack, rfpFilesNeedEvaluationPoll, rfpPackNeedsSectionPoll, selectApiPackByIdEntry, selectRfpPackFile, syncEvaluatedRfpFilesAndPacks } from "@/store/slices/idgRfpSlice";
import { createBulkAssignments, deleteQuestionAssignmentsBySection, type BulkAssignmentsPayload, type BulkAssignmentSectionPayload, type QuestionAssignmentItem, type TeamMemberApiItem } from "@/lib/TeamApi";
import { fetchQuestionAssignments, getSectionAssignmentSummary, removeQuestionAssignmentsBySectionId } from "@/store/slices/questionAssignmentsSlice";
import { resolveRfpWorkflowEntry, saveRfpWorkflowState } from "@/lib/rfpWorkflowStorage";
import { RfpPackStatusBadge } from "./RfpPackStatusBadge";
import { aiChatAssistantMarkdownClassName } from "@/lib/aiChatMarkdownClasses";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Streamdown } from "streamdown";

// ─── Types ──────────────────────────────────────────────────

type RFPStage = "upload" | "parsed" | "assigned" | "drafting" | "review";

type QuestionStatus = "not_generated" | "generating" | "draft_ready" | "reviewing" | "locked" | "overdue" | "manual";

interface Question {
  id: string;
  text: string;
  wordLimit: string;
  aiResponse: string;
  confidence: number; // 0-100
  sources: string[];
  gapFlag: boolean; // true if no KB content found
  status: QuestionStatus;
}

interface Section {
  id: number;
  name: string;
  page: number;
  weighting: string;
  reviewer: string;
  assigneeUserId?: number;
  dueDate?: string;
  dueDateEdited?: boolean;
  questions: Question[];
  status: "not_generated" | "generating" | "draft_ready" | "reviewing" | "locked" | "overdue" | "manual";
}

interface AssignableUser {
  id: string;
  userId: number;
  name: string;
  role: string;
}

const AVAILABLE_USERS: AssignableUser[] = [
  { id: "ronan", userId: 0, name: "Ronan", role: "Owner" },
  { id: "lisa", userId: 0, name: "Lisa", role: "Finance" },
  { id: "sarah", userId: 0, name: "Sarah", role: "Security" },
  { id: "james", userId: 0, name: "James", role: "Delivery" },
];

function mapTeamMembersToAssignable(members: TeamMemberApiItem[]): AssignableUser[] {
  return members.map((member) => ({
    id: String(member.id),
    userId: member.user?.id ?? 0,
    name: member.user?.user_name || "Unknown",
    role: member.role,
  }));
}

function buildBulkAssignmentsPayload(
  apiSections: ReturnType<typeof getRfpSectionsFromFile>,
  sections: Section[],
  packId: string,
  rfpTitle: string,
  agentUniqueId: string,
  assignmentsBySectionId?: Record<string, QuestionAssignmentItem[]>,
  options?: { onlySectionIndex?: number; localChangesOnly?: boolean }
): BulkAssignmentsPayload {
  const payloadSections: BulkAssignmentSectionPayload[] = [];

  apiSections.forEach((apiSection, index) => {
    if (options?.onlySectionIndex !== undefined && options.onlySectionIndex !== index) return;

    const localSection = sections[index];
    const apiAssignment = assignmentsBySectionId
      ? getSectionAssignmentSummary(assignmentsBySectionId, apiSection.section_id)
      : null;
    const localReviewer = localSection?.reviewer ?? "Unassigned";

    if (options?.localChangesOnly) {
      const hasLocalAssignment = localReviewer !== "Unassigned";
      const hasLocalDueEdit = Boolean(localSection?.dueDateEdited);
      if (!hasLocalAssignment && !hasLocalDueEdit) return;
    }

    const reviewer =
      localReviewer !== "Unassigned"
        ? localReviewer
        : apiAssignment?.assigneeName ?? "Unassigned";

    if (reviewer === "Unassigned") return;

    const assigneeUserId = localSection?.assigneeUserId ?? apiAssignment?.assigneeUserId;
    if (!assigneeUserId) return;

    const sectionId =
      apiSection.section_id != null
        ? String(apiSection.section_id)
        : apiAssignment?.sectionId;
    if (!sectionId) return;

    const questions = (apiSection.questions ?? [])
      .map((question) => question.question?.trim())
      .filter((question): question is string => Boolean(question));

    const dueDate = getEffectiveDueDate(
      localSection?.dueDateEdited
        ? localSection?.dueDate
        : localReviewer !== "Unassigned"
          ? localSection?.dueDate
          : apiAssignment?.dueDate ?? localSection?.dueDate
    );

    payloadSections.push({
      section_id: sectionId,
      title: apiSection.section,
      assignee_user_id: assigneeUserId,
      due_at: dueDate,
      questions,
    });
  });

  return {
    agent_unique_id: agentUniqueId.trim(),
    rfp_title: rfpTitle.trim(),
    pack_id: packId.trim(),
    sections: payloadSections,
  };
}

function getTodayIsoDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function getEffectiveDueDate(dueDate?: string): string {
  const today = getTodayIsoDate();
  if (!dueDate || dueDate < today) return today;
  return dueDate;
}

const MOCK_SECTIONS = (
  isMockDataEnabled() ? getRfpMock().sections : []
) as Section[];

// ─── Helper: compute section-level stats ──────────────────────

function getSectionWordLimit(section: Section): string {
  if (section.questions.length === 0) return "—";
  if (section.questions.length === 1) return section.questions[0].wordLimit;
  const limits = section.questions.map(q => q.wordLimit).filter(w => w !== "No limit" && w !== "Spreadsheet");
  if (limits.length === 0) return section.questions[0].wordLimit;
  return limits.join(" + ");
}

function getSectionAnswerStatus(questions?: IDGRfpSectionQuestion[]): "Not generated" | "Generated" {
  const list = questions ?? [];
  if (list.length === 0) return "Not generated";
  return list.some((question) => Boolean(question.answer_by_ai?.trim())) ? "Generated" : "Not generated";
}

function countGeneratedAnswers(sections: ReturnType<typeof getRfpSectionsFromFile>): number {
  return sections.reduce(
    (total, section) =>
      total + (section.questions ?? []).filter((question) => Boolean(question.answer_by_ai?.trim())).length,
    0
  );
}

function areAllAnswersGenerated(sections: ReturnType<typeof getRfpSectionsFromFile>): boolean {
  const totalQuestions = sections.reduce((total, section) => total + (section.questions?.length ?? 0), 0);
  if (totalQuestions === 0) return false;
  return countGeneratedAnswers(sections) === totalQuestions;
}

function isQuestionAnswerLocked(question?: IDGRfpSectionQuestion | null): boolean {
  return Boolean(question?.answer_by_user?.trim());
}

function questionRequiresHumanReview(question?: IDGRfpSectionQuestion | null): boolean {
  const answer = question?.answer_by_ai?.trim() ?? "";
  return answer.length > 0 && answer.toLowerCase().includes("human review");
}

function stripHumanReviewMarkerFromAiAnswer(answer: string): string {
  if (!answer.trim()) return "";

  return answer
    .replace(/\s*\.?\s*human review required\.?\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

function isSectionWaitingForAi(questions?: IDGRfpSectionQuestion[]): boolean {
  const list = questions ?? [];
  if (list.length === 0) return false;
  return list.every((question) => !question.answer_by_ai?.trim());
}

function countGeneratedAnswersInSection(questions?: IDGRfpSectionQuestion[]): number {
  return (questions ?? []).filter((question) => Boolean(question.answer_by_ai?.trim())).length;
}

function isSectionReadyForReviewEdit(questions?: IDGRfpSectionQuestion[]): boolean {
  const list = questions ?? [];
  if (list.length === 0) return false;

  const allLocked = list.every((question) => isQuestionAnswerLocked(question));
  if (allLocked) return false;

  return !isSectionWaitingForAi(list);
}

function countSectionsReadyForReviewEdit(
  sections: ReturnType<typeof getRfpSectionsFromFile>
): number {
  return sections.filter((section) => isSectionReadyForReviewEdit(section.questions)).length;
}

function countSectionsWaitingForReviewAi(
  sections: ReturnType<typeof getRfpSectionsFromFile>
): number {
  return sections.filter((section) => {
    const questions = section.questions ?? [];
    if (questions.length === 0) return false;

    const allLocked = questions.every((question) => isQuestionAnswerLocked(question));
    return !allLocked && isSectionWaitingForAi(questions);
  }).length;
}

function countLockedUserAnswers(sections: ReturnType<typeof getRfpSectionsFromFile>): number {
  return sections.reduce(
    (total, section) =>
      total + (section.questions ?? []).filter(isQuestionAnswerLocked).length,
    0
  );
}

function getDefaultExpandedQuestionId(questions: IDGRfpSectionQuestion[]): string | null {
  if (questions.length === 0) return null;
  const unanswered = questions.find((question) => !isQuestionAnswerLocked(question));
  return unanswered?.question_id ?? questions[0].question_id;
}

function getTotalQuestions(sections: Section[]): number {
  return sections.reduce((sum, s) => sum + s.questions.length, 0);
}

function getLockableQuestions(sections: Section[]): Question[] {
  return sections.flatMap((section) => section.questions.filter((question) => question.status !== "manual"));
}

function areAllQuestionsLocked(sections: Section[]): boolean {
  const lockable = getLockableQuestions(sections);
  return lockable.length > 0 && lockable.every((question) => question.status === "locked");
}

function lockAllAnswersInSections(sections: Section[]): Section[] {
  return sections.map((section) => {
    const updatedQuestions = section.questions.map((question) =>
      question.status === "manual" ? question : { ...question, status: "locked" as const }
    );
    const sectionAllLocked = updatedQuestions.every(
      (question) => question.status === "locked" || question.status === "manual"
    );
    return {
      ...section,
      questions: updatedQuestions,
      status:
        section.status === "manual"
          ? "manual"
          : sectionAllLocked
          ? "locked"
          : section.status,
    };
  });
}

function downloadResponseDocument(rfpName: string, format: "docx" | "pdf") {
  const safeName = rfpName.replace(/[^\w\-]+/g, "_");
  const filename = `${safeName}_Response.${format}`;
  const blob = new Blob(
    [`Mock ${format.toUpperCase()} export for ${rfpName}\n\nGenerated from IDG RFP Response.`],
    { type: "application/octet-stream" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`Downloading ${filename}`);
}

function getSectionWorkflowStatus(section: Section): string {
  if (section.status === "locked" || section.status === "reviewing") return "Reviewed";
  if (section.status === "draft_ready") return "Drafted";
  if (section.reviewer && section.reviewer !== "Unassigned") return "Assigned";
  return "Parsed";
}

function getSectionCoverage(section: Section): string {
  const drafted = section.questions.filter(
    (question) => question.aiResponse || question.status === "draft_ready" || question.status === "locked"
  ).length;
  return `${drafted}/${section.questions.length} drafted`;
}

function getSectionEvidence(section: Section): string {
  const gapCount = section.questions.filter((question) => question.gapFlag).length;
  const sourceCount = section.questions.reduce((sum, question) => sum + question.sources.length, 0);

  if (gapCount > 0 && sourceCount === 0) return "Missing certificate";
  if (gapCount > 0) return `${sourceCount} sources · ${gapCount} gap(s)`;
  if (sourceCount === 0) return "No sources yet";
  return `${sourceCount} sources linked`;
}

function getSectionRisk(section: Section): "Low" | "Medium" | "High" {
  const gapCount = section.questions.filter((question) => question.gapFlag).length;
  const drafted = section.questions.filter((question) => question.aiResponse).length;

  if (gapCount > 0 && drafted < section.questions.length) return "High";
  if (gapCount > 0 || section.reviewer === "Unassigned") return "Medium";
  return "Low";
}

function RiskLevelBadge({ level }: { level: "Low" | "Medium" | "High" }) {
  const styles = {
    Low: "bg-emerald-500/10 text-emerald-400",
    Medium: "bg-amber-500/10 text-amber-400",
    High: "bg-red-500/10 text-red-400",
  };

  return (
    <span className={`rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${styles[level]}`}>
      {level}
    </span>
  );
}

const RFP_OUTCOME_METRICS = [
  { value: "62%", label: "Submission Readiness" },
  { value: "14/18", label: "Mandatory Coverage", sublabel: "covered" },
  // { value: "5", label: "Evidence Gaps", sublabel: "remaining" },
  { value: "7", label: "Review Needed", sublabel: "sections" },
  // { value: "27%", label: "At-Risk Sections", sublabel: "3 of 11 sections" },
  { value: "12", label: "Outstanding Items", sublabel: "awaiting action" },
];

function RfpOutcomeStrip() {
  return (
    <div
      className="mb-6 rounded-xl border border-indigo-500/[0.12] p-4"
      style={{ background: "rgba(99,102,241,0.04)" }}
    >
      <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.08em] text-indigo-400/60">
        RFP Outcomes
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {RFP_OUTCOME_METRICS.map((metric) => (
          <div key={metric.label} className="min-w-0 text-left">
            <div
              className="text-[20px] font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {metric.value}
            </div>
            <div className="mt-0.5 text-[9px] leading-tight text-slate-500">{metric.label}</div>
            {metric.sublabel && (
              <div className="mt-0.5 text-[8px] leading-tight text-slate-600">{metric.sublabel}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getNextSectionId(sections: Section[]): number {
  return sections.reduce((max, s) => Math.max(max, s.id), 0) + 1;
}

function createQuestion(sectionId: number, index: number, text = "", wordLimit = "No limit"): Question {
  return {
    id: `q${sectionId}_${index}`,
    text,
    wordLimit,
    aiResponse: "",
    confidence: 0,
    sources: [],
    gapFlag: false,
    status: "not_generated",
  };
}

type SectionDraft = {
  name: string;
  page: string;
  questions: { id?: string; text: string; wordLimit: string }[];
};

function draftToSection(draft: SectionDraft, existing?: Section): Section | null {
  const name = draft.name.trim();
  if (!name) return null;

  const page = Number.parseInt(draft.page, 10);
  const sectionId = existing?.id ?? 0;
  const validQuestions = draft.questions
    .map((q, index) => ({
      text: q.text.trim(),
      wordLimit: q.wordLimit.trim() || "No limit",
      id: q.id ?? `q${sectionId}_${index + 1}`,
    }))
    .filter((q) => q.text.length > 0);

  const questions: Question[] =
    validQuestions.length > 0
      ? validQuestions.map((q, index) => {
          const existingQ = existing?.questions.find((eq) => eq.id === q.id);
          if (existingQ) {
            return { ...existingQ, text: q.text, wordLimit: q.wordLimit };
          }
          return createQuestion(sectionId, index + 1, q.text, q.wordLimit);
        })
      : [createQuestion(sectionId, 1)];

  return {
    id: sectionId,
    name,
    page: Number.isNaN(page) ? existing?.page ?? 1 : page,
    weighting: existing?.weighting ?? "—",
    reviewer: existing?.reviewer ?? "Unassigned",
    dueDate: existing?.dueDate ?? getTodayIsoDate(),
    status: existing?.status ?? "not_generated",
    questions,
  };
}

// ─── Progress Bar & Workflow Navigation ──────────────────────

const STAGES: { key: RFPStage; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "parsed", label: "Parsed" },
  { key: "assigned", label: "Assigned" },
  { key: "drafting", label: "Draft" },
  { key: "review", label: "Review" },
];

function getStageIndex(stage: RFPStage): number {
  return STAGES.findIndex((item) => item.key === stage);
}

function getNextStageLabel(
  stage: RFPStage,
  options: { allAnswersGenerated?: boolean; packFilesEvaluated?: boolean } = {}
): string | null {
  const { allAnswersGenerated = false, packFilesEvaluated = false } = options;
  switch (stage) {
    case "upload":
      return packFilesEvaluated ? "Next Step" : "Parse Document";
    case "parsed":
      return "Confirm Sections → Assign";
    case "assigned":
      return "Confirm Assignments";
    case "drafting":
      return allAnswersGenerated ? "Review Answers" : "Generate Answers";
    case "review":
      return null;
    default:
      return "Continue";
  }
}

interface UploadMeta {
  fileName: string;
  uploaded: boolean;
}

function WorkflowProgressBar({
  currentStage,
  maxReachedIndex,
  onStageSelect,
}: {
  currentStage: RFPStage;
  maxReachedIndex: number;
  onStageSelect: (stage: RFPStage) => void;
}) {
  const currentIdx = getStageIndex(currentStage);

  return (
    <div className="mb-6 overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
      <div className="flex w-max gap-1 sm:w-full">
      {STAGES.map((stage, index) => {
        const isDone = index < currentIdx;
        const isCurrent = index === currentIdx;
        const isReachable = index <= maxReachedIndex;

        return (
          <button
            key={stage.key}
            type="button"
            disabled={!isReachable}
            onClick={() => isReachable && onStageSelect(stage.key)}
            className={`min-w-[72px] shrink-0 rounded-md border py-2 text-center text-[10px] font-semibold uppercase tracking-wider transition-all sm:min-w-0 sm:flex-1 sm:shrink ${
              isDone
                ? "border-emerald-500/20 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25"
                : isCurrent
                ? "border-indigo-500/30 bg-indigo-500/20 text-indigo-300"
                : isReachable
                ? "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                : "cursor-not-allowed border-white/[0.04] bg-white/[0.02] text-slate-600"
            }`}
          >
            {isDone && <Check className="mr-1 inline h-3 w-3" />}
            {stage.label}
          </button>
        );
      })}
      </div>
    </div>
  );
}

function WorkflowNav({
  showBack,
  showNext,
  nextLabel,
  onBack,
  onNext,
  nextDisabled,
  nextLoading = false,
  nextLoadingLabel = "Loading...",
}: {
  showBack: boolean;
  showNext: boolean;
  nextLabel: string | null;
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  nextLoadingLabel?: string;
}) {
  if (!showBack && !showNext) return null;

  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2 text-[12px] font-medium text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      ) : (
        <span />
      )}

      {showNext && nextLabel && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nextLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {nextLoadingLabel}
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN: RFP DETAIL VIEW
// ═══════════════════════════════════════════════════════════════

interface RFPDetailViewProps {
  fileId: string;
  packId: string;
  agentId: string;
  packFileCount: number;
  rfpName: string;
  onBack: () => void;
  documentFileName?: string;
}

export default function RFPDetailView({
  fileId,
  packId,
  agentId,
  packFileCount,
  rfpName,
  onBack,
  documentFileName,
}: RFPDetailViewProps) {
  const dispatch = useAppDispatch();
  const workflowEntry = useMemo(
    () => resolveRfpWorkflowEntry(agentId, packId, packFileCount),
    [agentId, packId, packFileCount]
  );
  const fileByIdEntry = useAppSelector((state) => state.idgRfp.fileById[fileId]);
  const resolvedPackId = packId.trim() || fileByIdEntry?.file?.pack_id?.trim() || "";
  const packCacheEntry = useAppSelector((state) => selectApiPackByIdEntry(state, resolvedPackId));
  const rfpFile = useAppSelector((state) => selectRfpPackFile(state, resolvedPackId, fileId));
  const isDraftFileLoading = Boolean(fileByIdEntry?.loading && !packCacheEntry?.loaded);
  const apiSections = useMemo(() => getRfpSectionsFromFile(rfpFile), [rfpFile]);
  const apiSectionCount = apiSections.length;
  const apiQuestionCount = useMemo(
    () => apiSections.reduce((total, section) => total + (section.questions?.length ?? 0), 0),
    [apiSections]
  );
  const reviewSectionsReadyForEdit = useMemo(
    () => countSectionsReadyForReviewEdit(apiSections),
    [apiSections]
  );
  const reviewSectionsWaitingForAi = useMemo(
    () => countSectionsWaitingForReviewAi(apiSections),
    [apiSections]
  );
  const allAnswersGenerated = useMemo(() => areAllAnswersGenerated(apiSections), [apiSections]);
  const assignmentsBySectionId = useAppSelector((state) => state.questionAssignments.assignmentsBySectionId);
  const [stage, setStage] = useState<RFPStage>(
    () => resolveRfpWorkflowEntry(agentId, packId, packFileCount).stage
  );
  const [maxReachedIndex, setMaxReachedIndex] = useState(
    () => resolveRfpWorkflowEntry(agentId, packId, packFileCount).maxReachedIndex
  );
  const [parsedSubViewActive, setParsedSubViewActive] = useState(false);
  const packUploadedFiles = useAppSelector((state) => {
    const files = state.idgRfp.filesByAgentId[agentId]?.files ?? [];
    return files.filter((file) => file.pack_id === packId);
  });
  const hasParsingPackFiles = packUploadedFiles.some((file) => file.is_evaluated !== 1);
  const packFilesEvaluated = packUploadedFiles.length > 0 && !hasParsingPackFiles;
  const shouldPollUploadFiles = hasParsingPackFiles;
  const [sections, setSections] = useState<Section[]>(MOCK_SECTIONS);
  const [isConfirmingAssignments, setIsConfirmingAssignments] = useState(false);
  const [isUnassigningSection, setIsUnassigningSection] = useState(false);
  const [hasTeamMembers, setHasTeamMembers] = useState<boolean | null>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [selectedForGeneration, setSelectedForGeneration] = useState<Set<number>>(
    new Set(MOCK_SECTIONS.filter(s => s.status !== "manual").map(s => s.id))
  );
  const [uploadMeta, setUploadMeta] = useState<UploadMeta>(() => {
    const entry = resolveRfpWorkflowEntry(agentId, packId, packFileCount);
    return {
      fileName: documentFileName ?? `${rfpName.replace(/\s+/g, "_")}.pdf`,
      uploaded: entry.uploaded,
    };
  });
  const wasWaitingForReviewAiRef = useRef(false);

  useEffect(() => {
    setStage(workflowEntry.stage);
    setMaxReachedIndex(workflowEntry.maxReachedIndex);
    setUploadMeta((current) => ({
      ...current,
      fileName: documentFileName ?? current.fileName,
      uploaded: workflowEntry.uploaded,
    }));
  }, [workflowEntry, documentFileName]);

  useEffect(() => {
    if (!agentId.trim() || !packId.trim()) return;

    saveRfpWorkflowState(agentId, packId, {
      stage,
      maxReachedIndex,
      fileCount: packFileCount,
      uploaded: uploadMeta.uploaded,
    });
  }, [agentId, packId, packFileCount, stage, maxReachedIndex, uploadMeta.uploaded]);

  const currentStageIndex = getStageIndex(stage);
  const showWorkflowNav = selectedSectionIndex === null && !parsedSubViewActive;

  const handleTeamMembersLoaded = useCallback((members: AssignableUser[]) => {
    setHasTeamMembers(members.length > 0);
  }, []);

  useEffect(() => {
    if (!agentId.trim() || !shouldPollUploadFiles) return;

    let cancelled = false;
    let inFlight = false;
    let intervalId: number | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const pollFiles = async () => {
      if (cancelled || inFlight) return;

      inFlight = true;
      try {
        const result = await dispatch(fetchIdgRfpFiles({ agentId, force: true, silent: true }));
        if (cancelled) return;

        if (fetchIdgRfpFiles.fulfilled.match(result)) {
          const files = result.payload.files ?? [];
          void triggerAnswerByAiForEvaluatedFiles(files);
          void dispatch(syncEvaluatedRfpFilesAndPacks({ agentId }));
          if (!rfpFilesNeedEvaluationPoll(files)) {
            stopPolling();
          }
        }
      } finally {
        inFlight = false;
      }
    };

    void pollFiles();
    intervalId = window.setInterval(() => {
      void pollFiles();
    }, IDG_RFP_FILES_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [agentId, dispatch, shouldPollUploadFiles]);

  useEffect(() => {
    if (stage !== "parsed") {
      setParsedSubViewActive(false);
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== "review") {
      wasWaitingForReviewAiRef.current = false;
      return;
    }

    if (reviewSectionsWaitingForAi > 0) {
      wasWaitingForReviewAiRef.current = true;
      return;
    }

    if (wasWaitingForReviewAiRef.current && reviewSectionsReadyForEdit > 0) {
      const message =
        reviewSectionsReadyForEdit === 1
          ? "1 section's answers generated"
          : `${reviewSectionsReadyForEdit} sections' answers generated`;
      toast.success(message);
    }

    wasWaitingForReviewAiRef.current = false;
  }, [stage, reviewSectionsReadyForEdit, reviewSectionsWaitingForAi]);

  useEffect(() => {
    if (stage !== "review" || !fileId || reviewSectionsWaitingForAi === 0) return;

    const resolvedPackId = packId.trim() || rfpFile?.pack_id?.trim();
    if (!resolvedPackId) return;

    let cancelled = false;
    let inFlight = false;
    let intervalId: number | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const pollReviewData = async () => {
      if (cancelled || inFlight) return;

      inFlight = true;
      try {
        await dispatch(parseIdgRfpPack({ packId: resolvedPackId, fileId, silent: true }));
      } finally {
        inFlight = false;
      }
    };

    void pollReviewData();
    intervalId = window.setInterval(() => {
      void pollReviewData();
    }, IDG_RFP_PACK_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [stage, fileId, resolvedPackId, dispatch, reviewSectionsWaitingForAi]);

  useEffect(() => {
    if (stage !== "drafting" || apiSections.length === 0) return;
    setSelectedForGeneration(new Set(apiSections.map((_, index) => index + 1)));
  }, [stage, apiSections.length, fileId]);

  const goToStage = (targetStage: RFPStage) => {
    const targetIndex = getStageIndex(targetStage);
    if (targetIndex <= maxReachedIndex) {
      setStage(targetStage);
    }
  };

  const goBack = () => {
    if (currentStageIndex > 0) {
      setStage(STAGES[currentStageIndex - 1].key);
    }
  };

  const validateCurrentStage = (): boolean => {
    switch (stage) {
      case "upload":
        if (packFileCount === 0) {
          toast.error("Upload a document before continuing.");
          return false;
        }
        return true;
      case "parsed":
        if (apiSectionCount === 0) {
          toast.error("Add at least one section before continuing.");
          return false;
        }
        return true;
      case "assigned":
        return true;
      case "drafting":
        if (selectedForGeneration.size === 0) {
          toast.error("Select at least one section to generate answers.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const advanceToNextStage = () => {
    const nextIndex = currentStageIndex + 1;
    if (nextIndex < STAGES.length) {
      setMaxReachedIndex((current) => Math.max(current, nextIndex));
      setStage(STAGES[nextIndex].key);
    }
  };

  const goNext = async () => {
    if (!validateCurrentStage()) return;

    if (stage === "assigned") {
      if (hasTeamMembers === false) {
        advanceToNextStage();
        return;
      }

      const bulkRfpTitle = rfpFile?.title?.trim() || rfpName.trim();
      if (!resolvedPackId) {
        toast.error("Pack ID not found for this RFP.");
        return;
      }

      const payload = buildBulkAssignmentsPayload(
        apiSections,
        sections,
        resolvedPackId,
        bulkRfpTitle,
        agentId,
        assignmentsBySectionId,
        { localChangesOnly: true }
      );
      if (payload.sections.length === 0) {
        advanceToNextStage();
        return;
      }

      setIsConfirmingAssignments(true);
      try {
        const response = await createBulkAssignments(payload);
        void dispatch(fetchQuestionAssignments({ force: true }));
        toast.success(response.message || "Assignments confirmed.");
        advanceToNextStage();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to confirm assignments.";
        toast.error(message);
      } finally {
        setIsConfirmingAssignments(false);
      }
      return;
    }

    advanceToNextStage();
  };

  // ── Section Editor (Review) — API-driven questions from Redux ──
  if (selectedSectionIndex !== null) {
    const reviewer =
      sections[selectedSectionIndex]?.reviewer ??
      MOCK_SECTIONS[selectedSectionIndex]?.reviewer ??
      "Ronan";

    return (
      <SectionEditor
        fileId={fileId}
        sectionIndex={selectedSectionIndex}
        reviewer={reviewer}
        onBack={() => setSelectedSectionIndex(null)}
        onLockAll={() => setSelectedSectionIndex(null)}
        totalSections={apiSectionCount}
        onNext={() => {
          if (selectedSectionIndex < apiSectionCount - 1) {
            setSelectedSectionIndex(selectedSectionIndex + 1);
          }
        }}
        onPrev={() => {
          if (selectedSectionIndex > 0) {
            setSelectedSectionIndex(selectedSectionIndex - 1);
          }
        }}
      />
    );
  }

  // ── Stage Views ──
  return (
    <div>
      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mb-4"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to RFP list
      </button>

      {/* RFP Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
        <h2 className="text-[18px] font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          {rfpName}
        </h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Clock className="w-3 h-3" />
          Deadline: 24 May 2025 (8 days)
        </div>
      </div>
      <p className="text-[12px] text-slate-500 mb-4">
        {rfpFile?.title ?? uploadMeta.fileName ?? rfpName}
        {/* · 47 pages */}
        · {apiSectionCount} sections · {apiQuestionCount} questions
      </p>

      <RfpOutcomeStrip />

      <WorkflowProgressBar
        currentStage={stage}
        maxReachedIndex={maxReachedIndex}
        onStageSelect={goToStage}
      />

      {stage === "upload" && (
        <UploadStage packFiles={packUploadedFiles} packName={rfpName} agentId={agentId} />
      )}

      {/* ── PARSED STAGE ── */}
      {stage === "parsed" && (
        <ParsedStage
          fileId={fileId}
          packId={packId}
          agentId={agentId}
          packFileCount={packFileCount}
          sections={sections}
          onSectionsChange={setSections}
          onSubViewChange={setParsedSubViewActive}
        />
      )}

      {/* ── ASSIGNED STAGE ── */}
      {stage === "assigned" && (
        <AssignedStage
          fileId={fileId}
          sections={sections}
          onSectionsChange={setSections}
          assignmentsDisabled={isConfirmingAssignments}
          onTeamMembersLoaded={handleTeamMembersLoaded}
          onUnassigningChange={setIsUnassigningSection}
        />
      )}

      {/* ── DRAFTING STAGE ── */}
      {stage === "drafting" && (
        <DraftingStage
          fileId={fileId}
          isLoading={isDraftFileLoading}
          selectedForGeneration={selectedForGeneration}
          onToggleSection={(id) => {
            setSelectedForGeneration((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onToggleAll={() => {
            const allIds = apiSections.map((_, index) => index + 1);
            if (selectedForGeneration.size === allIds.length) {
              setSelectedForGeneration(new Set());
            } else {
              setSelectedForGeneration(new Set(allIds));
            }
          }}
        />
      )}

      {/* ── REVIEW STAGE ── */}
      {stage === "review" && (
        <ReviewStage
          fileId={fileId}
          rfpName={rfpName}
          onOpenSection={setSelectedSectionIndex}
          onLockAllAnswers={() => {
            toast.success("All answers locked.");
          }}
        />
      )}

      {showWorkflowNav && (
        <WorkflowNav
          showBack={currentStageIndex > 0}
          showNext={stage !== "review"}
          nextLabel={getNextStageLabel(stage, { allAnswersGenerated, packFilesEvaluated })}
          onBack={goBack}
          onNext={() => void goNext()}
          nextLoading={stage === "assigned" && isConfirmingAssignments}
          nextLoadingLabel="Confirming..."
          nextDisabled={
            stage === "upload"
              ? packFileCount === 0
              : stage === "parsed"
              ? apiSectionCount === 0
              : stage === "assigned"
              ? hasTeamMembers === null || isUnassigningSection
              : stage === "drafting"
              ? selectedForGeneration.size === 0
              : false
          }
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD STAGE — Document upload
// ═══════════════════════════════════════════════════════════════

function UploadStage({
  packFiles,
  packName,
  agentId,
}: {
  packFiles: IDGRfpFile[];
  packName?: string;
  agentId: string;
}) {
  const dispatch = useAppDispatch();
  const [retryingFileId, setRetryingFileId] = useState<string | null>(null);

  const handleRetryIngest = useCallback(
    async (fileId: string) => {
      if (!fileId.trim() || retryingFileId) return;

      setRetryingFileId(fileId);
      try {
        await retryRfpIngest(fileId);
        toast.success("Retry started. Parsing will resume shortly.");
        if (agentId.trim()) {
          await dispatch(fetchIdgRfpFiles({ agentId, force: true, silent: true }));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to retry ingest.");
      } finally {
        setRetryingFileId(null);
      }
    },
    [agentId, dispatch, retryingFileId]
  );

  const packRows = useMemo(() => {
    const order: string[] = [];
    const byPack = new Map<string, IDGRfpFile[]>();

    for (const file of packFiles) {
      const packKey = file.pack_id?.trim() || file.file_id;
      if (!byPack.has(packKey)) order.push(packKey);
      const group = byPack.get(packKey) ?? [];
      group.push(file);
      byPack.set(packKey, group);
    }

    return order.flatMap((packKey) => {
      const files = byPack.get(packKey) ?? [];
      if (files.length === 0) return [];

      const [pack] = groupRfpListItemsByPack(files.map((file) => mapRfpFileToListItem(file)));
      if (!pack) return [];

      return [{ packKey, pack, files }];
    });
  }, [packFiles]);

  return (
    <div>
      <div className="rounded-xl border border-indigo-500/20 p-4 mb-6" style={{ background: "rgba(99,102,241,0.04)" }}>
        <div className="flex items-start gap-2">
          <Upload className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <span className="text-[12px] text-indigo-200/80 leading-relaxed">
            Documents in this pack are listed below. Parsing runs in the background — continue to the Parsed tab to review sections as they are generated.
          </span>
        </div>
      </div>

      {packRows.length > 0 ? (
        <div className="space-y-3">
          {packRows.map(({ packKey, pack, files }) => {
            const displayName = packName?.trim() || pack.name;
            const fileTitles = files.map((file) => file.title).join(" · ");

            return (
              <div
                key={packKey}
                className="flex items-center gap-4 rounded-xl border border-white/[0.06] px-5 py-4"
                style={{ background: "rgba(255,255,255,0.015)" }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-500/[0.1] bg-indigo-500/[0.06]">
                  <FileText className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h4
                      className="truncate text-[13px] font-semibold text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {displayName}
                    </h4>
                    {pack.status !== "in_progress" && (
                      <RfpPackStatusBadge
                        status={pack.status}
                        retryFileId={pack.retryFileId}
                        isRetrying={Boolean(pack.retryFileId && retryingFileId === pack.retryFileId)}
                        onRetry={handleRetryIngest}
                      />
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-4">
                    {pack.fileCount > 1 && (
                      <span className="text-[11px] text-indigo-400/80">
                        {pack.fileCount} documents
                      </span>
                    )}
                    {pack.category ? (
                      <span className="text-[11px] text-slate-500">{pack.category}</span>
                    ) : null}
                    {pack.categoryDescription ? (
                      <span className="text-[11px] text-slate-500">{pack.categoryDescription}</span>
                    ) : null}
                    {pack.country ? (
                      <span className="text-[11px] text-slate-500">
                        <Clock className="mr-1 inline h-3 w-3 opacity-60" />
                        {pack.country}
                      </span>
                    ) : null}
                    {pack.isEvaluated ? (
                      <span className="text-[11px] text-emerald-400/80">Evaluated</span>
                    ) : null}
                  </div>
                  {fileTitles ? (
                    <p className="mt-1 truncate text-[10px] text-slate-600">{fileTitles}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-6 py-14 text-center"
        >
          <Upload className="mx-auto mb-3 h-6 w-6 text-slate-500" />
          <p className="text-[14px] font-semibold text-slate-200">No documents in this pack yet</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Use the + button on the RFP list to upload documents to this pack.
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PARSED STAGE — AI broke document into sections
// ═══════════════════════════════════════════════════════════════

type ParsedView = "overview" | "add";

const NEW_QUESTION_DRAFT_ID = "__new__";

function getApiQuestionEditKey(sectionIndex: number, questionId: string): string {
  return `${sectionIndex}:${questionId}`;
}

function getQuestionEditKey(sectionId: number, questionId: string): string {
  return `${sectionId}:${questionId}`;
}

function updateSectionQuestion(
  sections: Section[],
  sectionId: number,
  questionId: string,
  patch: { text: string; wordLimit: string }
): Section[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section;
    return {
      ...section,
      questions: section.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question
      ),
    };
  });
}

function ApiSectionQuestionsRows({
  sectionIndex,
  questions,
  editingQuestionKey,
  editBuffer,
  isSavingQuestion,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onEditBufferChange,
  onDeleteQuestion,
  onAddQuestion,
}: {
  sectionIndex: number;
  questions: IDGRfpSectionQuestion[];
  editingQuestionKey: string | null;
  editBuffer: { text: string; wordLimit: string };
  isSavingQuestion: boolean;
  onStartEdit: (question: IDGRfpSectionQuestion) => void;
  onCancelEdit: () => void;
  onCommitEdit: (questionId: string) => void;
  onEditBufferChange: (buffer: { text: string; wordLimit: string }) => void;
  onDeleteQuestion: (questionId: string) => void;
  onAddQuestion: () => void;
}) {
  const canDelete = questions.length > 1;

  return (
    <div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="border-b border-white/[0.04]">
            <th className="w-10 px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              #
            </th>
            <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              Question
            </th>
            <th className="w-28 px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              Word limit
            </th>
            <th className="w-10 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {questions.map((question, questionIndex) => {
            const editKey = getApiQuestionEditKey(sectionIndex, question.question_id);
            const isEditing = editingQuestionKey === editKey;

            if (isEditing) {
              return (
                <tr key={question.question_id} className="border-b border-indigo-500/20 bg-indigo-500/[0.06]">
                  <td colSpan={4} className="px-3 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                      Question {questionIndex + 1}
                    </p>
                    <textarea
                      value={editBuffer.text}
                      onChange={(e) => onEditBufferChange({ ...editBuffer, text: e.target.value })}
                      rows={2}
                      autoFocus
                      placeholder="Enter the question text from the RFP..."
                      disabled={isSavingQuestion}
                      className="mb-2 w-full resize-none rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-[12px] leading-relaxed text-white outline-none focus:border-indigo-400/60 disabled:opacity-60"
                    />
                    <input
                      value={editBuffer.wordLimit}
                      onChange={(e) => onEditBufferChange({ ...editBuffer, wordLimit: e.target.value })}
                      placeholder="Word limit"
                      disabled={isSavingQuestion}
                      className="w-full rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none focus:border-indigo-400/60 disabled:opacity-60"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => onDeleteQuestion(question.question_id)}
                          disabled={isSavingQuestion}
                          className="flex items-center gap-1 rounded-md border border-red-500/20 px-3 py-1 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      ) : (
                        <span />
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={onCancelEdit}
                          disabled={isSavingQuestion}
                          className="rounded-md border border-white/[0.08] px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/[0.04] disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => onCommitEdit(question.question_id)}
                          disabled={isSavingQuestion}
                          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSavingQuestion ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Update"
                          )}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr
                key={question.question_id}
                onClick={() => editingQuestionKey === null && !isSavingQuestion && onStartEdit(question)}
                className={`border-b border-white/[0.03] transition-colors ${
                  editingQuestionKey === null && !isSavingQuestion
                    ? "cursor-pointer hover:bg-white/[0.03]"
                    : "opacity-50"
                }`}
              >
                <td className="px-3 py-2.5 text-[11px] text-slate-500">{questionIndex + 1}</td>
                <td className="px-3 py-2.5 text-[12px] leading-relaxed text-slate-300">{question.question}</td>
                <td className="px-3 py-2.5 text-[11px] text-slate-500">
                  {formatWordLimitLabel(question.word_limit)}
                </td>
                <td className="px-2 py-2.5">
                  {canDelete && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteQuestion(question.question_id);
                      }}
                      disabled={editingQuestionKey !== null || isSavingQuestion}
                      className="rounded p-1 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Delete question ${questionIndex + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}

          {editingQuestionKey === getApiQuestionEditKey(sectionIndex, NEW_QUESTION_DRAFT_ID) && (
            <tr className="border-b border-indigo-500/20 bg-indigo-500/[0.06]">
              <td colSpan={4} className="px-3 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                  New question
                </p>
                <textarea
                  value={editBuffer.text}
                  onChange={(e) => onEditBufferChange({ ...editBuffer, text: e.target.value })}
                  rows={2}
                  autoFocus
                  placeholder="Enter the question text from the RFP..."
                  disabled={isSavingQuestion}
                  className="mb-2 w-full resize-none rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-[12px] leading-relaxed text-white outline-none focus:border-indigo-400/60 disabled:opacity-60"
                />
                <input
                  value={editBuffer.wordLimit}
                  onChange={(e) => onEditBufferChange({ ...editBuffer, wordLimit: e.target.value })}
                  placeholder="Word limit"
                  disabled={isSavingQuestion}
                  className="w-full rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none focus:border-indigo-400/60 disabled:opacity-60"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    disabled={isSavingQuestion}
                    className="rounded-md border border-white/[0.08] px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/[0.04] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onCommitEdit(NEW_QUESTION_DRAFT_ID)}
                    disabled={isSavingQuestion}
                    className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingQuestion ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Update"
                    )}
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <button
        type="button"
        onClick={onAddQuestion}
        disabled={editingQuestionKey !== null || isSavingQuestion}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-white/[0.1] px-3 py-2 text-[11px] font-medium text-indigo-400 transition-colors hover:border-indigo-500/30 hover:bg-indigo-500/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add question
      </button>
    </div>
  );
}

function GeneratingSectionsLoaderRow({
  colSpan,
  fullHeight = false,
}: {
  colSpan: number;
  fullHeight?: boolean;
}) {
  return (
    <tr className="border-b border-white/[0.03] bg-amber-500/[0.02]">
      <td colSpan={colSpan} className={fullHeight ? "px-4 py-16" : "px-4 py-8"}>
        <div className="flex flex-col items-center justify-center gap-2 text-amber-300/90">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-[12px] font-semibold animate-pulse">Generating...</span>
        </div>
      </td>
    </tr>
  );
}

function ParsedStage({
  fileId,
  packId,
  agentId,
  packFileCount,
  onSubViewChange,
}: {
  fileId: string;
  packId: string;
  agentId: string;
  packFileCount: number;
  sections?: Section[];
  onSectionsChange?: (sections: Section[]) => void;
  onSubViewChange: (active: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const fileByIdEntry = useAppSelector((state) => state.idgRfp.fileById[fileId]);
  const resolvedPackId = packId.trim() || fileByIdEntry?.file?.pack_id?.trim() || "";
  const packCacheEntry = useAppSelector((state) => selectApiPackByIdEntry(state, resolvedPackId));
  const rfpFile = useAppSelector((state) => selectRfpPackFile(state, resolvedPackId, fileId));
  const resolvedAgentId = agentId.trim() || rfpFile?.agent_id?.trim() || "";
  const listPackFiles = useAppSelector((state) => {
    const files = state.idgRfp.filesByAgentId[resolvedAgentId]?.files ?? [];
    return files.filter((file) => file.pack_id === packId);
  });
  const listEvalProgress = useMemo(() => getPackEvaluationProgress(listPackFiles), [listPackFiles]);
  const packFiles = useMemo(() => getPackFilesFromRfpFile(rfpFile), [rfpFile]);
  const packEvalProgress = useMemo(() => getPackEvaluationProgress(packFiles), [packFiles]);
  const hasPackDetailLoaded = Boolean(packCacheEntry?.loaded);
  const sectionProgress = useMemo(() => {
    if (hasPackDetailLoaded && packFiles.length > 0) {
      return packEvalProgress;
    }
    if (listEvalProgress.total > 0) {
      return listEvalProgress;
    }
    const total = Math.max(packFileCount, 1);
    return {
      total,
      evaluated: 0,
      pending: total,
      allEvaluated: false,
      hasPending: true,
    };
  }, [hasPackDetailLoaded, listEvalProgress, packEvalProgress, packFileCount, packFiles.length]);
  const apiSections = useMemo(() => getRfpSectionsFromFile(rfpFile), [rfpFile]);
  const apiQuestionCount = useMemo(
    () => apiSections.reduce((total, section) => total + (section.questions?.length ?? 0), 0),
    [apiSections]
  );
  const hasMultiplePackFiles = Math.max(packFiles.length, listPackFiles.length) > 1;
  const packFilesEvaluated =
    listPackFiles.length > 0 && listPackFiles.every((file) => file.is_evaluated === 1);
  const isGeneratingSections = packFilesEvaluated
    ? rfpPackNeedsSectionPoll(rfpFile)
    : sectionProgress.hasPending;
  const canUseParsedActions = useMemo(() => {
    if (!hasPackDetailLoaded) return false;
    return packFiles.some((file) => file.is_evaluated === 1);
  }, [hasPackDetailLoaded, packFiles]);
  const [view, setView] = useState<ParsedView>("overview");
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedSectionIndex, setExpandedSectionIndex] = useState<number | null>(null);
  const [editingQuestionKey, setEditingQuestionKey] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState({ text: "", wordLimit: "" });
  const [sectionEditBuffer, setSectionEditBuffer] = useState({ name: "" });
  const [isUpdatingSection, setIsUpdatingSection] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  const refreshRfpFile = useCallback(async () => {
    const resolvedPackId = packId.trim() || rfpFile?.pack_id?.trim();
    if (resolvedPackId) {
      await dispatch(parseIdgRfpPack({ packId: resolvedPackId, fileId, force: true }));
      return;
    }
    await dispatch(fetchIdgRfpFileById({ fileId }));
  }, [dispatch, fileId, packId, rfpFile?.pack_id]);

  useEffect(() => {
    if (expandedSectionIndex === null) return;
    const section = apiSections[expandedSectionIndex];
    if (section) {
      setSectionEditBuffer({
        name: section.section,
      });
    }
  }, [expandedSectionIndex, apiSections]);

  const setParsedView = (nextView: ParsedView) => {
    setView(nextView);
    onSubViewChange(nextView !== "overview");
  };

  const exitQuestionEdit = () => {
    setEditingQuestionKey(null);
    setEditBuffer({ text: "", wordLimit: "" });
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      setIsEditMode(false);
      setExpandedSectionIndex(null);
      exitQuestionEdit();
      return;
    }
    setIsEditMode(true);
    setExpandedSectionIndex(apiSections.length > 0 ? 0 : null);
  };

  const toggleSectionExpand = (sectionIndex: number) => {
    if (!isEditMode) return;
    exitQuestionEdit();
    setExpandedSectionIndex((current) => (current === sectionIndex ? null : sectionIndex));
  };

  const startQuestionEdit = (sectionIndex: number, question: IDGRfpSectionQuestion) => {
    setEditingQuestionKey(getApiQuestionEditKey(sectionIndex, question.question_id));
    setEditBuffer({
      text: question.question,
      wordLimit: formatWordLimitLabel(question.word_limit),
    });
  };

  const commitQuestionEdit = async (sectionIndex: number, questionId: string) => {
    const text = editBuffer.text.trim();
    if (!text) {
      toast.error("Question text cannot be empty.");
      return;
    }
    if (!agentId.trim()) {
      toast.error("Agent ID is missing for this RFP.");
      return;
    }

    const wordLimit = parseWordLimitForApi(editBuffer.wordLimit.trim() || "No limit");
    const section = apiSections[sectionIndex];
    const sectionQuestions = section?.questions ?? [];
    const { fileId: targetFileId, sectionIndex: targetSectionIndex } = getRfpSectionApiTarget(
      section,
      sectionIndex,
      fileId
    );

    setIsSavingQuestion(true);
    try {
      if (questionId === NEW_QUESTION_DRAFT_ID) {
        await addRfpQuestion({
          agentId,
          fileId: targetFileId,
          sectionIndex: targetSectionIndex,
          id: sectionQuestions.length + 1,
          question: text,
          ...(wordLimit !== undefined ? { wordLimit } : {}),
        });
        toast.success("Question added.");
      } else {
        await updateRfpQuestion({
          agentId,
          fileId: targetFileId,
          questionId,
          question: text,
          ...(wordLimit !== undefined ? { wordLimit } : {}),
        });
        toast.success("Question updated.");
      }
      await refreshRfpFile();
      exitQuestionEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save question.";
      toast.error(message);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const commitSectionMeta = async (sectionIndex: number) => {
    const name = sectionEditBuffer.name.trim();
    if (!name) {
      toast.error("Section name is required.");
      return;
    }
    const pageNumber = 1;
    if (!agentId.trim()) {
      toast.error("Agent ID is missing for this RFP.");
      return;
    }

    setIsUpdatingSection(true);
    try {
      const section = apiSections[sectionIndex];
      const { fileId: targetFileId, sectionIndex: targetSectionIndex } = getRfpSectionApiTarget(
        section,
        sectionIndex,
        fileId
      );

      await updateRfpSection({
        agentId,
        fileId: targetFileId,
        section: name,
        pageNumber,
        sectionIndex: targetSectionIndex,
      });
      await refreshRfpFile();
      toast.success("Section updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update section.";
      toast.error(message);
    } finally {
      setIsUpdatingSection(false);
    }
  };

  const cancelSectionMeta = () => {
    if (expandedSectionIndex === null) return;
    const section = apiSections[expandedSectionIndex];
    if (!section) return;
    setSectionEditBuffer({
      name: section.section,
    });
  };

  const addQuestionToSection = (sectionIndex: number) => {
    exitQuestionEdit();
    setEditingQuestionKey(getApiQuestionEditKey(sectionIndex, NEW_QUESTION_DRAFT_ID));
    setEditBuffer({ text: "", wordLimit: "No limit" });
  };

  const deleteQuestionFromSection = async (sectionIndex: number, questionId: string) => {
    const sectionQuestions = apiSections[sectionIndex]?.questions ?? [];
    if (sectionQuestions.length <= 1) {
      toast.error("At least one question is required per section.");
      return;
    }
    if (!agentId.trim()) {
      toast.error("Agent ID is missing for this RFP.");
      return;
    }

    if (editingQuestionKey === getApiQuestionEditKey(sectionIndex, questionId)) {
      exitQuestionEdit();
    }

    setIsSavingQuestion(true);
    try {
      const section = apiSections[sectionIndex];
      const { fileId: targetFileId, sectionIndex: targetSectionIndex } = getRfpSectionApiTarget(
        section,
        sectionIndex,
        fileId
      );

      await deleteRfpQuestion({
        agentId,
        fileId: targetFileId,
        questionId,
        sectionIndex: targetSectionIndex,
      });
      await refreshRfpFile();
      toast.success("Question removed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete question.";
      toast.error(message);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  if (view === "add") {
    return (
      <ParsedAddSectionPanel
        fileId={fileId}
        agentId={resolvedAgentId}
        onBack={() => setParsedView("overview")}
        onSaved={() => setParsedView("overview")}
      />
    );
  }

  return (
    <div>
      {isGeneratingSections ? (
        <div className="rounded-xl border border-amber-500/20 p-4 mb-6" style={{ background: "rgba(245,158,11,0.04)" }}>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            <span className="text-[13px] text-amber-200 font-medium animate-pulse">
              Generating sections...{" "}
              <strong>
                {sectionProgress.evaluated}/{sectionProgress.total}
              </strong>{" "}
              documents processed
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/20 p-4 mb-6" style={{ background: "rgba(16,185,129,0.04)" }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[13px] text-emerald-300 font-medium">
              Parsing complete. Found <strong>{apiSections.length} sections</strong> with{" "}
              <strong>{apiQuestionCount} questions</strong>.
            </span>
          </div>
        </div>
      )}

      {isEditMode && (
        <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-3">
          <p className="text-[12px] text-indigo-200">
            Expand a section to edit its name, add or remove questions, and click a question row to edit inline.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-white/[0.06] overflow-x-auto" style={{ background: "rgba(255,255,255,0.01)" }}>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">#</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Section</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Questions</th>
              {/* <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Page</th> */}
              {isEditMode && <th className="w-8 px-2 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isGeneratingSections && apiSections.length === 0 && (
              <GeneratingSectionsLoaderRow colSpan={isEditMode ? 4 : 3} fullHeight />
            )}
            {!isEditMode
              ? apiSections.map((section, index) => (
                  <tr
                    key={`${section.source_file_id ?? "section"}-${section.section}-${index}`}
                    className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="text-[12px] text-slate-400 px-4 py-3">{index + 1}</td>
                    <td className="text-[12px] text-white font-medium px-4 py-3">
                      <div>{section.section}</div>
                      {hasMultiplePackFiles && section.source_file_title ? (
                        <div className="mt-0.5 truncate text-[10px] font-normal text-slate-600">
                          {section.source_file_title}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-[12px] text-slate-400 px-4 py-3">{section.questions?.length ?? 0}</td>
                    {/* <td className="text-[12px] text-slate-500 px-4 py-3">{section.page}</td> */}
              </tr>
                ))
              : apiSections.map((section, sectionIndex) => {
              const isExpanded = isEditMode && expandedSectionIndex === sectionIndex;
              const sectionQuestions = section.questions ?? [];
              const columnCount = isEditMode ? 4 : 3;

              return (
                <Fragment key={`${section.source_file_id ?? "section"}-${section.section}-${sectionIndex}`}>
                  <tr
                    onClick={() => toggleSectionExpand(sectionIndex)}
                    className={`border-b border-white/[0.03] transition-colors ${
                      isEditMode ? "cursor-pointer hover:bg-white/[0.03]" : "hover:bg-white/[0.02]"
                    } ${isExpanded ? "bg-white/[0.02]" : ""}`}
                  >
                    <td className="text-[12px] text-slate-400 px-4 py-3">{sectionIndex + 1}</td>
                    <td className="text-[12px] text-white font-medium px-4 py-3">
                      <div>{section.section}</div>
                      {hasMultiplePackFiles && section.source_file_title ? (
                        <div className="mt-0.5 truncate text-[10px] font-normal text-slate-600">
                          {section.source_file_title}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-[12px] text-slate-400 px-4 py-3">{sectionQuestions.length}</td>
                    {isEditMode && (
                      <td className="px-2 py-3 text-slate-500">
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-white/[0.04] bg-white/[0.01]">
                      <td colSpan={columnCount} className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Section details
                          </p>
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="mb-1 block text-[10px] font-medium text-slate-500">
                                Section name
                              </label>
                              <input
                                value={sectionEditBuffer.name}
                                onChange={(e) =>
                                  setSectionEditBuffer((current) => ({ ...current, name: e.target.value }))
                                }
                                disabled={isUpdatingSection}
                                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white outline-none focus:border-indigo-400/50 disabled:opacity-60"
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelSectionMeta}
                              disabled={isUpdatingSection}
                              className="rounded-md border border-white/[0.08] px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/[0.04] disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void commitSectionMeta(sectionIndex)}
                              disabled={isUpdatingSection}
                              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isUpdatingSection ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                "Update section"
                              )}
                            </button>
                          </div>
                        </div>

                        <ApiSectionQuestionsRows
                          sectionIndex={sectionIndex}
                          questions={sectionQuestions}
                          editingQuestionKey={editingQuestionKey}
                          editBuffer={editBuffer}
                          isSavingQuestion={isSavingQuestion}
                          onStartEdit={(question) => startQuestionEdit(sectionIndex, question)}
                          onCancelEdit={exitQuestionEdit}
                          onCommitEdit={(questionId) => void commitQuestionEdit(sectionIndex, questionId)}
                          onEditBufferChange={setEditBuffer}
                          onDeleteQuestion={(questionId) =>
                            void deleteQuestionFromSection(sectionIndex, questionId)
                          }
                          onAddQuestion={() => addQuestionToSection(sectionIndex)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {isGeneratingSections && apiSections.length > 0 && (
              <GeneratingSectionsLoaderRow colSpan={isEditMode ? 4 : 3} />
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          type="button"
          onClick={() => setParsedView("add")}
          disabled={!canUseParsedActions}
          className={`px-3 py-2 rounded-lg text-[12px] border transition-all flex items-center gap-1.5 ${
            canUseParsedActions
              ? "text-slate-400 border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-200"
              : "cursor-not-allowed border-white/[0.04] text-slate-600 opacity-60"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Add missing section
        </button>
        <button
          type="button"
          onClick={toggleEditMode}
          disabled={!canUseParsedActions}
          className={`px-3 py-2 rounded-lg text-[12px] border transition-all flex items-center gap-1.5 ${
            !canUseParsedActions
              ? "cursor-not-allowed border-white/[0.04] text-slate-600 opacity-60"
              : isEditMode
              ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/20"
              : "text-slate-400 border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-200"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          {isEditMode ? "Done editing" : "Edit sections"}
        </button>
      </div>
    </div>
  );
}

function SectionDraftForm({
  draft,
  onChange,
  showSectionMeta = true,
}: {
  draft: SectionDraft;
  onChange: (draft: SectionDraft) => void;
  showSectionMeta?: boolean;
}) {
  const updateQuestion = (index: number, field: "text" | "wordLimit", value: string) => {
    const questions = draft.questions.map((q, i) => (i === index ? { ...q, [field]: value } : q));
    onChange({ ...draft, questions });
  };

  const addQuestion = () => {
    onChange({
      ...draft,
      questions: [...draft.questions, { text: "", wordLimit: "No limit" }],
    });
  };

  const removeQuestion = (index: number) => {
    if (draft.questions.length <= 1) return;
    onChange({ ...draft, questions: draft.questions.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-5">
      {showSectionMeta && (
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-slate-400">Section name</label>
          <input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="e.g., Environmental Sustainability"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-indigo-400/50"
          />
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-400">Questions</label>
        <button
            type="button"
            onClick={addQuestion}
            className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add question
          </button>
        </div>

        <div className="space-y-3">
          {draft.questions.map((question, index) => (
            <div
              key={question.id ?? `new-q-${index}`}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Question {index + 1}
                </span>
                {draft.questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <textarea
                value={question.text}
                onChange={(e) => updateQuestion(index, "text", e.target.value)}
                placeholder="Enter the question text from the RFP..."
                rows={2}
                className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white placeholder:text-slate-600 outline-none focus:border-indigo-400/50"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ParsedAddSectionPanel({
  fileId,
  agentId,
  onBack,
  onSaved,
}: {
  fileId: string;
  agentId: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const dispatch = useAppDispatch();
  const [draft, setDraft] = useState<SectionDraft>({
    name: "",
    page: "1",
    questions: [{ text: "", wordLimit: "No limit" }],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    const sectionName = draft.name.trim();
    if (!sectionName) {
      toast.error("Section name is required.");
      return;
    }

    const pageNumber = 1;

    const validQuestions = draft.questions
      .map((question) => ({
        text: question.text.trim(),
      }))
      .filter((question) => question.text.length > 0);

    if (validQuestions.length === 0) {
      toast.error("Add at least one question.");
      return;
    }

    if (!agentId.trim()) {
      toast.error("Agent ID is missing for this RFP.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addRfpSection({
        agentId,
        fileId,
        section: sectionName,
        pageNumber,
        questions: validQuestions.map((question, index) => ({
          id: index + 1,
          question: question.text,
        })),
      });
      await dispatch(fetchIdgRfpFileById({ fileId }));
      toast.success("Section added.");
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add section.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="mb-4 flex items-center gap-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to parsed sections
      </button>

      <div className="mb-6">
        <h3 className="text-[16px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Add missing section
        </h3>
        <p className="mt-1 text-[12px] text-slate-500">
          Manually add a section that was not detected during parsing.
        </p>
      </div>

      <div
        className="rounded-xl border border-white/[0.06] p-5"
        style={{ background: "rgba(255,255,255,0.015)" }}
      >
        <SectionDraftForm draft={draft} onChange={setDraft} />
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded-lg border border-white/[0.08] px-4 py-2 text-[12px] font-medium text-slate-300 hover:bg-white/[0.04] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-indigo-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Adding section...
            </>
          ) : (
            "Add section"
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ASSIGNED STAGE — Sections assigned to human owners
// ═══════════════════════════════════════════════════════════════

function formatDueDateLabel(dueDate?: string): string {
  const effectiveDueDate = getEffectiveDueDate(dueDate);
  const date = parse(effectiveDueDate, "yyyy-MM-dd", new Date());
  if (Number.isNaN(date.getTime())) return "Set date";
  return format(date, "d MMM");
}

function getUserChipClass(name: string): string {
  if (name === "Lisa" || name === "Sarah" || name === "James") {
    return "bg-amber-500/15 border-amber-500/25 text-amber-200";
  }
  return "bg-indigo-500/15 border-indigo-500/25 text-indigo-200";
}

function ReviewerAssigneeCell({
  reviewer,
  onAssign,
  onUnassign,
  disabled = false,
  availableUsers = AVAILABLE_USERS,
  isLoadingUsers = false,
  isUnassigning = false,
}: {
  reviewer: string;
  onAssign: (name: string) => void;
  onUnassign: () => void;
  disabled?: boolean;
  availableUsers?: AssignableUser[];
  isLoadingUsers?: boolean;
  isUnassigning?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isAssigned = Boolean(reviewer && reviewer !== "Unassigned");
  const assignedUser = availableUsers.find((user) => user.name === reviewer || user.id === reviewer);

  if (isLoadingUsers || isUnassigning) {
    return (
      <span className="inline-flex items-center justify-center rounded-md border border-dashed border-white/15 px-2.5 py-1.5">
        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
      </span>
    );
  }

  if (availableUsers.length === 0) {
    if (isAssigned) {
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${getUserChipClass(reviewer)}`}
        >
          {assignedUser?.name ?? reviewer}
        </span>
      );
    }

    return <span className="text-[11px] text-slate-500">No team members</span>;
  }

  if (disabled) {
    if (!isAssigned) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-white/15 px-2.5 py-1.5 text-[11px] text-slate-500">
          <Users className="w-3 h-3" />
          Assign
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${getUserChipClass(reviewer)}`}
      >
        {assignedUser?.name ?? reviewer}
      </span>
    );
  }

  const userList = (
    <div className="py-1">
      {availableUsers.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => {
            onAssign(user.name);
            setOpen(false);
          }}
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[12px] text-slate-200 hover:bg-white/[0.06] transition-colors"
        >
          <span className="font-medium">{user.name}</span>
        </button>
      ))}
    </div>
  );

  if (!isAssigned) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-white/15 px-2.5 py-1.5 text-[11px] text-slate-400 hover:border-white/25 hover:bg-white/[0.04] hover:text-slate-200 transition-colors"
          >
            <Users className="w-3 h-3" />
            Assign
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-52 p-0 bg-[#0D1B2A] border-white/10 text-white"
        >
          {userList}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${getUserChipClass(reviewer)}`}
      >
        <span>{assignedUser?.name ?? reviewer}</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onUnassign();
          }}
          className="rounded p-0.5 text-current/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label={`Remove ${reviewer}`}
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    </div>
  );
}

function DueDateCell({
  dueDate,
  onChange,
  disabled = false,
  isLoading = false,
}: {
  dueDate?: string;
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const effectiveDueDate = getEffectiveDueDate(dueDate);
  const selectedDate = parse(effectiveDueDate, "yyyy-MM-dd", new Date());
  const minSelectableDate = startOfToday();

  if (isLoading) {
    return (
      <span className="inline-flex items-center justify-center rounded-md border border-dashed border-white/15 px-2.5 py-1.5">
        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
      </span>
    );
  }

  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-300">
        <CalendarIcon className="w-3 h-3 text-slate-500" />
        {formatDueDateLabel(effectiveDueDate)}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-white/15 hover:bg-white/[0.05] hover:text-white transition-colors"
        >
          <CalendarIcon className="w-3 h-3 text-slate-500" />
          {formatDueDateLabel(effectiveDueDate)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0 bg-[#0D1B2A] border-white/10 text-white"
      >
        <Calendar
          mode="single"
          required
          selected={selectedDate}
          defaultMonth={selectedDate}
          disabled={{ before: minSelectableDate }}
          onSelect={(date) => {
            setOpen(false);
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
          }}
          initialFocus
          className="rounded-md border-0 text-white [&_button]:text-white [&_button:disabled]:text-slate-600 [&_button:disabled]:opacity-40 [&_[data-selected-single=true]]:rounded-md [&_[data-selected-single=true]]:bg-indigo-500 [&_[data-selected-single=true]]:text-white [&_[data-selected-single=true]]:hover:bg-indigo-500 [&_[data-selected-single=true]]:hover:text-white"
          classNames={{
            today: "",
            outside: "text-white",
            disabled: "opacity-40",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function createAssignedSectionBase(index: number, sectionName: string): Section {
  const mock = MOCK_SECTIONS[index];
  return {
    id: mock?.id ?? index + 1,
    name: sectionName || mock?.name || "",
    page: mock?.page ?? 1,
    weighting: mock?.weighting ?? "—",
    reviewer: "Unassigned",
    dueDate: getTodayIsoDate(),
    status: mock?.status ?? "not_generated",
    questions: mock?.questions ?? [],
  };
}

function patchAssignedSectionAt(
  sections: Section[],
  index: number,
  sectionName: string,
  patch: Partial<Pick<Section, "reviewer" | "dueDate" | "assigneeUserId" | "dueDateEdited">>
): Section[] {
  const next = [...sections];
  const existing = next[index] ?? createAssignedSectionBase(index, sectionName);
  next[index] = { ...existing, ...patch };
  if (patch.reviewer === "Unassigned") {
    next[index] = { ...next[index], assigneeUserId: undefined };
  }
  return next;
}

function AssignedStage({
  fileId,
  sections,
  onSectionsChange,
  assignmentsDisabled = false,
  onTeamMembersLoaded,
  onUnassigningChange,
}: {
  fileId: string;
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
  assignmentsDisabled?: boolean;
  onTeamMembersLoaded?: (members: AssignableUser[]) => void;
  onUnassigningChange?: (isUnassigning: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const fileByIdEntry = useAppSelector((state) => state.idgRfp.fileById[fileId]);
  const assignmentsBySectionId = useAppSelector((state) => state.questionAssignments.assignmentsBySectionId);
  const teamMemberItems = useAppSelector((state) => state.team.members);
  const isTeamMembersLoading = useAppSelector((state) => state.team.loading && !state.team.loaded);
  const teamMembers = useMemo(
    () => mapTeamMembersToAssignable(teamMemberItems),
    [teamMemberItems]
  );
  const showAssignColumnLoader = isTeamMembersLoading;
  const resolvedPackId = fileByIdEntry?.file?.pack_id?.trim() || "";
  const rfpFile = useAppSelector((state) => selectRfpPackFile(state, resolvedPackId, fileId));
  const apiSections = useMemo(() => getRfpSectionsFromFile(rfpFile), [rfpFile]);
  const initializedForFileRef = useRef<string | null>(null);
  const [unassigningSectionIndices, setUnassigningSectionIndices] = useState<Set<number>>(
    () => new Set()
  );

  useEffect(() => {
    onUnassigningChange?.(unassigningSectionIndices.size > 0);
  }, [onUnassigningChange, unassigningSectionIndices]);

  useEffect(() => {
    onTeamMembersLoaded?.(teamMembers);
  }, [onTeamMembersLoaded, teamMembers]);

  useEffect(() => {
    if (apiSections.length === 0) return;
    if (initializedForFileRef.current === fileId) return;

    initializedForFileRef.current = fileId;
    onSectionsChange(
      apiSections.map((apiSection, index) => createAssignedSectionBase(index, apiSection.section))
    );
  }, [apiSections, fileId, onSectionsChange]);

  return (
    <div>
      <div className="rounded-xl border border-amber-500/20 p-4 mb-6" style={{ background: "rgba(245,158,11,0.04)" }}>
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <span className="text-[12px] text-amber-200/80 leading-relaxed">
            <strong>How it works:</strong> AI generates a draft for each question within a section. Assign a reviewer and due date for each section before continuing.
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-x-auto" style={{ background: "rgba(255,255,255,0.01)" }}>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">#</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Section</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Questions</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Reviewer</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Due</th>
            </tr>
          </thead>
          <tbody>
            {apiSections.map((section, index) => {
              const localSection = sections[index];
              const apiAssignment = getSectionAssignmentSummary(
                assignmentsBySectionId,
                section.section_id
              );
              const localReviewer = localSection?.reviewer ?? "Unassigned";
              const reviewer =
                localReviewer !== "Unassigned"
                  ? localReviewer
                  : apiAssignment?.assigneeName ?? "Unassigned";
              const dueDate = getEffectiveDueDate(
                localSection?.dueDateEdited
                  ? localSection?.dueDate
                  : localReviewer !== "Unassigned"
                    ? localSection?.dueDate
                    : apiAssignment?.dueDate ?? localSection?.dueDate
              );
              const isSpecialist = ["Lisa", "Sarah", "James"].includes(reviewer);

              return (
                <tr
                  key={`${section.section}-${index}`}
                  className={`border-b border-white/[0.03] transition-colors ${isSpecialist ? "bg-amber-500/[0.03]" : "hover:bg-white/[0.02]"}`}
                >
                  <td className="text-[12px] text-slate-400 px-4 py-3">{index + 1}</td>
                  <td className={`text-[12px] px-4 py-3 ${isSpecialist ? "text-white font-semibold" : "text-white font-medium"}`}>
                    {section.section}
                  </td>
                  <td className="text-[12px] text-slate-400 px-4 py-3">{section.questions?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <ReviewerAssigneeCell
                      reviewer={reviewer}
                      availableUsers={teamMembers}
                      isLoadingUsers={showAssignColumnLoader}
                      isUnassigning={unassigningSectionIndices.has(index)}
                      disabled={assignmentsDisabled}
                      onAssign={(name) => {
                        const assignee = teamMembers.find((member) => member.name === name);
                        onSectionsChange(
                          patchAssignedSectionAt(sections, index, section.section, {
                            reviewer: name,
                            assigneeUserId: assignee?.userId,
                          })
                        );
                      }}
                      onUnassign={() => {
                        if (localReviewer !== "Unassigned") {
                          onSectionsChange(
                            patchAssignedSectionAt(sections, index, section.section, {
                              reviewer: "Unassigned",
                              dueDate: getTodayIsoDate(),
                              dueDateEdited: true,
                            })
                          );
                          return;
                        }

                        const resolvedSectionId =
                          section.section_id != null
                            ? String(section.section_id)
                            : apiAssignment?.sectionId;
                        if (!resolvedSectionId || !apiAssignment) {
                          onSectionsChange(
                            patchAssignedSectionAt(sections, index, section.section, {
                              reviewer: "Unassigned",
                              dueDate: getTodayIsoDate(),
                              dueDateEdited: true,
                            })
                          );
                          return;
                        }

                        setUnassigningSectionIndices((prev) => new Set(prev).add(index));
                        void deleteQuestionAssignmentsBySection(resolvedSectionId)
                          .then(() => {
                            dispatch(removeQuestionAssignmentsBySectionId(resolvedSectionId));
                            onSectionsChange(
                              patchAssignedSectionAt(sections, index, section.section, {
                                reviewer: "Unassigned",
                                dueDate: getTodayIsoDate(),
                                dueDateEdited: true,
                              })
                            );
                          })
                          .catch((error) => {
                            const message =
                              error instanceof Error
                                ? error.message
                                : "Failed to unassign reviewer.";
                            toast.error(message);
                          })
                          .finally(() => {
                            setUnassigningSectionIndices((prev) => {
                              const next = new Set(prev);
                              next.delete(index);
                              return next;
                            });
                          });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DueDateCell
                      dueDate={dueDate}
                      disabled={assignmentsDisabled}
                      isLoading={showAssignColumnLoader || unassigningSectionIndices.has(index)}
                      onChange={(isoDate) => {
                        const currentDueDate = getEffectiveDueDate(dueDate);
                        const nextDueDate = getEffectiveDueDate(isoDate);
                        if (nextDueDate === currentDueDate) return;

                        onSectionsChange(
                          patchAssignedSectionAt(sections, index, section.section, {
                            dueDate: isoDate,
                            dueDateEdited: true,
                          })
                        );
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DRAFTING STAGE — Questions listed, no answers yet
// ═══════════════════════════════════════════════════════════════

function DraftingStage({
  fileId,
  isLoading,
  selectedForGeneration,
  onToggleSection,
  onToggleAll,
}: {
  fileId: string;
  isLoading: boolean;
  selectedForGeneration: Set<number>;
  onToggleSection: (id: number) => void;
  onToggleAll: () => void;
}) {
  const fileByIdEntry = useAppSelector((state) => state.idgRfp.fileById[fileId]);
  const assignmentsBySectionId = useAppSelector((state) => state.questionAssignments.assignmentsBySectionId);
  const resolvedPackId = fileByIdEntry?.file?.pack_id?.trim() || "";
  const rfpFile = useAppSelector((state) => selectRfpPackFile(state, resolvedPackId, fileId));
  const apiSections = useMemo(() => getRfpSectionsFromFile(rfpFile), [rfpFile]);
  const allSelected = apiSections.length > 0 && selectedForGeneration.size === apiSections.length;
  const totalQuestions = apiSections.reduce((sum, section) => sum + (section.questions?.length ?? 0), 0);
  const generatedAnswers = countGeneratedAnswers(apiSections);

  if (isLoading && apiSections.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
            className="h-3.5 w-3.5 rounded border-slate-600 bg-transparent accent-indigo-500"
            />
          <span className="text-[11px] font-medium text-slate-400">Select All</span>
          </label>
        <span className="text-[11px] text-slate-500">
          {selectedForGeneration.size} section{selectedForGeneration.size === 1 ? "" : "s"} selected
        </span>
      </div>

      <div className="rounded-xl border border-white/[0.06] overflow-x-auto" style={{ background: "rgba(255,255,255,0.01)" }}>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="w-10 px-4 py-3"></th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">#</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Section / Questions</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Reviewer</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Answer</th>
            </tr>
          </thead>
          <tbody>
            {apiSections.map((section, index) => {
              const rowId = index + 1;
              const apiAssignment = getSectionAssignmentSummary(
                assignmentsBySectionId,
                section.section_id
              );
              const reviewer = apiAssignment?.assigneeName ?? "Not assigned";
              const answerStatus = getSectionAnswerStatus(section.questions);

              return (
                <tr
                  key={`${section.section}-${index}`}
                  className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                      <input
                        type="checkbox"
                      checked={selectedForGeneration.has(rowId)}
                      onChange={() => onToggleSection(rowId)}
                        className="w-3.5 h-3.5 rounded border-slate-600 bg-transparent accent-indigo-500"
                      />
                  </td>
                  <td className="text-[12px] text-slate-400 px-4 py-3">{rowId}</td>
                  <td className="px-4 py-3">
                    <div className="text-[12px] text-white font-medium">{section.section}</div>
                    <div className="text-[10px] text-slate-600 mt-1">
                      {section.questions?.length ?? 0} question{(section.questions?.length ?? 0) === 1 ? "" : "s"}
                      {/* · {getSectionWordLimit(s)} words */}
                    </div>
                  </td>
                  <td className="text-[12px] text-slate-400 px-4 py-3">
                    {reviewer === "Not assigned" ? (
                      <span className="text-slate-600 italic text-[11px]">Not assigned</span>
                    ) : (
                      reviewer
                    )}
                  </td>
                  <td className="text-[12px] px-4 py-3">
                    {answerStatus === "Generated" ? (
                      <span className="text-emerald-400/80 text-[11px]">Generated</span>
                    ) : (
                      <span className="text-slate-600 italic text-[11px]">Not generated</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 text-[11px] text-slate-500">
        <span>
          <strong className="text-white">{selectedForGeneration.size} sections selected</strong> · {generatedAnswers} of{" "}
          {totalQuestions} answers generated · 0 reviewed + locked
        </span>
        <span className="text-slate-600">Pricing excluded (manual spreadsheet)</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REVIEW STAGE — Answers generated, click into each to edit
// ═══════════════════════════════════════════════════════════════

function ReviewStage({
  fileId,
  rfpName,
  onOpenSection,
  onLockAllAnswers,
}: {
  fileId: string;
  rfpName: string;
  onOpenSection: (sectionIndex: number) => void;
  onLockAllAnswers: () => void;
}) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const fileByIdEntry = useAppSelector((state) => state.idgRfp.fileById[fileId]);
  const assignmentsBySectionId = useAppSelector((state) => state.questionAssignments.assignmentsBySectionId);
  const resolvedPackId = fileByIdEntry?.file?.pack_id?.trim() || "";
  const rfpFile = useAppSelector((state) => selectRfpPackFile(state, resolvedPackId, fileId));
  const isLoading = Boolean(fileByIdEntry?.loading);
  const apiSections = useMemo(() => getRfpSectionsFromFile(rfpFile), [rfpFile]);
  const totalQuestions = apiSections.reduce(
    (sum, section) => sum + (section.questions?.length ?? 0),
    0
  );
  const generatedAnswers = countGeneratedAnswers(apiSections);
  const lockedQuestions = countLockedUserAnswers(apiSections);
  const allQuestionsLocked = totalQuestions > 0 && lockedQuestions >= totalQuestions;

  if (isLoading && apiSections.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] px-6 py-16 text-[12px] text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        Loading review data...
      </div>
    );
  }

  if (apiSections.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] px-6 py-16 text-center text-[12px] text-slate-500">
        No sections found for this RFP yet.
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-white/[0.06] overflow-x-auto" style={{ background: "rgba(255,255,255,0.01)" }}>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">#</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Section</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Questions</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3">Reviewer</th>
              <th className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {apiSections.map((section, index) => {
              const rowId = index + 1;
              const apiAssignment = getSectionAssignmentSummary(
                assignmentsBySectionId,
                section.section_id
              );
              const reviewer = apiAssignment?.assigneeName ?? "Not assigned";
              const questions = section.questions ?? [];
              const questionTotal = questions.length;
              const reviewedCount = questions.filter(isQuestionAnswerLocked).length;
              const isLocked = questionTotal > 0 && reviewedCount >= questionTotal;
              const isWaitingForAi = !isLocked && !isSectionReadyForReviewEdit(questions);
              const generatedInSection = countGeneratedAnswersInSection(questions);

              return (
                <tr
                  key={`${section.section}-${index}`}
                  className={`border-b border-white/[0.03] transition-colors ${
                    isLocked ? "bg-emerald-500/[0.03]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="text-[12px] text-slate-400 px-4 py-3">{rowId}</td>
                  <td className="text-[12px] text-white font-medium px-4 py-3">
                    <div className="flex items-center gap-2">
                      {section.section}
                      {isLocked && <Lock className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </td>
                  <td className="text-[12px] text-slate-400 px-4 py-3">
                    {reviewedCount}/{questionTotal}
                  </td>
                  <td className="text-[12px] text-slate-400 px-4 py-3">
                    {reviewer === "Not assigned" ? (
                      <span className="text-slate-600 italic text-[11px]">Not assigned</span>
                    ) : (
                      reviewer
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isLocked ? (
                      <button
                        type="button"
                        onClick={() => onOpenSection(index)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 border border-white/[0.06] px-2.5 py-1 rounded transition-all"
                      >
                        View
                      </button>
                    ) : isWaitingForAi ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1 rounded-md bg-indigo-500/40 px-3 py-1.5 text-[10px] font-semibold text-white/70 cursor-not-allowed"
                        title="Waiting for AI answers"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenSection(index)}
                        className="text-[10px] text-white font-semibold bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-md transition-all flex items-center gap-1"
                        title={
                          generatedInSection < questionTotal
                            ? `${generatedInSection}/${questionTotal} AI answers ready`
                            : undefined
                        }
                      >
                        Edit <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-500">
        <span>
          <strong className="text-white">{generatedAnswers} answers generated</strong> ·{" "}
          <strong className="text-emerald-400">{lockedQuestions} of {totalQuestions}</strong> reviewed + locked
        </span>

        <div className="flex items-center gap-2">
          {/* LOCK_ANSWER_BTN */}
          {/* {!allQuestionsLocked && (
            <button
              type="button"
              onClick={onLockAllAnswers}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <Lock className="h-3.5 w-3.5" />
              Lock all answers
            </button>
          )} */}

          {allQuestionsLocked && (
          <Popover open={downloadOpen} onOpenChange={setDownloadOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-400"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-52 border-white/10 bg-[#0D1B2A] p-2 text-white"
            >
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Choose format
              </p>
              <button
                type="button"
                onClick={() => {
                  downloadResponseDocument(rfpName, "docx");
                  setDownloadOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[12px] text-slate-200 transition-colors hover:bg-white/[0.06]"
              >
                <FileText className="h-4 w-4 text-indigo-400" />
                Download as DOCX
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadResponseDocument(rfpName, "pdf");
                  setDownloadOpen(false);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[12px] text-slate-200 transition-colors hover:bg-white/[0.06]"
              >
                <FileText className="h-4 w-4 text-red-400" />
                Download as PDF
              </button>
            </PopoverContent>
          </Popover>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION EDITOR — Shows ALL questions in a section
// ═══════════════════════════════════════════════════════════════

function SectionEditor({
  fileId,
  sectionIndex,
  reviewer,
  onBack,
  onLockAll,
  totalSections,
  onNext,
  onPrev,
}: {
  fileId: string;
  sectionIndex: number;
  reviewer: string;
  onBack: () => void;
  onLockAll: () => void;
  totalSections: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  const fileByIdEntry = useAppSelector((state) => state.idgRfp.fileById[fileId]);
  const resolvedPackId = fileByIdEntry?.file?.pack_id?.trim() || "";
  const rfpFile = useAppSelector((state) => selectRfpPackFile(state, resolvedPackId, fileId));
  const isLoading = Boolean(fileByIdEntry?.loading);
  const apiSections = useMemo(() => getRfpSectionsFromFile(rfpFile), [rfpFile]);
  const apiSection = apiSections[sectionIndex];
  const questions = apiSection?.questions ?? [];
  const questionLockSignature = questions
    .map((question) => `${question.question_id}:${question.answer_by_user?.trim() ? "1" : "0"}`)
    .join("|");

  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(() =>
    getDefaultExpandedQuestionId(questions)
  );

  useEffect(() => {
    setExpandedQuestionId(getDefaultExpandedQuestionId(questions));
  }, [sectionIndex, fileId, questionLockSignature]);

  const lockedCount = questions.filter(isQuestionAnswerLocked).length;
  const allLocked = questions.length > 0 && lockedCount >= questions.length;
  const sectionNumber = sectionIndex + 1;

  if (isLoading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] px-6 py-16 text-[12px] text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        Loading section...
      </div>
    );
  }

  if (!apiSection) {
    return (
      <div className="rounded-xl border border-white/[0.06] px-6 py-16 text-center text-[12px] text-slate-500">
        Section not found.
        <button type="button" onClick={onBack} className="mt-3 block mx-auto text-indigo-400 hover:text-indigo-300">
          Back to sections
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Back + Section nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to sections
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={sectionIndex <= 0}
            className="p-1.5 rounded border border-white/[0.06] text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
          <span className="text-[11px] text-slate-500">
            Section {sectionNumber} of {totalSections}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={sectionIndex >= totalSections - 1}
            className="p-1.5 rounded border border-white/[0.06] text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[16px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          {apiSection.section}
        </h2>
        {allLocked && (
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-md font-semibold">
            <Lock className="w-3 h-3" />
            ALL LOCKED ✓
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mb-2">
        Reviewer: <strong className="text-slate-300">{reviewer}</strong> · {questions.length} question
        {questions.length === 1 ? "" : "s"}
      </p>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${questions.length > 0 ? (lockedCount / questions.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-500">
          {lockedCount}/{questions.length} locked
        </span>
      </div>

      {/* Questions list */}
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {questions.map((question, idx) => (
          <ApiQuestionCard
            key={`${apiSection.source_file_id ?? fileId}-${question.question_id}`}
            question={question}
            index={idx + 1}
            agentId={rfpFile?.agent_id ?? ""}
            answerFileId={apiSection.source_file_id ?? fileId}
            refreshFileId={fileId}
            packId={rfpFile?.pack_id}
            isExpanded={expandedQuestionId === question.question_id}
            isLocked={isQuestionAnswerLocked(question)}
            onToggle={() =>
              setExpandedQuestionId(
                expandedQuestionId === question.question_id ? null : question.question_id
              )
            }
          />
        ))}
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/[0.06]">
        {/* <button
          type="button"
          onClick={onLockAll}
          disabled={allLocked}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${
            !allLocked
              ? "bg-emerald-500 text-white hover:bg-emerald-400"
              : "bg-white/[0.04] text-slate-600 cursor-not-allowed"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          Lock All Answers
        </button> */}
        <button
          type="button"
          onClick={onNext}
          disabled={sectionIndex >= totalSections - 1}
          className="px-3 py-2.5 rounded-lg text-[12px] text-slate-400 border border-white/[0.06] hover:bg-white/[0.04] transition-all flex items-center gap-1 ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next Section <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUESTION CARD — API question from Redux file-by-id
// ═══════════════════════════════════════════════════════════════

const DUMMY_AI_SOURCES = [
  "IDG Security Corporate Overview 2024",
  "NHS Contract Portfolio",
];

function ApiQuestionCard({
  question,
  index,
  agentId,
  answerFileId,
  refreshFileId,
  packId,
  isExpanded,
  isLocked,
  onToggle,
}: {
  question: IDGRfpSectionQuestion;
  index: number;
  agentId: string;
  answerFileId: string;
  refreshFileId: string;
  packId?: string;
  isExpanded: boolean;
  isLocked: boolean;
  onToggle: () => void;
}) {
  const dispatch = useAppDispatch();
  const aiResponse = question.answer_by_ai?.trim() ?? "";
  const displayAiResponse = stripHumanReviewMarkerFromAiAnswer(aiResponse);
  const needsHumanReview = questionRequiresHumanReview(question);
  const [editorContent, setEditorContent] = useState(question.answer_by_user?.trim() ?? "");
  const [isLockingAi, setIsLockingAi] = useState(false);
  const [isLockingUser, setIsLockingUser] = useState(false);
  const isAnyLocking = isLockingAi || isLockingUser;

  useEffect(() => {
    setEditorContent(question.answer_by_user?.trim() ?? "");
  }, [question.question_id, question.answer_by_user]);

  const handleCopyToEditor = () => {
    setEditorContent(displayAiResponse);
  };

  const lockAnswer = async (answerText: string, target: "ai" | "user") => {
    const trimmedAnswer = answerText.trim();
    if (!trimmedAnswer || isLocked || isAnyLocking) return;

    const setLocking = target === "ai" ? setIsLockingAi : setIsLockingUser;
    setLocking(true);
    try {
      await submitRfpAnswerByUser({
        agentId,
        fileId: answerFileId,
        questionId: question.question_id,
        answerByUser: trimmedAnswer,
      });
      const resolvedPackId = packId?.trim();
      if (resolvedPackId) {
        await dispatch(parseIdgRfpPack({ packId: resolvedPackId, fileId: refreshFileId }));
      } else {
        await dispatch(fetchIdgRfpFileById({ fileId: answerFileId }));
      }
      toast.success("Answer locked.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to lock answer.";
      toast.error(message);
    } finally {
      setLocking(false);
    }
  };

  const handleLockAiAnswer = () => void lockAnswer(displayAiResponse, "ai");
  const handleLockUserAnswer = () => void lockAnswer(editorContent, "user");

  return (
    <div
      className={`rounded-xl border transition-all ${
        isLocked
          ? "border-emerald-500/20 bg-emerald-500/[0.02]"
          : isExpanded
          ? "border-indigo-500/20 bg-indigo-500/[0.02]"
          : "border-white/[0.06] bg-white/[0.01]"
      }`}
    >
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-slate-400">Q{index}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-white font-medium leading-relaxed">{question.question}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {isLocked && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                <Lock className="w-2.5 h-2.5" />
                Locked
              </span>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-white/[0.04]">
          <div className="mb-3 grid grid-cols-1 gap-4 mt-3 lg:grid-cols-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-indigo-400/60">
                AI Suggested Response
              </p>
              {needsHumanReview ? (
                <span className="shrink-0 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                  Human review required
                </span>
              ) : null}
            </div>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              <Edit3 className="h-3 w-3" />
              Your Response
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div
                className="rounded-lg border border-indigo-500/[0.1] p-4"
                style={{ background: "rgba(99,102,241,0.02)" }}
              >
                <div
                  className={`${aiChatAssistantMarkdownClassName} max-h-[250px] overflow-y-auto text-[11px] text-slate-300`}
                >
                  {displayAiResponse ? (
                    <Streamdown>{displayAiResponse}</Streamdown>
                  ) : (
                    <p className="text-slate-600 italic">No AI response generated yet.</p>
                )}
              </div>
              </div>

              {/* {aiResponse && (
                <div className="mt-2">
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold mb-1">
                    Sources
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DUMMY_AI_SOURCES.map((source) => (
                      <span
                        key={source}
                        className="text-[9px] text-slate-500 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )} */}

              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleCopyToEditor}
                  disabled={!aiResponse}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold text-white bg-indigo-500 hover:bg-indigo-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Copy className="w-3 h-3" />
                  Copy to Editor
                </button>
                <button
                  type="button"
                  onClick={handleLockAiAnswer}
                  disabled={!aiResponse || isLocked || isAnyLocking}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                    aiResponse && !isLocked && !isAnyLocking
                      ? "text-white bg-emerald-500 hover:bg-emerald-400"
                      : "text-slate-400 border border-white/[0.06] cursor-not-allowed opacity-40"
                  }`}
                >
                  {isLockingAi ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Lock className="w-3 h-3" />
                  )}
                  {isLockingAi ? "Locking..." : "Lock"}
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              {isLocked && editorContent.trim() ? (
                <div
                  className={`${aiChatAssistantMarkdownClassName} flex-1 min-h-[200px] overflow-y-auto rounded-lg border border-emerald-500/20 bg-emerald-500/[0.02] p-4 text-[11px] text-slate-200`}
                >
                  <Streamdown>{editorContent}</Streamdown>
              </div>
              ) : (
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                placeholder="Copy the AI suggestion across and edit, or write from scratch..."
                className="flex-1 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 text-[11px] text-slate-200 leading-relaxed placeholder:text-slate-700 outline-none resize-none min-h-[200px]"
                disabled={isLocked}
              />
              )}
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => void handleLockUserAnswer()}
                  disabled={!editorContent.trim() || isLocked || isAnyLocking}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                    editorContent.trim() && !isLocked && !isAnyLocking
                      ? "bg-emerald-500 text-white hover:bg-emerald-400"
                      : "bg-white/[0.04] text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {isLockingUser ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                  <Lock className="w-3 h-3" />
                  )}
                  {isLockingUser ? "Locking..." : "Lock Answer"}
                </button>
                {/* <button
                  type="button"
                  className="px-2.5 py-2 rounded-lg text-[11px] text-slate-400 border border-white/[0.06] hover:bg-white/[0.04] transition-all"
                >
                  Save Draft
                </button> */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
