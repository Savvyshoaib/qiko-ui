import { appFetch } from "@/data/appFetch";
import {
  recordRfpAnswerByAiCall,
  shouldSkipRfpAnswerByAiCall,
} from "./rfpAnswerByAiStorage";

const IDG_API_BASE_URL =
  (import.meta.env.VITE_IDG_API_BASE_URL as string | undefined)?.trim() ||
  "https://workers.qiko.ai";
  // "https://widen-cash-animosity.ngrok-free.dev";

function buildIdgApiUrl(path: string): string {
  const base = IDG_API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export const IDG_RFP_NAMESPACE = "knowledge-packs";
export const IDG_RFP_INDEX_NAME = "presale-rfp";
export const IDG_RFP_CHUNK_SIZE = 1200;
export const IDG_RFP_CHUNK_OVERLAP = 200;
export const IDG_KB_NAMESPACE = "knowledge-packs";
export const IDG_KB_INDEX_NAME = "presale-base";

export const RFP_EVALUATE_ASSISTANT_MESSAGE = `You are an RFP Proposal Questionnaire Parser inside Qiko.
Your responsibility is to analyse all uploaded procurement documents and convert them into a structured proposal response framework.
The Qiko proposal workflow is:
Documents → Sections → Questions → Assignment → AI Drafting → Review → Submission
Sections are the primary object. Questions must exist under sections.
Return valid JSON only. Do not return markdown, explanations, notes, summaries, risks, attachment lists, compliance reports, source analysis, or internal reasoning.
STEP 1 — CLASSIFY DOCUMENTS
Classify every uploaded document as one of:

main_rfp
questionnaire
eoi_response_template
tor
sow
declaration_form
pricing_schedule
draft_contract
evaluation_criteria
annex
supporting_document
other
Use classification to decide extraction method:

questionnaire / eoi_response_template: extract every explicit question, sub-question, table row, and checklist item separately
declaration_form: extract every YES/NO, YES/NO/N/A, checkbox, declaration, and signature requirement separately
tor / sow: convert only actionable requirements into proposal questions
pricing_schedule: extract pricing inputs, tables, rates, totals, and cost breakdown fields
draft_contract: extract only bidder confirmations, acknowledgements, evidence requests, and fields requiring completion
evaluation_criteria: extract scoring or compliance items only if the bidder must answer, evidence, or respond to them
annex / supporting_document: extract only items that clearly require a bidder response or provide evidence requirements
STEP 2 — IDENTIFY SECTIONS
Before extracting questions, identify the section structure across the uploaded documents.
Section names should come from:

explicit section headings
numbered chapters
annex names
questionnaire groupings
declaration categories
evaluation categories
proposal structure implied by the documents
Preserve original section names wherever possible.
Do not invent sections if no supporting structure exists.
If multiple documents contribute to the same proposal area, merge them into the same section while preserving source attribution at question level.
STEP 3 — EXTRACT QUESTIONS UNDER EACH SECTION
Extract every response item under the correct section.
Rules:

Extract every explicit question individually.
Never merge multiple explicit questions into one.
Never summarise multiple questions.
Never group an entire questionnaire into a single item.
If a question has sub-parts, rows, bullets, criteria, or YES/NO options, extract each sub-part as its own question.
If an EOI or questionnaire contains numbered questions, sub-questions, or table rows, return every item separately.
Preserve numbering where available.
Preserve intent exactly as written.
Prioritise explicit questions before inferred questions.
Always extract:

numbered questions
sub-questions
table rows
checklist items
YES/NO declarations
checkbox confirmations
“please provide”
“describe”
“confirm”
“submit evidence”
“complete the following”
Only create inferred questions from TOR/SOW/general requirements when no explicit question exists.
STEP 4 — DETERMINE ANSWER TYPE
For every question, determine the expected answer type.
Allowed values:

yes_no
narrative
evidence_upload
pricing_input
table_completion
signature
date
confirmation
unknown
Examples:

YES/NO declaration = yes_no
certificate/licence/attachment request = evidence_upload
pricing table/rates/cost breakdown = pricing_input
signature block = signature
methodology/approach question = narrative
bidder acknowledgement = confirmation
STEP 5 — PRESERVE DECLARATION AND YES/NO LOGIC
If a document contains YES/NO, YES/NO/N/A, declaration tables, checkbox confirmations, or compliance confirmations, keep each item as an individual yes_no question.
Do not convert yes/no declarations into narrative questions.
Correct:
{
"question": "Is the bidder bankrupt or subject to insolvency proceedings? (Source: Declaration on Honour.pdf)",
"answer_type": "yes_no",
"source_document": "Declaration on Honour.pdf"
}
Incorrect:
{
"question": "Describe your bankruptcy status.",
"answer_type": "narrative"
}
STEP 6 — SOURCE ATTRIBUTION
Every question must contain its source document.
Append the source to the end of the question.
Example:
"Describe your mobilisation strategy for Afghanistan. (Source: Technical Proposal Questionnaire.docx)"
Also populate source_document with the same document name.
STEP 7 — METADATA EXTRACTION
Extract if available:

country
client
category
service_type
requirements
mandatory_criteria
word_limits
deadline
evidence_needed
tags
Only populate fields that are supported by the uploaded documents. Do not invent values.
JSON FORMAT
{
"country": "",
"category": "",
"client": "",
"service_type": [],
"requirements": [],
"mandatory_criteria": [],
"word_limits": "",
"deadline": "",
"evidence_needed": [],
"tags": [],
"document_classification": [
{
"document_name": "",
"document_type": ""
}
],
"sections": [
{
"section": "",
"questions": [
{
"question": "",
"answer_type": "",
"source_document": ""
}
]
}
]
}
If no documents are available, return:
{
"sections": []
}`;

export const RFP_ANSWER_BY_AI_PROMPT = `You are the IDG RFP Response Generator.
Your task is to generate a single tender response for one RFP question using only the supplied IDG evidence and historical response material.
This is a drafting task only.
OUTPUT RULE
Return only the final answer text.
Do not output:

headings
labels
confidence scores
source references
notes
explanations
metadata
comments
reasoning
review guidance
The output must be directly pasteable into the RFP submission.

PRIMARY WRITING PRINCIPLE
IDG responses are compliance statements, not marketing content.
Only answer the question asked.
Do not answer adjacent questions.
Do not volunteer additional capability information.
Do not expand beyond the evidence.

SOURCE PRIORITY
Use evidence strictly in this order:

Same client historical response.
Same country and service type response.
Same buyer type response.
Approved IDG response library.
Approved supporting evidence.
General IDG knowledge base.
If a historical response exists:

preserve its structure
preserve its wording style
preserve its level of detail
preserve its terminology
Do not rewrite strong historical language into generic AI wording.

HARD EVIDENCE RULE
Every factual statement must exist in supplied evidence.
Never invent:

clients
projects
locations
dates
licences
certifications
personnel
values
contract sizes
staffing numbers
insurance limits
timelines
KPIs
mobilisation periods
response times
equipment
offices
countries
If evidence does not exist:
Return an empty response.
Do not guess.
Do not infer.
Do not approximate.
Do not write placeholder wording.

RESPONSE LENGTH RULE
Binary compliance question
Examples:

Do you hold a licence?
Are you registered?
Can you comply?
Return:
1-2 sentences maximum.
No explanation unless requested.

Confirmation question
Examples:

Confirm compliance with...
Confirm ability to...
Return:
1 short paragraph.

Methodology question
Examples:

Describe.
Explain.
Outline.
Demonstrate.
Return:
2-4 paragraphs.
Structure:

Confirmation.
Delivery approach.
Governance.
Supporting controls.



Experience question
Structure:

Relevant experience.
Similar clients.
Similar environments.
Similar services.



Policy question
Structure:

Policy existence.
Policy purpose.
Governance owner.
Operational application.



IDG WRITING STYLE
Use:

IDG confirms
IDG provides
IDG maintains
IDG operates
IDG will
IDG ensures
IDG applies
Avoid:

We believe
We aim
We strive
We seek
We endeavour



LANGUAGE STYLE
Write using:

formal procurement language
operational language
declarative language
evidence-based language
Avoid:

marketing language
consultancy language
AI language
conversational language
promotional language



NEVER USE

industry leading
world class
cutting edge
innovative
best in class
market leading
state of the art
unparalleled
comprehensive solution
trusted partner
value proposition
Unless these exact phrases exist in historical responses.

IDG RESPONSE DNA
Every answer should feel as though:

the service already exists
the process already exists
the controls already exist
the evidence already exists
The answer should read as documentation of an existing operating model rather than a promise of future delivery.

FINAL VALIDATION
Before returning the answer verify:

only the requested question was answered
every factual claim exists in evidence
unnecessary detail has been removed
historical wording has been preserved
no unsupported claims remain
no metadata exists
output is ready for direct insertion into the submission
Return only the final answer text.`;

export interface IDGRfpUploadRequest {
  agentId: string;
  title: string;
  documentContext?: string;
  file: File;
  packId?: string;
}


export interface IDGRfpUploadRecord {
  file_id: string;
  pack_id?: string;
  agent_id?: string;
  filename?: string;
  description?: string | null;
  is_evaluated?: number;
  is_ai_answered?: number;
  namespace?: string;
  pinecone_index?: string;
  [key: string]: unknown;
}

export interface IDGRfpUploadData {
  file_id?: string;
  pack_id?: string;
  source?: string;
  filename?: string;
  description?: string | null;
  is_evaluated?: number;
  is_ai_answered?: number;
  uploads?: IDGRfpUploadRecord[];
  uploaded_count?: number;
  failed_count?: number;
  files?: IDGRfpFile[];
  file_ids?: string[];
  file?: IDGRfpFile;
  [key: string]: unknown;
}

export interface IDGRfpUploadResponse {
  success?: boolean;
  id?: string;
  title?: string;
  message?: string;
  status?: string;
  file_name?: string;
  file_id?: string;
  files?: IDGRfpFile[];
  data?: IDGRfpUploadData;
  errors?: unknown[];
  [key: string]: unknown;
}

export interface IDGRfpEvaluateFileData {
  file_id?: string;
  filtered_sections?: Array<{ section?: string; questions?: string[] }>;
  [key: string]: unknown;
}

export interface IDGRfpEvaluateFileResponse {
  success?: boolean;
  message?: string;
  data?: IDGRfpEvaluateFileData;
  [key: string]: unknown;
}

export interface IDGRfpAnswerByAiResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface IDGRfpSectionQuestion {
  question_id: string;
  question: string;
  answer_by_ai?: string;
  answer_by_user?: string;
  answer_by_ai_score?: string;
  answer_by_ai_score_value?: number;
  answer_by_ai_score_label?: string;
  word_limit?: number;
}

export interface IDGRfpSection {
  section_id?: string | number;
  section: string;
  page_number?: number;
  questions: IDGRfpSectionQuestion[];
  source_file_id?: string;
  source_file_title?: string;
  source_section_index?: number;
}

export interface IDGRfpFile {
  file_id: string;
  pack_id: string;
  agent_id: string;
  title: string;
  description?: string | null;
  category: string | null;
  category_description?: string | null;
  country: string | null;
  is_evaluated: number;
  is_ai_answered?: number;
  is_evaluated_status?: string;
  is_ai_answered_status?: string;
  ocr_ingest_status?: string;
  is_ocr?: boolean;
  retryable?: boolean;
  retry_requires_reupload?: boolean;
  retry_drop_path?: string;
  status?: string;
  text?: string;
  sections_json?: string | IDGRfpSection[];
  sections?: IDGRfpSection[];
  chunk_count?: number;
  section_counts?: number;
  pack_files?: IDGRfpFile[];
  updated_at?: string;
}

export interface IDGRfpPackMetadata {
  pack_id: string;
  agent_id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  category_description?: string | null;
  country?: string | null;
  client?: string | null;
  deadline?: string | null;
  is_evaluated?: number;
  is_ai_answered?: number;
}

export interface IDGRfpPackByIdData {
  index_name: string;
  namespace: string;
  pack_id: string;
  agent_id: string;
  file_ids: string[];
  total_files: number;
  pack_metadata?: IDGRfpPackMetadata;
  files: IDGRfpFile[];
}

export interface IDGRfpFilesData {
  index_name: string;
  namespace: string;
  filters: {
    agent_id: string;
    pack_id: string | null;
  };
  total_files: number;
  files: IDGRfpFile[];
}

export interface IDGRfpFilesResponse {
  success: boolean;
  data: IDGRfpFilesData;
  errors?: unknown[];
  message?: string;
}

export interface IDGRfpDeleteResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface IDGRfpFileByIdResponse {
  success: boolean;
  data: IDGRfpFile;
  errors?: unknown[];
  message?: string;
}

export type IDGRfpListStatus =
  | "in_progress"
  | "new"
  | "parsing"
  | "ocr_parsing"
  | "ocr_failed"
  | "failed"
  | "completed";

export interface IDGRfpListItem {
  id: string;
  packId: string;
  name: string;
  fileName: string;
  category: string;
  categoryDescription: string;
  country: string;
  sections: number;
  complete: number;
  status: IDGRfpListStatus;
  isEvaluated: boolean;
  raw: IDGRfpFile;
}

export interface IDGRfpPackGroup {
  packId: string;
  primaryFileId: string;
  name: string;
  fileCount: number;
  files: IDGRfpListItem[];
  category: string;
  categoryDescription: string;
  country: string;
  sections: number;
  complete: number;
  status: IDGRfpListStatus;
  isEvaluated: boolean;
  primary: IDGRfpListItem;
  /** File to retry when pack status is ocr_failed */
  retryFileId?: string;
}

function normalizeOcrIngestStatus(file: IDGRfpFile): string {
  return file.ocr_ingest_status?.trim().toLowerCase() ?? "";
}

export function isRfpFileOcrProcessing(file: IDGRfpFile): boolean {
  return Boolean(file.is_ocr) && normalizeOcrIngestStatus(file) === "processing";
}

export function isRfpFileOcrRetryable(file: IDGRfpFile): boolean {
  return Boolean(file.is_ocr) && normalizeOcrIngestStatus(file) === "failed" && file.retryable === true;
}

function aggregatePackStatus(items: IDGRfpListItem[]): IDGRfpListStatus {
  const order: IDGRfpListStatus[] = [
    "ocr_failed",
    "ocr_parsing",
    "parsing",
    "failed",
    "in_progress",
    "new",
    "completed",
  ];
  for (const status of order) {
    if (items.some((item) => item.status === status)) return status;
  }
  return "new";
}

export function pickPrimaryRfpListItem(items: IDGRfpListItem[]): IDGRfpListItem {
  if (items.length === 0) {
    throw new Error("Cannot pick primary RFP from an empty pack.");
  }
  if (items.length === 1) return items[0];

  const withDescription = items.find((item) => item.raw.description?.trim());
  if (withDescription) return withDescription;

  const withSections = [...items].sort((a, b) => b.sections - a.sections);
  if (withSections[0].sections > 0) return withSections[0];

  return items[0];
}

export function groupRfpListItemsByPack(items: IDGRfpListItem[]): IDGRfpPackGroup[] {
  const packOrder: string[] = [];
  const byPack = new Map<string, IDGRfpListItem[]>();

  for (const item of items) {
    const packKey = item.packId?.trim() || `file:${item.id}`;
    if (!byPack.has(packKey)) packOrder.push(packKey);
    const group = byPack.get(packKey) ?? [];
    group.push(item);
    byPack.set(packKey, group);
  }

  return packOrder.map((packKey) => {
    const files = byPack.get(packKey) ?? [];
    const primary = pickPrimaryRfpListItem(files);
    const packId = primary.packId?.trim() || primary.id;
    const totalSections = files.reduce((sum, file) => sum + file.sections, 0);
    const totalComplete = files.reduce((sum, file) => sum + file.complete, 0);
    const retryFile = files.find((file) => file.status === "ocr_failed");

    return {
      packId,
      primaryFileId: primary.id,
      name: primary.name,
      fileCount: files.length,
      files,
      category: files.find((file) => file.category)?.category ?? primary.category,
      categoryDescription:
        files.find((file) => file.categoryDescription)?.categoryDescription ?? primary.categoryDescription,
      country: files.find((file) => file.country)?.country ?? primary.country,
      sections: totalSections,
      complete: totalComplete,
      status: aggregatePackStatus(files),
      isEvaluated: files.every((file) => file.isEvaluated),
      primary,
      retryFileId: retryFile?.id,
    };
  });
}

function getApiErrorMessage(
  payload: { message?: string; detail?: string | Array<{ msg?: string }> },
  fallback: string
): string {
  if (payload.message) return payload.message;

  const { detail } = payload;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item?.msg).filter(Boolean);
    if (messages.length > 0) return messages.join(", ");
  }

  return fallback;
}

