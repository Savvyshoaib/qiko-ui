import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, UploadCloud, FileSpreadsheet, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useFinancialData } from "@/features/financial/useFinancialData";

interface WorkerFinancialDataTabProps {
  workerId: string;
}

export default function WorkerFinancialDataTab({ workerId }: WorkerFinancialDataTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const { state, meta, loading, error, processFile, history } = useFinancialData(workerId, { autoLoad: false });

  const accept = ".csv,.xlsx,.xls";
  const effectiveError = localError || error;
  const uploadResponse = (state?.apiResponse as { upload?: Record<string, unknown> } | null)?.upload;

  const statusBadge = useMemo(() => {
    if (!meta) return null;
    if (meta.status === "error") return <span className="text-xs text-red-400">Error</span>;
    if (meta.status === "processing") return <span className="text-xs text-amber-400">Processing</span>;
    return <span className="text-xs text-emerald-400">Ready</span>;
  }, [meta]);

  const onProcess = async () => {
    setLocalError(null);
    if (!file) {
      setLocalError("Please choose a CSV, XLSX, or XLS file.");
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setLocalError("Invalid file type. Only .csv, .xlsx, and .xls are allowed.");
      return;
    }
    try {
      const result = await processFile(file, workerId);
      if (result.analyticsLoaded) {
        toast.success("Financial workbook uploaded and indexed.");
      } else {
        toast.success("File uploaded successfully. Dashboard data will appear once analytics are ready.");
      }
      setFile(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Processing failed.";
      setLocalError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl space-y-5">
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-5">
          <div className="flex items-center gap-3 mb-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Financial Data</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Upload a financial spreadsheet (.csv or .xlsx). The workbook structure is preserved sheet-by-sheet and
            analyzed to populate the Financial Analyst dashboard in Studio.
          </p>

          <div className="flex flex-col gap-3">
            <div className="w-full bg-[#060a14] border border-white/10 rounded-xl px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Agent Unique ID</p>
              <p className="text-sm text-slate-200 break-all">{workerId}</p>
            </div>
            <input
              type="file"
              accept={accept}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-4 file:py-2 file:text-cyan-300 hover:file:bg-cyan-500/25"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={onProcess}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {loading ? "Processing..." : "Upload / Process"}
              </button>
              {meta && (
                <button
                  onClick={() => {
                    setFile(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-upload / Replace
                </button>
              )}
            </div>
          </div>
        </div>

        {effectiveError && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{effectiveError}</span>
          </div>
        )}

        {meta && (
          <div className="rounded-2xl border border-white/10 bg-[#0a0f1a] p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Latest Upload</h3>
              {statusBadge}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">File Name</p>
                <p className="text-slate-200">{meta.fileName}</p>
              </div>
              <div>
                <p className="text-slate-500">Uploaded</p>
                <p className="text-slate-200">{new Date(meta.uploadedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Type</p>
                <p className="text-slate-200 uppercase">{meta.fileType}</p>
              </div>
              <div>
                <p className="text-slate-500">Warnings</p>
                <p className="text-slate-200">{meta.warningCount}</p>
              </div>
              <div>
                <p className="text-slate-500">Source</p>
                <p className="text-slate-200">API</p>
              </div>
              <div>
                <p className="text-slate-500">Previous Versions</p>
                <p className="text-slate-200">{history.length}</p>
              </div>
            </div>
            {uploadResponse && (
              <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <p className="text-xs font-semibold text-emerald-300 mb-2">Upload API Success Response</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Agent Unique ID</p>
                    <p className="text-slate-200">{String(uploadResponse.agent_unique_id ?? uploadResponse.email ?? "-")}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Source Name</p>
                    <p className="text-slate-200">{String(uploadResponse.sourceName ?? "-")}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Namespace</p>
                    <p className="text-slate-200 break-all">{String(uploadResponse.namespace ?? "-")}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Records Stored</p>
                    <p className="text-slate-200">{String(uploadResponse.recordsStored ?? "-")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
