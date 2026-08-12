export interface RfpAnswerByAiFileCache {
  recent_runtime: number;
  sections: number[];
}

export interface RfpAnswerByAiCache {
  files: Record<string, RfpAnswerByAiFileCache>;
}

const STORAGE_KEY = "qiko_rfp_answer_by_ai";
const CACHE_TTL_MS = 10 * 60 * 1000;

function loadCache(): RfpAnswerByAiCache {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { files: {} };
    const parsed = JSON.parse(raw) as RfpAnswerByAiCache;
    if (!parsed?.files || typeof parsed.files !== "object") return { files: {} };
    return parsed;
  } catch {
    return { files: {} };
  }
}

function saveCache(cache: RfpAnswerByAiCache): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export function shouldSkipRfpAnswerByAiCall(fileId: string, section: number): boolean {
  const trimmedFileId = fileId?.trim();
  if (!trimmedFileId) return false;

  const entry = loadCache().files[trimmedFileId];
  if (!entry?.sections.includes(section)) return false;

  return Date.now() - entry.recent_runtime < CACHE_TTL_MS;
}

export function recordRfpAnswerByAiCall(fileId: string, section: number): void {
  const trimmedFileId = fileId?.trim();
  if (!trimmedFileId) return;

  const cache = loadCache();
  const existing = cache.files[trimmedFileId];
  const sections = existing?.sections ?? [];
  const now = Date.now();

  cache.files[trimmedFileId] = {
    recent_runtime: now,
    sections: sections.includes(section) ? sections : [...sections, section],
  };
  saveCache(cache);
}