export function parseRfpSections(sectionsJson?: string | IDGRfpSection[] | null): IDGRfpSection[] {
  if (!sectionsJson) return [];
  if (Array.isArray(sectionsJson)) return sectionsJson;

  const trimmed = sectionsJson.trim();
  if (!trimmed) return [];

  try {
    let parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    return Array.isArray(parsed) ? (parsed as IDGRfpSection[]) : [];
  } catch {
    return [];
  }
}

export function getRfpSectionsFromFile(file?: IDGRfpFile | null): IDGRfpSection[] {
  if (!file) return [];

  const fromSections = parseRfpSections(file.sections);
  if (fromSections.length > 0) return fromSections;

  return parseRfpSections(file.sections_json);
}

export function mapRfpFileToListItem(file: IDGRfpFile): IDGRfpListItem {
  const sections = getRfpSectionsFromFile(file);
  const sectionCount = sections.length || (file.section_counts ?? 0);
  let completeSections = 0;

  for (const section of sections) {
    const questions = section.questions ?? [];
    if (
      questions.length > 0 &&
      questions.every((question) => Boolean(question.answer_by_user?.trim() || question.answer_by_ai?.trim()))
    ) {
      completeSections += 1;
    }
  }

  let status: IDGRfpListStatus = "new";
  if (isRfpFileOcrProcessing(file)) {
    status = "ocr_parsing";
  } else if (isRfpFileOcrRetryable(file)) {
    status = "ocr_failed";
  } else if (file.is_evaluated !== 1) {
    status = "parsing";
  } else if (sectionCount > 0 && completeSections === sectionCount) {
    status = "completed";
  } else if (sectionCount > 0) {
    status = "in_progress";
  }

  return {
    id: file.file_id,
    packId: file.pack_id,
    name: file.title,
    fileName: file.title,
    category: file.category?.trim() ?? "",
    categoryDescription: file.category_description?.trim() ?? "",
    country: file.country?.trim() ?? "",
    sections: sectionCount,
    complete: completeSections,
    status,
    isEvaluated: file.is_evaluated === 1,
    raw: file,
  };
}

