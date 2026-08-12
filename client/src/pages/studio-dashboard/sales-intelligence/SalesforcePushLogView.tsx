import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  CloudUpload,
  Copy,
  ExternalLink,
  History,
  Info,
  Loader2,
  RefreshCw,
  Unplug,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SalesIntelEmptyState } from "./SalesIntelEmptyState";
import { buildSalesforceOpportunitiesListUrl, formatDate } from "./salesIntelUtils";
import { SALES_INTEL_PANEL_SOFT, SALES_INTEL_SECTION_TITLE } from "./salesIntelUi";
import { useSalesIntelData } from "./useSalesIntelData";
import type { SalesforcePushLogEntry } from "./salesIntelTypes";

const environmentTriggerClass =
  "h-auto min-w-[8.5rem] rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-normal text-slate-200 shadow-none hover:bg-white/[0.05] focus-visible:border-sky-500/40 focus-visible:ring-0 data-[size=default]:h-auto data-[size=sm]:h-auto [&_svg]:size-3.5 [&_svg]:text-slate-500";

const environmentContentClass =
  "z-[80] rounded-lg border border-white/[0.08] bg-[#121421] text-slate-200 shadow-xl shadow-black/50";

const environmentItemClass =
  "cursor-pointer rounded-md py-1.5 pl-2 pr-8 text-[11px] text-slate-300 focus:bg-sky-500/20 focus:text-sky-100 data-[highlighted]:bg-sky-500/20 data-[highlighted]:text-sky-100";

function StatusCell({ entry }: { entry: SalesforcePushLogEntry }) {
  if (entry.status === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Success
      </span>
    );
  }

  if (entry.status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        Failed
      </span>
    );
  }

  if (entry.status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        Warning
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300">
      <Info className="h-3.5 w-3.5" />
      Info
    </span>
  );
}

