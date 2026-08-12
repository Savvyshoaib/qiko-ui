import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Globe2,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Radar,
  Search,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getIdgSalesIngestFilters,
  updateIdgSalesIngestFilters,
  type IdgSalesScanCadence,
  type ScanSourcePayload,
} from "@/lib/idgSalesApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { formatDateTime } from "./salesIntelUtils";
import type { IngestionSource } from "./salesIntelTypes";
import { useSalesIntelData } from "./useSalesIntelData";

/** Toggle to show Manual Upload source card + manual ingestion form */
const SHOW_MANUAL_INGESTION_UI = false;

const CONNECTOR_OPTIONS: { value: "generic" | "ungm" | "ted"; label: string }[] = [
  { value: "generic", label: "Generic (any site URL)" },
  { value: "ungm", label: "UNGM" },
  { value: "ted", label: "TED" },
];

const connectorTriggerClass =
  "h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-[13px] font-normal text-white shadow-none hover:bg-black/40 focus-visible:border-indigo-500/50 focus-visible:ring-0 data-[size=default]:h-9 data-[size=sm]:h-9 [&_svg]:size-4 [&_svg]:text-slate-500";

const connectorContentClass =
  "z-[120] rounded-lg border border-white/[0.08] bg-[#121421] text-slate-200 shadow-xl shadow-black/50";

const connectorItemClass =
  "cursor-pointer rounded-md py-2 pl-2 pr-8 text-[13px] text-slate-300 focus:bg-indigo-500/20 focus:text-indigo-100 data-[highlighted]:bg-indigo-500/20 data-[highlighted]:text-indigo-100";


const SCAN_CADENCE_OPTIONS: { value: IdgSalesScanCadence; label: string }[] = [
  { value: "hourly", label: "Per hour" },
  { value: "daily", label: "Per day" },
  { value: "weekly", label: "Per week" },
  { value: "manual", label: "Manual only" },
];

const SOURCE_META: Record<
  string,
  { icon: typeof Globe2; accent: string; accentBg: string; accentBorder: string; label: string }
> = {
  ted: {
    icon: Globe2,
    accent: "text-amber-300",
    accentBg: "rgba(245,158,11,0.12)",
    accentBorder: "border-amber-500/25",
    label: "EU Tenders Electronic Daily",
  },
  ungm: {
    icon: Building2,
    accent: "text-sky-300",
    accentBg: "rgba(56,189,248,0.12)",
    accentBorder: "border-sky-500/25",
    label: "UN Global Marketplace",
  },
};

function scanStatusMeta(status?: string | null) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "success") {
    return { label: "Success", className: "text-emerald-400", icon: CheckCircle2 };
  }
  if (normalized === "failed") {
    return { label: "Failed", className: "text-red-400", icon: XCircle };
  }
  if (normalized === "running") {
    return { label: "Running", className: "text-amber-400", icon: Loader2 };
  }
  return { label: status ?? "—", className: "text-slate-400", icon: null };
}