export async function uploadRfpFiles({
  agentId,
  title,
  documentContext,
  files,
  packId,
}: {
  agentId: string;
  title: string;
  documentContext?: string;
  files: File[];
  packId?: string;
}): Promise<IDGRfpUploadResponse> {
  const trimmedAgentId = agentId?.trim();
  if (!trimmedAgentId) {
    throw new Error("agent_id is required to upload an RFP document.");
  }

  if (files.length === 0) {
    throw new Error("At least one file is required.");
  }

  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    throw new Error("RFP title is required.");
  }

  const formData = new FormData();
  formData.append("agent_id", trimmedAgentId);
  formData.append("title", trimmedTitle);
  if (documentContext?.trim()) {
    formData.append("description", documentContext.trim());
  }
  const trimmedPackId = packId?.trim();
  if (trimmedPackId) {
    formData.append("pack_id", trimmedPackId);
  }
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/rfp/upload-file"), {
    method: "POST",
    body: formData,
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpUploadResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to upload RFP document."));
  }

  return payload;
}

export async function uploadRfpFile({
  agentId,
  title,
  documentContext,
  file,
  packId,
}: IDGRfpUploadRequest): Promise<IDGRfpUploadResponse> {
  return uploadRfpFiles({
    agentId,
    title,
    documentContext,
    files: [file],
    packId,
  });
}

function stripRfpFileExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "");
}

function extractUploadResponseFileIds(payload: IDGRfpUploadResponse): string[] {
  const ids = new Set<string>();

  const collectId = (value: unknown) => {
    if (typeof value !== "string" || !value.trim()) return;
    ids.add(value.trim());
  };

  const collectFromFile = (file: unknown) => {
    if (!file || typeof file !== "object") return;
    const record = file as Record<string, unknown>;
    collectId(record.file_id);
    collectId(record.id);
  };

  if (payload.data && typeof payload.data === "object") {
    const data = payload.data;
    // Single-file upload returns file_id directly on data (not in data.uploads).
    collectFromFile(data);
    if (Array.isArray(data.uploads)) {
      data.uploads.forEach(collectFromFile);
    }
    if (Array.isArray(data.files)) {
      data.files.forEach(collectFromFile);
    }
    if (Array.isArray(data.file_ids)) {
      data.file_ids.forEach(collectId);
    }
    collectFromFile(data.file);
  }

  if (Array.isArray(payload.files)) {
    payload.files.forEach(collectFromFile);
  }

  collectId(payload.file_id);
  collectId(payload.id);

  return [...ids];
}

export async function evaluateRfpFile({
  agentId,
  fileId,
  message = RFP_EVALUATE_ASSISTANT_MESSAGE,
  model = "openai.gpt-oss-safeguard-120b",
  temperature = 1,
  background = true,
}: {
  agentId: string;
  fileId: string;
  message?: string;
  model?: string;
  temperature?: number;
  background?: boolean;
}): Promise<IDGRfpEvaluateFileResponse> {
  const trimmedAgentId = agentId?.trim();
  const trimmedFileId = fileId?.trim();

  if (!trimmedAgentId) {
    throw new Error("agent_id is required to evaluate an RFP file.");
  }
  if (!trimmedFileId) {
    throw new Error("file_id is required to evaluate an RFP file.");
  }

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/rfp/evaluate-file"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_id: trimmedFileId,
      agent_id: trimmedAgentId,
      namespace: IDG_RFP_NAMESPACE,
      index_name: IDG_RFP_INDEX_NAME,
      message,
      model,
      temperature,
      background,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpEvaluateFileResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to evaluate RFP file."));
  }

  return payload;
}

export interface IDGRfpRetryIngestResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