export default function SalesforcePushLogView({ agentId }: { agentId: string }) {
  const {
    pushLog,
    salesforce,
    loading,
    initialized,
    connectingSalesforce,
    disconnectingSalesforce,
    savingSalesforceCredentials,
    refresh,
    saveSalesforceCredentials,
    connectSalesforce,
    disconnectSalesforce,
  } = useSalesIntelData(agentId);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [environment, setEnvironment] = useState<"production" | "sandbox">(
    salesforce.loginBaseUrl?.includes("test.salesforce.com") ? "sandbox" : "production"
  );

  useEffect(() => {
    void refresh({ silent: true });
  }, [refresh]);

  useEffect(() => {
    setEnvironment(
      salesforce.loginBaseUrl?.includes("test.salesforce.com") ? "sandbox" : "production"
    );
  }, [salesforce.loginBaseUrl]);

  const lastErrorLower = salesforce.lastError?.toLowerCase() ?? "";
  const needsReconnect =
    !salesforce.connected &&
    (salesforce.status === "expired" ||
      lastErrorLower.includes("expired") ||
      lastErrorLower.includes("refresh"));

  const statusLabel = salesforce.connected
    ? "Connected to your Salesforce"
    : salesforce.status === "expired"
      ? "Expired — reconnect required"
      : salesforce.hasCredentials
        ? "Credentials saved — connect to authorize"
        : "Not connected";

  const helperText = salesforce.connected
    ? (salesforce.instanceUrl ?? "OAuth tokens stored for your account")
    : !salesforce.hasCredentials
      ? "Create a Connected App in your Salesforce org, paste the Qiko callback URL, then enter Consumer Key/Secret below."
      : needsReconnect
        ? "Access/refresh token is no longer valid. Click Reconnect to authorize Salesforce again."
        : "Click Connect to authorize Salesforce with your Connected App";

  const callbackUrl = salesforce.oauthCallbackUrl ?? "";
  const salesforceOpportunitiesUrl = buildSalesforceOpportunitiesListUrl(salesforce.instanceUrl);

  const copyCallbackUrl = async () => {
    if (!callbackUrl) {
      toast.error("Callback URL is not available yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(callbackUrl);
      toast.success("Callback URL copied.");
    } catch {
      toast.error("Could not copy callback URL.");
    }
  };

  const handleSaveCredentials = async () => {
    const trimmedId = clientId.trim();
    const trimmedSecret = clientSecret.trim();
    if (!trimmedId || !trimmedSecret) {
      toast.error("Enter both Consumer Key and Consumer Secret.");
      return;
    }

    const ok = await saveSalesforceCredentials({
      clientId: trimmedId,
      clientSecret: trimmedSecret,
      loginBaseUrl: environment,
    });
    if (ok) {
      setClientSecret("");
    }
  };

  if (!initialized && loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`space-y-4 px-4 py-3 ${SALES_INTEL_PANEL_SOFT}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className={SALES_INTEL_SECTION_TITLE}>Connect your Salesforce</p>
            <p className="mt-1 text-[13px] font-semibold text-white">{statusLabel}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{helperText}</p>
            {salesforce.lastError && (
              <p className="mt-1 text-[11px] text-red-300">{salesforce.lastError}</p>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {salesforce.connected && salesforceOpportunitiesUrl ? (
              <a
                href={salesforceOpportunitiesUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open recent Opportunities in your Salesforce org"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 text-[11px] font-semibold text-sky-100 hover:border-sky-400/50 hover:bg-sky-500/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Salesforce
              </a>
            ) : null}
            {salesforce.connected ? (
              <button
                type="button"
                onClick={() => void disconnectSalesforce()}
                disabled={disconnectingSalesforce}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 text-[11px] font-semibold text-slate-300 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50"
              >
                {disconnectingSalesforce ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5" />
                )}
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void connectSalesforce()}
                disabled={connectingSalesforce || !salesforce.configured}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sky-500 px-3 text-[11px] font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
              >
                {connectingSalesforce ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : salesforce.configured ? (
                  <CloudUpload className="h-3.5 w-3.5" />
                ) : (
                  <CloudOff className="h-3.5 w-3.5" />
                )}
                {needsReconnect ? "Reconnect Salesforce" : "Connect Salesforce"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void refresh({ silent: true })}
              disabled={loading}
              title="Reload connection status and activity logs. Does not renew Salesforce tokens."
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-slate-100 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Reload status
            </button>
          </div>
        </div>

        {salesforce.connected && salesforce.instanceUrl ? (
          <p className="truncate text-[10px] text-slate-500">
            Connected org:{" "}
            <span className="font-mono text-slate-400">{salesforce.instanceUrl}</span>
          </p>
        ) : null}

        {!salesforce.connected && (
          <div className="space-y-3 border-t border-white/10 pt-3">
            {!salesforce.hasCredentials ? (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-semibold text-white">
                      Salesforce credentials required
                    </h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                      Create a Connected App in your Salesforce org, then paste the values below so
                      Qiko can push approved opportunities into Salesforce.
                    </p>
                    <ol className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-slate-400">
                      <li>
                        <span className="font-semibold text-slate-200">1. Create a Connected App</span>
                        <br />
                        In Salesforce, open{" "}
                        <span className="text-slate-300">Setup → App Manager → New Connected App</span>
                        . Enable{" "}
                        <span className="text-slate-300">OAuth Settings</span> and allow these scopes:{" "}
                        <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[10px] text-sky-200">
                          api
                        </code>
                        ,{" "}
                        <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[10px] text-sky-200">
                          refresh_token
                        </code>
                        ,{" "}
                        <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[10px] text-sky-200">
                          offline_access
                        </code>
                        .
                      </li>
                      <li>
                        <span className="font-semibold text-slate-200">2. Callback URL</span>
                        <br />
                        Copy the Qiko callback URL below and paste it into the Connected App{" "}
                        <span className="text-slate-300">Callback URL</span> field. Save the app, then
                        wait a few minutes for Salesforce to activate it.
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <code className="min-w-0 flex-1 truncate rounded-md border border-sky-500/20 bg-black/30 px-2.5 py-2 font-mono text-[10px] text-slate-300">
                            {callbackUrl || "Loading…"}
                          </code>
                          <button
                            type="button"
                            onClick={() => void copyCallbackUrl()}
                            disabled={!callbackUrl}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-2 text-[10px] font-semibold text-sky-100 hover:bg-sky-500/20 disabled:opacity-50"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                      </li>
                      <li>
                        <span className="font-semibold text-slate-200">
                          3. Consumer Key &amp; Consumer Secret
                        </span>
                        <br />
                        Open the Connected App →{" "}
                        <span className="text-slate-300">Manage Consumer Details</span> (verify your
                        identity if asked). Copy the{" "}
                        <span className="text-slate-300">Consumer Key</span> and{" "}
                        <span className="text-slate-300">Consumer Secret</span>, paste them below, pick
                        Production or Sandbox, then Save credentials and Connect Salesforce.
                      </li>
                    </ol>
                    <a
                      href="https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm&type=5"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold text-sky-100 hover:border-sky-400/60 hover:bg-sky-500/20"
                    >
                      Open Salesforce Connected App help
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-[11px] font-semibold text-slate-300">Your Connected App credentials</p>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-[10px] text-slate-500">Consumer Key (Client ID)</span>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    autoComplete="off"
                    placeholder={salesforce.hasCredentials ? "Saved — enter to replace" : "Paste Consumer Key"}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-sky-500/50"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] text-slate-500">Consumer Secret</span>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    autoComplete="new-password"
                    placeholder={salesforce.hasCredentials ? "Saved — enter to replace" : "Paste Consumer Secret"}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-sky-500/50"
                  />
                </label>
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Environment</span>
                  <Select
                    value={environment}
                    onValueChange={(value) =>
                      setEnvironment(value as "production" | "sandbox")
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      className={environmentTriggerClass}
                      aria-label="Salesforce environment"
                    >
                      <SelectValue placeholder="Production" />
                    </SelectTrigger>
                    <SelectContent align="start" className={environmentContentClass}>
                      <SelectItem value="production" className={environmentItemClass}>
                        Production
                      </SelectItem>
                      <SelectItem value="sandbox" className={environmentItemClass}>
                        Sandbox
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveCredentials()}
                  disabled={savingSalesforceCredentials}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
                >
                  {savingSalesforceCredentials ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {salesforce.hasCredentials ? "Update credentials" : "Save credentials"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {pushLog.length === 0 ? (
        <SalesIntelEmptyState
          icon={History}
          title="No Salesforce activity yet"
          description="Save your Connected App credentials, connect Salesforce, and push validated opportunities — connect, disconnect, and push events are recorded here."
          steps={[
            "Paste the Qiko callback URL into your Salesforce Connected App",
            "Save Consumer Key/Secret here, then Connect",
            "Push approved tenders — they go to your Salesforce org",
          ]}
        />
      ) : (
        <>
          <p className="text-[11px] text-slate-500">
            Showing {pushLog.length} Salesforce event{pushLog.length === 1 ? "" : "s"}
          </p>

          <div className="space-y-2 md:hidden">
            {pushLog.map((entry) => (
              <article key={entry.id} className={`p-4 ${SALES_INTEL_PANEL_SOFT}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <StatusCell entry={entry} />
                  <span className="text-[10px] text-slate-500">{formatDate(entry.attemptedAt)}</span>
                </div>
                <p className="text-[11px] font-medium text-slate-200">{entry.action ?? "—"}</p>
                <p className="mt-1 line-clamp-2 text-[12px] text-white">{entry.opportunityTitle}</p>
                {entry.salesforceId ? (
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{entry.salesforceId}</p>
                ) : null}
                {(entry.errorMessage ?? entry.detail) ? (
                  <p
                    className={`mt-2 text-[10px] leading-relaxed ${
                      entry.status === "failed" ? "text-red-300/80" : "text-slate-400"
                    }`}
                  >
                    {entry.errorMessage ?? entry.detail}
                  </p>
                ) : null}
              </article>
            ))}
          </div>

          <div className={`hidden overflow-x-auto md:block ${SALES_INTEL_PANEL_SOFT}`}>
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Opportunity
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Salesforce ID
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Attempted
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Detail / Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {pushLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <StatusCell entry={entry} />
                    </td>
                    <td className="px-4 py-3 text-[11px] font-medium text-slate-200">
                      {entry.action ?? "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-[12px] text-white">{entry.opportunityTitle}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-400">
                      {entry.salesforceId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {formatDate(entry.attemptedAt)}
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      <p
                        className={`truncate text-[10px] ${
                          entry.status === "failed" ? "text-red-300/80" : "text-slate-400"
                        }`}
                        title={entry.errorMessage ?? entry.detail ?? ""}
                      >
                        {entry.errorMessage ?? entry.detail ?? "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