function FilterToggle({
  id,
  checked,
  onCheckedChange,
  icon: Icon,
  title,
  description,
  activeHint,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: typeof MapPin;
  title: string;
  description: string;
  activeHint: string;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-lg border px-3 py-3 transition-colors ${
        checked ? "border-indigo-500/30 bg-indigo-500/[0.06]" : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="flex min-w-0 gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            checked ? "bg-indigo-500/15 text-indigo-300" : "bg-white/[0.04] text-slate-500"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white">{title}</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{description}</p>
          <p className={`mt-1.5 text-[10px] ${checked ? "text-indigo-300/80" : "text-slate-600"}`}>
            {checked ? activeHint : "Using configured allowlist"}
          </p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-1 h-5 w-9 shrink-0 data-[state=checked]:bg-indigo-500 data-[state=unchecked]:bg-white/15 [&_[data-slot=switch-thumb]]:size-4 [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-[1.15rem]"
      />
    </div>
  );
}

function FilterQueryKeyword({
  id,
  enabled,
  onEnabledChange,
  value,
  onChange,
}: {
  id: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: string;
  onChange: (value: string) => void;
}) {
  const trimmed = value.trim();

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-lg border px-3 py-3 transition-colors ${
        enabled ? "border-indigo-500/30 bg-indigo-500/[0.06]" : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            enabled ? "bg-indigo-500/15 text-indigo-300" : "bg-white/[0.04] text-slate-500"
          }`}
        >
          <Search className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-white">Portal query</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
            Keyword for TED notice titles and UNGM descriptions. Toggle off for an open portal search.
          </p>
          <input
            id={id}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={!enabled}
            placeholder="security"
            maxLength={255}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className={`mt-1.5 text-[10px] ${enabled ? "text-indigo-300/80" : "text-slate-600"}`}>
            {enabled
              ? trimmed
                ? `Searching portals for "${trimmed}"`
                : "Enter a keyword to filter portal results"
              : "Open search (no keyword)"}
          </p>
        </div>
      </div>
      <Switch
        id={`${id}-toggle`}
        checked={enabled}
        onCheckedChange={onEnabledChange}
        className="mt-1 h-5 w-9 shrink-0 data-[state=checked]:bg-indigo-500 data-[state=unchecked]:bg-white/15 [&_[data-slot=switch-thumb]]:size-4 [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-[1.15rem]"
      />
    </div>
  );
}

function SourceCard({
  source,
  isToggling,
  isUpdatingCadence,
  isScanningThis,
  scanDisabled,
  isDeleting,
  onToggle,
  onCadenceChange,
  onScan,
  onDelete,
}: {
  source: IngestionSource;
  isToggling: boolean;
  isUpdatingCadence: boolean;
  isScanningThis: boolean;
  scanDisabled: boolean;
  isDeleting: boolean;
  onToggle: () => void;
  onCadenceChange: (cadence: IdgSalesScanCadence) => void;
  onScan: () => void;
  onDelete: () => void;
}) {
  const key = (source.sourceKey ?? "").toLowerCase();
  const meta = SOURCE_META[key] ?? {
    icon: Radar,
    accent: "text-indigo-300",
    accentBg: "rgba(99,102,241,0.12)",
    accentBorder: "border-indigo-500/25",
    label: source.type,
  };
  const Icon = meta.icon;
  const status = scanStatusMeta(isScanningThis ? "running" : source.lastScanStatus);
  const nextScanLabel =
    !source.isActive
      ? "Inactive"
      : source.scanCadence === "manual"
        ? "Manual only"
        : source.nextScanAt
          ? formatDateTime(source.nextScanAt)
          : "—";
  const configUrl = source.config?.url?.trim() ?? "";

  return (
    <article
      className={`flex flex-col rounded-xl border p-0 transition-opacity ${
        source.isActive ? meta.accentBorder : "border-white/[0.06] opacity-75"
      }`}
      style={{ background: "rgba(255,255,255,0.015)" }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] p-4">
        <div className="flex min-w-0 gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: meta.accentBg }}
          >
            <Icon className={`h-5 w-5 ${meta.accent}`} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-white">{source.name}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
              {source.type}
              {source.sourceKey ? ` · ${source.sourceKey.toUpperCase()}` : ""}
              {source.config?.connector || source.connector
                ? ` · ${(source.config?.connector || source.connector || "").toUpperCase()}`
                : ""}
            </p>
            {configUrl ? (
              <p className="mt-1 truncate text-[10px] text-slate-600" title={configUrl}>
                {configUrl}
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-slate-600">{meta.label}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting || !source.sourceKey}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-45"
            aria-label={`Delete ${source.name}`}
            title="Delete source"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
          {isToggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" aria-hidden="true" />
          ) : null}
          <Switch
            checked={source.isActive}
            disabled={isToggling || isDeleting || !source.sourceKey}
            onCheckedChange={(checked) => {
              if (checked === source.isActive) return;
              onToggle();
            }}
            aria-label={source.isActive ? `Disable ${source.name}` : `Enable ${source.name}`}
            className="h-5 w-9 data-[state=checked]:bg-indigo-500 data-[state=unchecked]:bg-white/15 [&_[data-slot=switch-thumb]]:size-4 [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-[1.15rem]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 divide-y divide-x divide-white/[0.06] border-b border-white/[0.06] sm:grid-cols-4 sm:divide-y-0">
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">Last scan</p>
          <p className="mt-1 text-[10px] font-medium leading-snug text-slate-300">
            <Calendar className="mb-0.5 inline h-3 w-3 text-slate-600" />{" "}
            {source.lastScanAt ? formatDateTime(source.lastScanAt) : "Never"}
          </p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">Next scan</p>
          <p className="mt-1 text-[10px] font-medium leading-snug text-slate-300">
            <Calendar className="mb-0.5 inline h-3 w-3 text-slate-600" /> {nextScanLabel}
          </p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">Status</p>
          <p className={`mt-1 flex items-center justify-center gap-1 text-[11px] font-medium ${status.className}`}>
            {status.icon ? (
              <status.icon className={`h-3 w-3 ${isScanningThis ? "animate-spin" : ""}`} />
            ) : null}
            {status.label}
          </p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">Found</p>
          <p className="mt-1 text-[11px] font-semibold text-white">
            {source.opportunitiesFound ?? 0}
            <span className="ml-1 text-[9px] font-normal text-slate-500">opps</span>
          </p>
        </div>
      </div>

      {source.type === "portal" ? (
        <div className="border-b border-white/[0.06] px-4 py-3">
          <label
            htmlFor={`scan-cadence-${source.id}`}
            className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wider text-slate-600"
          >
            Scan frequency
          </label>
          <div className="relative">
            <select
              id={`scan-cadence-${source.id}`}
              value={source.scanCadence}
              disabled={isUpdatingCadence || !source.sourceKey}
              onChange={(event) =>
                onCadenceChange(event.target.value as IdgSalesScanCadence)
              }
              className="w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 pr-9 text-[12px] text-slate-200 outline-none transition-colors hover:border-white/20 hover:bg-white/[0.06] focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {SCAN_CADENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-900 text-slate-200">
                  {option.label}
                </option>
              ))}
            </select>
            {isUpdatingCadence ? (
              <Loader2
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400"
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-600">
            {source.scanCadence === "manual"
              ? "Auto-scan off. Use Run Scan when needed."
              : "Runs on this schedule when the source is enabled. Run Scan still available."}
          </p>
        </div>
      ) : null}

      {source.type === "portal" && source.canScan ? (
        <div className="p-4">
          <button
            type="button"
            onClick={onScan}
            disabled={scanDisabled}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              source.isActive
                ? "bg-indigo-500 hover:bg-indigo-400"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            {isScanningThis ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radar className="h-4 w-4" />
            )}
            {isScanningThis ? "Scanning portal…" : "Run Scan"}
          </button>
          {!source.isActive ? (
            <p className="mt-2 text-center text-[10px] text-slate-600">Enable source to run a scan</p>
          ) : null}
        </div>
      ) : source.type === "portal" ? (
        <div className="px-4 pb-4">
          <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-center text-[11px] leading-snug text-slate-500">
            This source needs a valid URL in config before Run Scan is available.
          </p>
        </div>
      ) : null}
    </article>
  );
}

export default function OpportunityIngestionView({ agentId }: { agentId: string }) {
  const {
    sources,
    sourceCatalog,
    scanning,
    scanningSourceKey,
    togglingSourceKey,
    updatingCadenceKey,
    addingSourceKey,
    deletingSourceKey,
    runScan,
    addSource,
    updateSourceSettings,
    toggleSource,
    updateSourceCadence,
    deleteSource,
    loading,
    initialized,
  } = useSalesIntelData(agentId);

  // Defaults ON; overwritten from backend once loaded for this agent.
  const [allCountries, setAllCountries] = useState(true);
  const [allCategories, setAllCategories] = useState(true);
  const [queryEnabled, setQueryEnabled] = useState(true);
  const [queryKeyword, setQueryKeyword] = useState("security");
  const [filtersReady, setFiltersReady] = useState(false);
  const [savingFilters, setSavingFilters] = useState(false);
  const keywordSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextKeywordSave = useRef(true);

  const trimmedAgentId = agentId.trim();

  const persistFilters = useCallback(
    async (patch: {
      query_enabled?: boolean;
      query_keyword?: string;
      all_countries?: boolean;
      all_categories?: boolean;
    }) => {
      if (!trimmedAgentId || !filtersReady) return;
      setSavingFilters(true);
      try {
        await updateIdgSalesIngestFilters(trimmedAgentId, patch);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save ingest filters.";
        toast.error(message);
      } finally {
        setSavingFilters(false);
      }
    },
    [filtersReady, trimmedAgentId]
  );

  useEffect(() => {
    if (!trimmedAgentId) return;

    let cancelled = false;
    setFiltersReady(false);
    skipNextKeywordSave.current = true;

    void (async () => {
      try {
        const response = await getIdgSalesIngestFilters(trimmedAgentId);
        if (cancelled) return;
        const filters = response.ingestFilters;
        setQueryEnabled(Boolean(filters.queryEnabled));
        setQueryKeyword(filters.queryKeyword?.trim() || "security");
        setAllCountries(Boolean(filters.allCountries));
        setAllCategories(Boolean(filters.allCategories));
      } catch {
        // Keep UI defaults (all enabled) if load fails.
        if (!cancelled) {
          setQueryEnabled(true);
          setQueryKeyword("security");
          setAllCountries(true);
          setAllCategories(true);
        }
      } finally {
        if (!cancelled) {
          setFiltersReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (keywordSaveTimer.current) {
        clearTimeout(keywordSaveTimer.current);
        keywordSaveTimer.current = null;
      }
    };
  }, [trimmedAgentId]);

  useEffect(() => {
    if (!filtersReady) return;
    if (skipNextKeywordSave.current) {
      skipNextKeywordSave.current = false;
      return;
    }
    if (keywordSaveTimer.current) clearTimeout(keywordSaveTimer.current);
    keywordSaveTimer.current = setTimeout(() => {
      void persistFilters({ query_keyword: queryKeyword.trim() || "security" });
    }, 450);
    return () => {
      if (keywordSaveTimer.current) {
        clearTimeout(keywordSaveTimer.current);
        keywordSaveTimer.current = null;
      }
    };
  }, [queryKeyword, filtersReady, persistFilters]);

  const trimmedQuery = queryEnabled ? queryKeyword.trim() : "";

  const scanOptions: Pick<ScanSourcePayload, "country_allowlist" | "category_allowlist" | "query"> = {
    country_allowlist: allCountries ? "*" : undefined,
    category_allowlist: allCategories ? "*" : undefined,
    ...(trimmedQuery !== "" ? { query: trimmedQuery } : {}),
  };

  const handleQueryEnabledChange = (enabled: boolean) => {
    setQueryEnabled(enabled);
    void persistFilters({ query_enabled: enabled });
  };

  const handleAllCountriesChange = (enabled: boolean) => {
    setAllCountries(enabled);
    void persistFilters({ all_countries: enabled });
  };

  const visibleSources = SHOW_MANUAL_INGESTION_UI
    ? sources
    : sources.filter((source) => source.type !== "manual");

  const availableCatalog = useMemo(
    () => sourceCatalog.filter((item) => !item.alreadyAdded),
    [sourceCatalog]
  );

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTargetKey, setDeletingTargetKey] = useState<string | null>(null);
  const [editingSourceKey, setEditingSourceKey] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [draftSourceKey, setDraftSourceKey] = useState("");
  const [draftSourceName, setDraftSourceName] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftApiUrl, setDraftApiUrl] = useState("");
  const [draftDefaultQuery, setDraftDefaultQuery] = useState("");
  const [draftConnector, setDraftConnector] = useState<"" | "ted" | "ungm" | "generic">("generic");

  const editingSource = useMemo(
    () => sources.find((item) => item.sourceKey === editingSourceKey) ?? null,
    [editingSourceKey, sources]
  );

  const deletingSource = useMemo(
    () => sources.find((item) => item.sourceKey === deletingTargetKey) ?? null,
    [deletingTargetKey, sources]
  );

  const resetAddDraft = () => {
    setDraftSourceKey("");
    setDraftSourceName("");
    setDraftUrl("");
    setDraftApiUrl("");
    setDraftDefaultQuery("");
    setDraftConnector("");
  };

  const openEditDialog = (source: IngestionSource) => {
    setEditingSourceKey(source.sourceKey);
    setDraftSourceName(source.name ?? "");
    setDraftUrl(source.config?.url ?? "");
    setDraftApiUrl(source.config?.apiUrl ?? "");
    setDraftDefaultQuery(source.config?.defaultQuery ?? "");
    const connector = (source.config?.connector || source.connector || "generic").toLowerCase();
    setDraftConnector(
      connector === "ted" || connector === "ungm" || connector === "generic" ? connector : "generic"
    );
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (source: IngestionSource) => {
    setDeletingTargetKey(source.sourceKey);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSource = async () => {
    if (!deletingTargetKey) return;
    try {
      await deleteSource(deletingTargetKey);
      setDeleteDialogOpen(false);
      setDeletingTargetKey(null);
      if (editingSourceKey === deletingTargetKey) {
        setEditDialogOpen(false);
        setEditingSourceKey(null);
      }
    } catch {
      // toast handled in hook
    }
  };

  const submitEditSource = async () => {
    if (!editingSourceKey) return;
    const name = draftSourceName.trim();
    const url = draftUrl.trim();
    if (!name) {
      toast.error("Display name is required.");
      return;
    }
    if (!url) {
      toast.error("URL is required.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateSourceSettings(editingSourceKey, {
        name,
        url,
        apiUrl: draftApiUrl.trim(),
        defaultQuery: draftDefaultQuery.trim(),
        connector: draftConnector || "generic",
      });
      setEditDialogOpen(false);
      setEditingSourceKey(null);
    } catch {
      // toast already shown
    } finally {
      setSavingEdit(false);
    }
  };

  const openAddDialog = () => {
    resetAddDraft();
    setDraftConnector("generic");
    setAddDialogOpen(true);
  };

  const applyCatalogSuggestion = (item: (typeof availableCatalog)[number]) => {
    setDraftSourceKey(item.key);
    setDraftSourceName(item.name);
    setDraftUrl(item.defaultConfig?.url?.trim() ?? "");
    setDraftApiUrl(item.defaultConfig?.apiUrl?.trim() ?? "");
    setDraftDefaultQuery(item.defaultConfig?.defaultQuery?.trim() ?? "");
    setDraftConnector(item.key === "ted" || item.key === "ungm" ? item.key : "generic");
  };

  const submitAddSource = async () => {
    const key = draftSourceKey.trim().toLowerCase();
    const name = draftSourceName.trim();
    const url = draftUrl.trim();
    if (!key) {
      toast.error("Enter a source key (e.g. abc, xyz, ted).");
      return;
    }
    if (!url) {
      toast.error("URL is required.");
      return;
    }
    try {
      await addSource(key, {
        ...(name !== "" ? { name } : {}),
        url,
        ...(draftApiUrl.trim() !== "" ? { apiUrl: draftApiUrl.trim() } : {}),
        defaultQuery: draftDefaultQuery.trim(),
        ...(draftConnector !== "" ? { connector: draftConnector } : { connector: "generic" }),
      });
      setAddDialogOpen(false);
      resetAddDraft();
    } catch {
      // toast already shown in addSource
    }
  };

  const addSourceButton = (
    <Button
      type="button"
      size="sm"
      disabled={Boolean(addingSourceKey)}
      onClick={openAddDialog}
      className="h-8 gap-1.5 rounded-lg bg-indigo-500 px-3 text-[12px] font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
    >
      {addingSourceKey ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Plus className="h-3.5 w-3.5" />
      )}
      Add source
    </Button>
  );

  const fieldClassName =
    "h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-[13px] text-white outline-none placeholder:text-slate-600 focus:border-indigo-500/50";

  const addSourceDialog = (
    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
      <DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Add ingestion source</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto py-1 pr-1">
          <p className="text-[12px] leading-relaxed text-slate-400">
            Use a search URL with an empty <span className="text-slate-200">q=</span> param
            (example SimplyHired). Keyword from Default query / ingest filters is injected into{" "}
            <span className="text-slate-200">q</span>. TED/UNGM URLs auto-use dedicated scanners.
          </p>
          {availableCatalog.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Quick add (built-in)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableCatalog.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => applyCatalogSuggestion(item)}
                    className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-200 hover:border-indigo-500/40 hover:bg-indigo-500/10"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor="add-source-key" className="text-[11px] font-medium text-slate-400">
              Source key
            </label>
            <input
              id="add-source-key"
              value={draftSourceKey}
              onChange={(e) => setDraftSourceKey(e.target.value.toLowerCase())}
              placeholder="e.g. abc, xyz, ted"
              className={fieldClassName}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-source-name" className="text-[11px] font-medium text-slate-400">
              Display name
              <span className="font-normal text-slate-600"> (required for custom keys)</span>
            </label>
            <input
              id="add-source-name"
              value={draftSourceName}
              onChange={(e) => setDraftSourceName(e.target.value)}
              placeholder="e.g. ABC Portal"
              className={fieldClassName}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-source-url" className="text-[11px] font-medium text-slate-400">
              URL <span className="text-rose-400">*</span>
            </label>
            <input
              id="add-source-url"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://www.simplyhired.com/search?q=&l=USA"
              className={fieldClassName}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-source-api-url" className="text-[11px] font-medium text-slate-400">
              API URL
              <span className="font-normal text-slate-600"> (optional)</span>
            </label>
            <input
              id="add-source-api-url"
              value={draftApiUrl}
              onChange={(e) => setDraftApiUrl(e.target.value)}
              placeholder="https://api.ted.europa.eu/v3/notices/search"
              className={fieldClassName}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-source-connector" className="text-[11px] font-medium text-slate-400">
              Scanner connector
            </label>
            <Select
              value={draftConnector || "generic"}
              onValueChange={(value) =>
                setDraftConnector((value as "ted" | "ungm" | "generic") || "generic")
              }
            >
              <SelectTrigger
                id="add-source-connector"
                className={connectorTriggerClass}
                aria-label="Scanner connector"
              >
                <SelectValue placeholder="Generic (any site URL)" />
              </SelectTrigger>
              <SelectContent className={connectorContentClass}>
                {CONNECTOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className={connectorItemClass}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-source-default-query" className="text-[11px] font-medium text-slate-400">
              Default query
              <span className="font-normal text-slate-600"> (optional)</span>
            </label>
            <input
              id="add-source-default-query"
              value={draftDefaultQuery}
              onChange={(e) => setDraftDefaultQuery(e.target.value)}
              placeholder="e.g. security"
              className={fieldClassName}
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddDialogOpen(false)}
            className="text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              Boolean(addingSourceKey) ||
              draftSourceKey.trim() === "" ||
              draftUrl.trim() === ""
            }
            onClick={() => void submitAddSource()}
            className="bg-indigo-500 text-white hover:bg-indigo-400"
          >
            {addingSourceKey ? "Adding…" : "Add source"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const editSourceDialog = (
    <Dialog
      open={editDialogOpen}
      onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingSourceKey(null);
      }}
    >
      <DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            Edit {editingSource?.name ?? "source"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto py-1 pr-1">
          <p className="text-[12px] leading-relaxed text-slate-400">
            Update display name and portal config. Source key{" "}
            <span className="font-medium text-slate-200">
              {(editingSourceKey ?? "").toUpperCase()}
            </span>{" "}
            cannot be changed.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="edit-source-name" className="text-[11px] font-medium text-slate-400">
              Display name
            </label>
            <input
              id="edit-source-name"
              value={draftSourceName}
              onChange={(e) => setDraftSourceName(e.target.value)}
              className={fieldClassName}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-source-url" className="text-[11px] font-medium text-slate-400">
              URL <span className="text-rose-400">*</span>
            </label>
            <input
              id="edit-source-url"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://www.simplyhired.com/search?q=&l=USA"
              className={fieldClassName}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-source-api-url" className="text-[11px] font-medium text-slate-400">
              API URL
              <span className="font-normal text-slate-600"> (optional)</span>
            </label>
            <input
              id="edit-source-api-url"
              value={draftApiUrl}
              onChange={(e) => setDraftApiUrl(e.target.value)}
              className={fieldClassName}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-source-connector" className="text-[11px] font-medium text-slate-400">
              Scanner connector
            </label>
            <Select
              value={draftConnector || "generic"}
              onValueChange={(value) =>
                setDraftConnector((value as "ted" | "ungm" | "generic") || "generic")
              }
            >
              <SelectTrigger
                id="edit-source-connector"
                className={connectorTriggerClass}
                aria-label="Scanner connector"
              >
                <SelectValue placeholder="Generic (any site URL)" />
              </SelectTrigger>
              <SelectContent className={connectorContentClass}>
                {CONNECTOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className={connectorItemClass}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="edit-source-default-query" className="text-[11px] font-medium text-slate-400">
              Default query
              <span className="font-normal text-slate-600"> (optional)</span>
            </label>
            <input
              id="edit-source-default-query"
              value={draftDefaultQuery}
              onChange={(e) => setDraftDefaultQuery(e.target.value)}
              className={fieldClassName}
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditDialogOpen(false);
              setEditingSourceKey(null);
            }}
            className="text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={savingEdit || draftSourceName.trim() === "" || draftUrl.trim() === ""}
            onClick={() => void submitEditSource()}
            className="bg-indigo-500 text-white hover:bg-indigo-400"
          >
            {savingEdit ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const deleteSourceDialog = (
    <Dialog
      open={deleteDialogOpen}
      onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) setDeletingTargetKey(null);
      }}
    >
      <DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Delete source</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] leading-relaxed text-slate-400">
          Delete{" "}
          <span className="font-medium text-slate-200">
            {deletingSource?.name ?? deletingTargetKey ?? "this source"}
          </span>
          ? It will be removed from this agent. You can add the same source key again later to
          restore it.
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeletingTargetKey(null);
            }}
            className="text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!deletingTargetKey || deletingSourceKey === deletingTargetKey}
            onClick={() => void confirmDeleteSource()}
            className="bg-rose-600 text-white hover:bg-rose-500"
          >
            {deletingSourceKey === deletingTargetKey ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (!initialized && loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-xl border border-indigo-500/20 p-4 sm:p-5"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.02) 100%)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <p className="text-[13px] font-semibold text-white">Portal ingestion</p>
            <p className="mt-1 text-[12px] leading-relaxed text-indigo-200/75">
              Pull tenders from active portals, apply IDG country and category filters, then stage matches as{" "}
              <span className="font-medium text-white">Ingested</span> for qualification.
            </p>
          </div>
          <div className="shrink-0">
            {addSourceButton}
          </div>
        </div>
      </div>

      {addSourceDialog}
      {editSourceDialog}
      {deleteSourceDialog}

      {visibleSources.length === 0 ? (
        <SalesIntelEmptyState
          icon={Globe2}
          title="No ingestion sources configured"
          description="Add any portal source (TED, UNGM, or a custom key like ABC), enable it, then run a scan when a connector is available."
          steps={[
            "Add a source with a key and display name",
            "Enable the sources you want to monitor",
            "Run a scan on built-in portals (TED / UNGM)",
          ]}
          primaryAction={{
            label: "Add source",
            onClick: openAddDialog,
          }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleSources.map((source) => {
            const isToggling = togglingSourceKey === source.sourceKey;
            const isUpdatingCadence = updatingCadenceKey === source.sourceKey;
            const isScanningThis = scanning && scanningSourceKey === source.sourceKey;
            const isDeleting = deletingSourceKey === source.sourceKey;
            const scanDisabled =
              scanning || !source.isActive || !source.canScan || isToggling || isDeleting;

            return (
              <SourceCard
                key={source.id}
                source={source}
                isToggling={isToggling}
                isUpdatingCadence={isUpdatingCadence}
                isScanningThis={isScanningThis}
                scanDisabled={scanDisabled}
                isDeleting={isDeleting}
                onToggle={() => void toggleSource(source.sourceKey, !source.isActive)}
                onCadenceChange={(cadence) => void updateSourceCadence(source.sourceKey, cadence)}
                onScan={() =>
                  void runScan(source.sourceKey, {
                    ...scanOptions,
                    ...(!scanOptions.query && source.config?.defaultQuery
                      ? { query: source.config.defaultQuery }
                      : {}),
                  })
                }
                onDelete={() => openDeleteDialog(source)}
              />
            );
          })}
        </div>
      )}

      <section className="rounded-xl border border-white/[0.06] p-4 sm:p-5" style={{ background: "rgba(255,255,255,0.012)" }}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Ingest filters</h3>
          </div>
          {savingFilters ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving…
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FilterQueryKeyword
            id="filter-portal-query"
            enabled={queryEnabled}
            onEnabledChange={handleQueryEnabledChange}
            value={queryKeyword}
            onChange={setQueryKeyword}
          />
          <FilterToggle
            id="filter-all-countries"
            checked={allCountries}
            onCheckedChange={handleAllCountriesChange}
            icon={MapPin}
            title="All countries"
            description="Bypass the 14-country IDG target allowlist after the portal returns notices."
            activeHint="Any country will be accepted"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] ${
              trimmedQuery
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
                : "border-white/[0.08] bg-white/[0.03] text-slate-400"
            }`}
          >
            Query: <span className="text-slate-200">{trimmedQuery || "open"}</span>
            {!trimmedQuery ? <span className="text-slate-500"> (no keyword)</span> : null}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] ${
              allCountries
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200"
                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300/80"
            }`}
          >
            Countries: {allCountries ? "all" : "IDG allowlist"}
          </span>
        </div>
      </section>

      {SHOW_MANUAL_INGESTION_UI && (
        <div className="rounded-xl border border-white/[0.06] p-5" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="mb-4 flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-400" />
            <h3 className="text-[14px] font-semibold text-white">Manual Ingestion</h3>
          </div>
          <p className="text-[12px] text-slate-500">Manual upload is not yet available via API.</p>
        </div>
      )}
    </div>
  );
}