export async function retryRfpIngest(fileId: string): Promise<IDGRfpRetryIngestResponse> {
  const trimmedFileId = fileId?.trim();
  if (!trimmedFileId) {
    throw new Error("file_id is required to retry RFP ingest.");
  }

  const requestBody = {
    file_id: trimmedFileId,
    namespace: IDG_RFP_NAMESPACE,
    chunk_size: IDG_RFP_CHUNK_SIZE,
    chunk_overlap: IDG_RFP_CHUNK_OVERLAP,
    index_name: IDG_RFP_INDEX_NAME,
    create_index_if_missing: false,
    run_post_upload_pipeline: false,
  };

  const params = new URLSearchParams({
    file_id: trimmedFileId,
    namespace: IDG_RFP_NAMESPACE,
    chunk_size: String(IDG_RFP_CHUNK_SIZE),
    chunk_overlap: String(IDG_RFP_CHUNK_OVERLAP),
    index_name: IDG_RFP_INDEX_NAME,
    create_index_if_missing: "false",
    run_post_upload_pipeline: "false",
  });

  const res = await appFetch(buildIdgApiUrl(`/worker/knowledge/rfp/retry-ingest?${params.toString()}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpRetryIngestResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to retry RFP ingest."));
  }

  return payload;
}

const answerByAiInFlight = new Set<string>();

export function shouldTriggerRfpAnswerByAi(file: IDGRfpFile): boolean {
  if (file.is_evaluated !== 1) return false;
  const sectionCount = file.section_counts ?? 0;
  return sectionCount > 0;
}

function getFileSectionCounts(file: IDGRfpFile): number {
  const count = file.section_counts;
  return typeof count === "number" && count > 0 ? count : 0;
}

export async function answerRfpByAi({
  agentId,
  fileId,
  section = 1,
  question = -1,
  promptMessage = RFP_ANSWER_BY_AI_PROMPT,
  model = "openai.gpt-oss-safeguard-120b",
  temperature = 0,
  topK = 5,
  saveAnswers = true,
  overwriteExisting = false,
  scoreAnswers = true,
  requireReady = true,
  useMatchedKnowledge = false,
  background = true,
}: {
  agentId: string;
  fileId: string;
  section?: number;
  question?: number;
  promptMessage?: string;
  model?: string;
  temperature?: number;
  topK?: number;
  saveAnswers?: boolean;
  overwriteExisting?: boolean;
  scoreAnswers?: boolean;
  requireReady?: boolean;
  useMatchedKnowledge?: boolean;
  background?: boolean;
}): Promise<IDGRfpAnswerByAiResponse> {
  const trimmedAgentId = agentId?.trim();
  const trimmedFileId = fileId?.trim();

  if (!trimmedAgentId) {
    throw new Error("agent_id is required to generate AI answers.");
  }
  if (!trimmedFileId) {
    throw new Error("file_id is required to generate AI answers.");
  }

  if (question === -1 && shouldSkipRfpAnswerByAiCall(trimmedFileId, section)) {
    return {
      success: true,
      message: `Skipped answer-by-ai for section ${section}; called within the last 10 minutes.`,
    };
  }

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/rfp/answer-by-ai"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_id: trimmedFileId,
      agent_id: trimmedAgentId,
      namespace: IDG_RFP_NAMESPACE,
      rfp_index_name: IDG_RFP_INDEX_NAME,
      base_index_name: IDG_KB_INDEX_NAME,
      top_k: topK,
      model,
      temperature,
      save_answers: saveAnswers,
      overwrite_existing: overwriteExisting,
      section,
      question,
      prompt_message: promptMessage,
      score_answers: scoreAnswers,
      require_ready: requireReady,
      use_matched_knowledge: useMatchedKnowledge,
      background,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpAnswerByAiResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(
      getApiErrorMessage(
        payload,
        `Failed to generate AI answers for RFP section ${section}.`
      )
    );
  }

  if (question === -1) {
    recordRfpAnswerByAiCall(trimmedFileId, section);
  }

  return payload;
}

export async function triggerAnswerByAiForEvaluatedFiles(files: IDGRfpFile[]): Promise<void> {
  const pendingFiles = files.filter(shouldTriggerRfpAnswerByAi);

  await Promise.allSettled(
    pendingFiles.map(async (file) => {
      const fileId = file.file_id?.trim();
      const agentId = file.agent_id?.trim();
      const sectionCount = getFileSectionCounts(file);
      if (!fileId || !agentId || answerByAiInFlight.has(fileId) || sectionCount === 0) return;

      answerByAiInFlight.add(fileId);
      try {
        for (let section = 1; section <= sectionCount; section += 1) {
          await answerRfpByAi({ agentId, fileId, section, question: -1 });
        }
      } finally {
        answerByAiInFlight.delete(fileId);
      }
    })
  );
}

export async function evaluateUploadedRfpFiles(
  agentId: string,
  uploadResponse: IDGRfpUploadResponse
): Promise<void> {
  const fileIds = extractUploadResponseFileIds(uploadResponse);
  if (fileIds.length === 0) {
    throw new Error("Upload succeeded but no file IDs were returned for evaluation.");
  }

  const results = await Promise.allSettled(
    fileIds.map((fileId) => evaluateRfpFile({ agentId, fileId }))
  );

  const failedCount = results.filter((result) => result.status === "rejected").length;
  if (failedCount > 0) {
    throw new Error(
      failedCount === fileIds.length
        ? "Failed to evaluate uploaded RFP file(s)."
        : `Failed to evaluate ${failedCount} of ${fileIds.length} uploaded file(s).`
    );
  }
}

export async function uploadRfpFilesToPack({
  agentId,
  packTitle,
  documentContext,
  files,
  packId,
}: {
  agentId: string;
  packTitle: string;
  documentContext?: string;
  files: File[];
  packId?: string;
  usePerFileTitles?: boolean;
}): Promise<IDGRfpUploadResponse> {
  if (files.length === 0) {
    throw new Error("At least one file is required.");
  }

  const fallbackTitle = stripRfpFileExtension(files[0].name) || files[0].name;
  const title = packTitle.trim() || fallbackTitle;

  const uploadResponse = await uploadRfpFiles({
    agentId,
    title,
    documentContext,
    files,
    packId,
  });

  return uploadResponse;
}

const rfpFilesInFlight = new Map<string, Promise<IDGRfpFilesResponse>>();

export async function getRfpFiles(agentId: string): Promise<IDGRfpFilesResponse> {
  const trimmedAgentId = agentId?.trim();
  if (!trimmedAgentId) {
    throw new Error("agent_id is required to fetch RFP files.");
  }

  const existing = rfpFilesInFlight.get(trimmedAgentId);
  if (existing) return existing;

  const request = (async () => {
    const params = new URLSearchParams({
      namespace: IDG_RFP_NAMESPACE,
      index_name: IDG_RFP_INDEX_NAME,
      agent_id: trimmedAgentId,
    });

    const res = await appFetch(buildIdgApiUrl(`/worker/knowledge/rfp/files?${params.toString()}`));
    const payload = (await res.json().catch(() => ({}))) as IDGRfpFilesResponse & {
      detail?: string | Array<{ msg?: string }>;
      files?: IDGRfpFile[];
      total_files?: number;
    };

    const nestedData = payload.data;
    const files = nestedData?.files ?? payload.files ?? [];
    const totalFiles = nestedData?.total_files ?? payload.total_files ?? files.length;

    if (!res.ok || payload.success === false) {
      throw new Error(getApiErrorMessage(payload, "Failed to fetch RFP files."));
    }

    return {
      success: payload.success ?? true,
      data: {
        index_name: nestedData?.index_name ?? IDG_RFP_INDEX_NAME,
        namespace: nestedData?.namespace ?? IDG_RFP_NAMESPACE,
        filters: nestedData?.filters ?? { agent_id: trimmedAgentId, pack_id: null },
        files,
        total_files: totalFiles,
      },
    };
  })();

  rfpFilesInFlight.set(trimmedAgentId, request);

  try {
    return await request;
  } finally {
    if (rfpFilesInFlight.get(trimmedAgentId) === request) {
      rfpFilesInFlight.delete(trimmedAgentId);
    }
  }
}

export async function getRfpFileById(fileId: string): Promise<IDGRfpFileByIdResponse> {
  const trimmedFileId = fileId?.trim();
  if (!trimmedFileId) {
    throw new Error("file_id is required to fetch an RFP file.");
  }

  const params = new URLSearchParams({
    file_id: trimmedFileId,
    namespace: IDG_RFP_NAMESPACE,
    index_name: IDG_RFP_INDEX_NAME,
  });

  return fetchRfpDetailRequest("file-by-id", params, "Failed to fetch RFP file.");
}

const rfpPackByIdInFlight = new Map<string, Promise<IDGRfpFileByIdResponse>>();

export async function parseRfpPackById(
  packId: string,
  primaryFileId?: string
): Promise<IDGRfpFileByIdResponse> {
  const trimmedPackId = packId?.trim();
  if (!trimmedPackId) {
    throw new Error("pack_id is required to parse an RFP pack.");
  }

  const existing = rfpPackByIdInFlight.get(trimmedPackId);
  if (existing) return existing;

  const params = new URLSearchParams({
    pack_id: trimmedPackId,
    namespace: IDG_RFP_NAMESPACE,
    index_name: IDG_RFP_INDEX_NAME,
  });

  const request = fetchRfpPackByIdRequest(params, primaryFileId, "Failed to parse RFP document.");
  rfpPackByIdInFlight.set(trimmedPackId, request);

  try {
    return await request;
  } finally {
    if (rfpPackByIdInFlight.get(trimmedPackId) === request) {
      rfpPackByIdInFlight.delete(trimmedPackId);
    }
  }
}

function pickPrimaryPackFile(files: IDGRfpFile[], primaryFileId?: string): IDGRfpFile {
  if (files.length === 0) {
    throw new Error("No files found in pack.");
  }

  if (primaryFileId) {
    const match = files.find((file) => file.file_id === primaryFileId);
    if (match) return match;
  }

  const withDescription = files.find((file) => file.description?.trim());
  if (withDescription) return withDescription;

  const withSections = [...files].sort(
    (a, b) => (b.sections?.length ?? 0) - (a.sections?.length ?? 0)
  );
  if ((withSections[0]?.sections?.length ?? 0) > 0) return withSections[0];

  return files[0];
}

export function mergePackFileSections(
  files: IDGRfpFile[],
  options?: { evaluatedOnly?: boolean }
): IDGRfpSection[] {
  const merged: IDGRfpSection[] = [];

  for (const file of files) {
    if (options?.evaluatedOnly && file.is_evaluated !== 1) continue;

    const sections = file.sections ?? [];
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const section = sections[sectionIndex];
      merged.push({
        ...section,
        source_file_id: file.file_id,
        source_file_title: file.title,
        source_section_index: sectionIndex,
      });
    }
  }

  return merged;
}

export function getPackFilesFromRfpFile(file?: IDGRfpFile | null): IDGRfpFile[] {
  if (!file) return [];
  if (file.pack_files?.length) return file.pack_files;
  return [file];
}

export function getPackEvaluationProgress(files: IDGRfpFile[]) {
  const total = files.length;
  const evaluated = files.filter((file) => file.is_evaluated === 1).length;
  const pending = Math.max(total - evaluated, 0);

  return {
    total,
    evaluated,
    pending,
    allEvaluated: total > 0 && pending === 0,
    hasPending: total === 0 ? false : pending > 0,
  };
}

export function getRfpSectionApiTarget(
  section: IDGRfpSection | undefined,
  mergedSectionIndex: number,
  fallbackFileId: string
): { fileId: string; sectionIndex: number } {
  return {
    fileId: section?.source_file_id?.trim() || fallbackFileId,
    sectionIndex: section?.source_section_index ?? mergedSectionIndex,
  };
}

export function normalizePackByIdToRfpFile(
  data: IDGRfpPackByIdData,
  primaryFileId?: string
): IDGRfpFile {
  const files = data.files ?? [];
  const primary = pickPrimaryPackFile(files, primaryFileId);
  const mergedSections = mergePackFileSections(files, { evaluatedOnly: true });

  return {
    ...primary,
    file_id: primary.file_id,
    pack_id: data.pack_id,
    agent_id: data.agent_id ?? primary.agent_id,
    title: data.pack_metadata?.title || primary.title,
    description: primary.description ?? data.pack_metadata?.description ?? null,
    category: primary.category ?? data.pack_metadata?.category ?? null,
    country: primary.country ?? data.pack_metadata?.country ?? null,
    is_evaluated: data.pack_metadata?.is_evaluated ?? primary.is_evaluated ?? 0,
    sections: mergedSections,
    pack_files: files,
  };
}

async function fetchRfpPackByIdRequest(
  params: URLSearchParams,
  primaryFileId: string | undefined,
  fallbackError: string
): Promise<IDGRfpFileByIdResponse> {
  const res = await appFetch(buildIdgApiUrl(`/worker/knowledge/rfp/pack-by-id?${params.toString()}`));
  const payload = (await res.json().catch(() => ({}))) as IDGRfpFileByIdResponse & {
    detail?: string | Array<{ msg?: string }>;
    data?: IDGRfpPackByIdData;
  };

  const rawData = payload.data;
  if (!res.ok || payload.success === false || !rawData?.pack_id || !Array.isArray(rawData.files)) {
    throw new Error(getApiErrorMessage(payload, fallbackError));
  }

  const file = normalizePackByIdToRfpFile(rawData, primaryFileId);
  if (!file.file_id) {
    throw new Error(getApiErrorMessage(payload, fallbackError));
  }

  return {
    ...payload,
    data: file,
  };
}

async function fetchRfpDetailRequest(
  endpoint: "file-by-id",
  params: URLSearchParams,
  fallbackError: string
): Promise<IDGRfpFileByIdResponse> {
  const res = await appFetch(buildIdgApiUrl(`/worker/knowledge/rfp/${endpoint}?${params.toString()}`));
  const payload = (await res.json().catch(() => ({}))) as IDGRfpFileByIdResponse & {
    detail?: string | Array<{ msg?: string }>;
    data?: IDGRfpFile & {
      file?: IDGRfpFile;
      sections?: IDGRfpSection[];
      sections_json?: string | IDGRfpSection[];
    };
  };

  const rawData = payload.data;
  let file = rawData?.file_id ? rawData : rawData?.file;

  if (file && rawData) {
    file = {
      ...file,
      sections: file.sections ?? rawData.sections,
      sections_json: file.sections_json ?? rawData.sections_json,
    };
  }

  if (!res.ok || payload.success === false || !file?.file_id) {
    throw new Error(getApiErrorMessage(payload, fallbackError));
  }

  return {
    ...payload,
    data: file,
  };
}

export interface IDGRfpAnswerByUserRequest {
  agentId: string;
  fileId: string;
  questionId: string;
  answerByUser: string;
}

export interface IDGRfpAnswerByUserResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export async function submitRfpAnswerByUser({
  agentId,
  fileId,
  questionId,
  answerByUser,
}: IDGRfpAnswerByUserRequest): Promise<IDGRfpAnswerByUserResponse> {
  const trimmedAgentId = agentId?.trim();
  const trimmedFileId = fileId?.trim();
  const trimmedQuestionId = questionId?.trim();
  const trimmedAnswer = answerByUser?.trim();

  if (!trimmedAgentId) {
    throw new Error("agent_id is required to save an answer.");
  }
  if (!trimmedFileId) {
    throw new Error("file_id is required to save an answer.");
  }
  if (!trimmedQuestionId) {
    throw new Error("question_id is required to save an answer.");
  }
  if (!trimmedAnswer) {
    throw new Error("answer_by_user is required to save an answer.");
  }

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/rfp/answer-by-user"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: trimmedAgentId,
      file_id: trimmedFileId,
      question_id: trimmedQuestionId,
      answer_by_user: trimmedAnswer,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpAnswerByUserResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to lock answer."));
  }

  return payload;
}

export interface IDGRfpAddSectionQuestionPayload {
  id: number;
  question: string;
  word_limit?: number;
}

export interface IDGRfpAddSectionRequest {
  agentId: string;
  fileId: string;
  section: string;
  pageNumber: number;
  questions: IDGRfpAddSectionQuestionPayload[];
}

export interface IDGRfpAddSectionResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export function parseWordLimitForApi(wordLimit: string): number | undefined {
  const trimmed = wordLimit.trim();
  if (!trimmed || /^no limit$/i.test(trimmed) || /^spreadsheet$/i.test(trimmed)) {
    return undefined;
  }
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : undefined;
}

export async function addRfpSection({
  agentId,
  fileId,
  section,
  pageNumber,
  questions,
}: IDGRfpAddSectionRequest): Promise<IDGRfpAddSectionResponse> {
  const trimmedAgentId = agentId?.trim();
  const trimmedFileId = fileId?.trim();
  const trimmedSection = section?.trim();

  if (!trimmedAgentId) {
    throw new Error("agent_id is required to add a section.");
  }
  if (!trimmedFileId) {
    throw new Error("file_id is required to add a section.");
  }
  if (!trimmedSection) {
    throw new Error("section is required to add a section.");
  }
  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    throw new Error("page_number is required to add a section.");
  }
  if (!questions.length) {
    throw new Error("At least one question is required.");
  }

  const payloadQuestions = questions.map((question, index) => {
    const text = question.question?.trim();
    if (!text) {
      throw new Error(`Question ${index + 1} text is required.`);
    }
    const entry: IDGRfpAddSectionQuestionPayload = {
      id: question.id ?? index + 1,
      question: text,
    };
    if (question.word_limit !== undefined) {
      entry.word_limit = question.word_limit;
    }
    return entry;
  });

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/rfp/add-section"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: trimmedAgentId,
      file_id: trimmedFileId,
      section: trimmedSection,
      page_number: pageNumber,
      questions: payloadQuestions,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpAddSectionResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to add section."));
  }

  return payload;
}

export function formatWordLimitLabel(wordLimit?: number | null): string {
  if (wordLimit === undefined || wordLimit === null) return "No limit";
  return String(wordLimit);
}

export async function updateRfpSection({
  agentId,
  fileId,
  section,
  pageNumber,
  sectionIndex,
}: {
  agentId: string;
  fileId: string;
  section: string;
  pageNumber: number;
  sectionIndex: number;
}): Promise<IDGRfpAddSectionResponse> {
  const trimmedAgentId = agentId?.trim();
  const trimmedFileId = fileId?.trim();
  const trimmedSection = section?.trim();

  if (!trimmedAgentId) throw new Error("agent_id is required to update a section.");
  if (!trimmedFileId) throw new Error("file_id is required to update a section.");
  if (!trimmedSection) throw new Error("section is required to update a section.");
  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    throw new Error("page_number is required to update a section.");
  }
  if (!Number.isFinite(sectionIndex) || sectionIndex < 0) {
    throw new Error("section_index is required to update a section.");
  }

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/rfp/update-section"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: trimmedAgentId,
      file_id: trimmedFileId,
      section: trimmedSection,
      page_number: pageNumber,
      section_index: sectionIndex,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpAddSectionResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to update section."));
  }

  return payload;
}

export async function updateRfpQuestion({
  agentId,
  fileId,
  questionId,
  question,
  wordLimit,
}: {
  agentId: string;
  fileId: string;
  questionId: string;
  question: string;
  wordLimit?: number;
}): Promise<IDGRfpAddSectionResponse> {
  const trimmedAgentId = agentId?.trim();
  const trimmedFileId = fileId?.trim();
  const trimmedQuestionId = questionId?.trim();
  const trimmedQuestion = question?.trim();

  if (!trimmedAgentId) throw new Error("agent_id is required to update a question.");
  if (!trimmedFileId) throw new Error("file_id is required to update a question.");
  if (!trimmedQuestionId) throw new Error("question_id is required to update a question.");
  if (!trimmedQuestion) throw new Error("question is required to update a question.");

  const body: Record<string, unknown> = {
    agent_id: trimmedAgentId,
    file_id: trimmedFileId,
    question_id: trimmedQuestionId,
    question: trimmedQuestion,
  };
  if (wordLimit !== undefined) {
    body.word_limit = wordLimit;
  }

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/rfp/update-question"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpAddSectionResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to update question."));
  }

  return payload;
}

export async function deleteRfpQuestion({
  agentId,
  fileId,
  questionId,
  sectionIndex,
}: {
  agentId: string;
  fileId: string;
  questionId: string;
  sectionIndex: number;
}): Promise<IDGRfpAddSectionResponse> {
  const trimmedAgentId = agentId?.trim();
  const trimmedFileId = fileId?.trim();
  const trimmedQuestionId = questionId?.trim();

  if (!trimmedAgentId) throw new Error("agent_id is required to delete a question.");
  if (!trimmedFileId) throw new Error("file_id is required to delete a question.");
  if (!trimmedQuestionId) throw new Error("question_id is required to delete a question.");
  if (!Number.isFinite(sectionIndex) || sectionIndex < 0) {
    throw new Error("section_index is required to delete a question.");
  }

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/rfp/delete-question"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: trimmedAgentId,
      file_id: trimmedFileId,
      qustion_id: trimmedQuestionId,
      section_index: sectionIndex,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpAddSectionResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to delete question."));
  }

  return payload;
}

export async function addRfpQuestion({
  agentId,
  fileId,
  sectionIndex,
  id,
  question,
  wordLimit,
}: {
  agentId: string;
  fileId: string;
  sectionIndex: number;
  id: number;
  question: string;
  wordLimit?: number;
}): Promise<IDGRfpAddSectionResponse> {
  const trimmedAgentId = agentId?.trim();
  const trimmedFileId = fileId?.trim();
  const trimmedQuestion = question?.trim();

  if (!trimmedAgentId) throw new Error("agent_id is required to add a question.");
  if (!trimmedFileId) throw new Error("file_id is required to add a question.");
  if (!trimmedQuestion) throw new Error("question is required to add a question.");
  if (!Number.isFinite(sectionIndex) || sectionIndex < 0) {
    throw new Error("section_index is required to add a question.");
  }
  if (!Number.isFinite(id) || id < 1) {
    throw new Error("id is required to add a question.");
  }

  const body: Record<string, unknown> = {
    agent_id: trimmedAgentId,
    file_id: trimmedFileId,
    section_index: sectionIndex,
    id,
    question: trimmedQuestion,
  };
  if (wordLimit !== undefined) {
    body.word_limit = wordLimit;
  }

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/rfp/add-question"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpAddSectionResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to add question."));
  }

  return payload;
}

export async function deleteRfpPack(packId: string): Promise<IDGRfpDeleteResponse> {
  const trimmedPackId = packId?.trim();
  if (!trimmedPackId) {
    throw new Error("pack_id is required to delete an RFP pack.");
  }

  const params = new URLSearchParams({
    pack_id: trimmedPackId,
    namespace: IDG_RFP_NAMESPACE,
    index_name: IDG_RFP_INDEX_NAME,
  });

  const res = await appFetch(buildIdgApiUrl(`/worker/knowledge/rfp/pack-by-id?${params.toString()}`), {
    method: "DELETE",
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpDeleteResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to delete RFP pack."));
  }

  return payload;
}

export async function deleteRfpFile(fileId: string): Promise<IDGRfpDeleteResponse> {
  const trimmedFileId = fileId?.trim();
  if (!trimmedFileId) {
    throw new Error("file_id is required to delete an RFP file.");
  }

  const params = new URLSearchParams({
    file_id: trimmedFileId,
    namespace: IDG_RFP_NAMESPACE,
    index_name: IDG_RFP_INDEX_NAME,
  });

  const res = await appFetch(buildIdgApiUrl(`/worker/knowledge/rfp/file-by-id?${params.toString()}`), {
    method: "DELETE",
  });

  const payload = (await res.json().catch(() => ({}))) as IDGRfpDeleteResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to delete RFP file."));
  }

  return payload;
}

export interface IDGKnowledgeBaseFile {
  file_id: string;
  pack_id: string;
  agent_id: string;
  title: string;
  category: string | null;
  country: string | null;
  is_evaluated: number;
  chunk_count: number;
  description?: string | null;
  category_description?: string | null;
}

export interface IDGKnowledgeBaseFilesData {
  index_name: string;
  namespace: string;
  filters: {
    agent_id: string | null;
    pack_id: string | null;
  };
  total_files: number;
  files: IDGKnowledgeBaseFile[];
}

export interface IDGKnowledgeBaseFilesResponse {
  success: boolean;
  data: IDGKnowledgeBaseFilesData;
  errors?: unknown[];
  message?: string;
}

export async function getKnowledgeBaseFiles(agentId?: string): Promise<IDGKnowledgeBaseFilesResponse> {
  const params = new URLSearchParams({
    namespace: IDG_KB_NAMESPACE,
    index_name: IDG_KB_INDEX_NAME,
  });

  const trimmedAgentId = agentId?.trim();
  if (trimmedAgentId) {
    params.set("agent_id", trimmedAgentId);
  }

  const res = await appFetch(buildIdgApiUrl(`/worker/knowledge/base/files?${params.toString()}`));
  const payload = (await res.json().catch(() => ({}))) as IDGKnowledgeBaseFilesResponse & {
    detail?: string | Array<{ msg?: string }>;
    files?: IDGKnowledgeBaseFile[];
    total_files?: number;
  };

  const nestedData = payload.data;
  const rawFiles = nestedData?.files ?? payload.files ?? [];
  const files = rawFiles.map((file) => ({
    ...file,
    description: file.category_description ?? null,
  }));
  const totalFiles = nestedData?.total_files ?? payload.total_files ?? files.length;

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to fetch knowledge base files."));
  }

  return {
    success: payload.success ?? true,
    data: {
      index_name: nestedData?.index_name ?? IDG_KB_INDEX_NAME,
      namespace: nestedData?.namespace ?? IDG_KB_NAMESPACE,
      filters: nestedData?.filters ?? { agent_id: null, pack_id: null },
      files,
      total_files: totalFiles,
    },
  };
}

export interface IDGKnowledgeBaseUploadRequest {
  agentId: string;
  category: string;
  categoryDescription?: string;
  title: string;
  description: string;
  files: File[];
}

export interface IDGKnowledgeBaseUploadResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export async function uploadKnowledgeBaseFile({
  agentId,
  category,
  categoryDescription,
  title,
  description,
  files,
}: IDGKnowledgeBaseUploadRequest): Promise<IDGKnowledgeBaseUploadResponse> {
  const trimmedAgentId = agentId?.trim();
  if (!trimmedAgentId) {
    throw new Error("agent_id is required to upload a knowledge base file.");
  }

  const trimmedCategory = category?.trim();
  if (!trimmedCategory) {
    throw new Error("Category is required.");
  }

  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    throw new Error("Title is required.");
  }

  const trimmedDescription = description?.trim();
  if (!trimmedDescription) {
    throw new Error("Description is required.");
  }

  if (files.length === 0) {
    throw new Error("At least one file is required.");
  }

  const formData = new FormData();
  formData.append("agent_id", trimmedAgentId);
  formData.append("category", trimmedCategory);
  if (categoryDescription?.trim()) {
    formData.append("category_description", categoryDescription.trim());
  }
  formData.append("title", trimmedTitle);
  formData.append("description", trimmedDescription);
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await appFetch(buildIdgApiUrl("/worker/knowledge/base/upload-file"), {
    method: "POST",
    body: formData,
  });

  const payload = (await res.json().catch(() => ({}))) as IDGKnowledgeBaseUploadResponse & {
    detail?: string | Array<{ msg?: string }>;
  };

  if (!res.ok || payload.success === false) {
    throw new Error(getApiErrorMessage(payload, "Failed to upload knowledge base file."));
  }

  return payload;
}
