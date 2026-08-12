import { appFetch } from "@/data/appFetch";
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ArrowLeft, Clock3, Loader2, Mail, Pause, Play, RotateCcw, User } from "lucide-react";
import SearchQueryForm from "@/components/dashboard/SearchQueryForm";
import DataNotFound from "@/components/ui/DataNotFound";
import { useAppSelector } from "@/store/hooks";
import ImportantMessageCard from "@/components/dashboard/ImportantMessageCard";
import { useLocation } from "wouter";

type VapiCallRole = "system" | "bot" | "user" | string;

export interface VapiCallMessage {
  role: VapiCallRole;
  message?: string;
  secondsFromStart?: number;
  time?: number;
}

export interface VapiCallItem {
  id: string;
  assistantId?: string;
  startedAt?: string;
  endedAt?: string;
  status?: string;
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  assistantOverrides?: {
    metadata?: {
      assistant_name?: string;
      caller_name?: string;
      caller_email?: string;
      caller_phone?: string;
      caller_number?: string;
    };
  };
  messages?: VapiCallMessage[];
}

export interface VapiCallHistoryResponse {
  success?: boolean;
  agentId?: string;
  count?: number;
  calls?: VapiCallItem[];
}

export interface CallHistoryWorkerProps {
  agentId: string;
  /** When used inside CRM header, hide the internal header area. */
  showHeader?: boolean;
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getSpeakerLabel(
  role: VapiCallRole,
  call: VapiCallItem,
  workerName?: string,
  agentId?: string
): string {
  if (role === "bot") {
    const assistantName = call?.assistantOverrides?.metadata?.assistant_name?.trim();
    if (assistantName) return assistantName;
    if (workerName?.trim()) return workerName.trim();
    if (agentId?.trim()) return agentId.trim();
    return "Agent";
  }
  if (role === "user") return getCallerName(call);
  if (role === "system") return "System";
  return role || "Unknown";
}

function getAudioUrl(call: VapiCallItem): string | undefined {
  return call.stereoRecordingUrl || call.recordingUrl;
}

function getCallerName(call: VapiCallItem): string {
  return call?.assistantOverrides?.metadata?.caller_name?.trim() || "Unknown";
}

function getCallerEmail(call: VapiCallItem): string {
  return call?.assistantOverrides?.metadata?.caller_email?.trim() || "Unknown";
}

function CallDetail({
  agentId,
  workerName,
  call,
}: {
  agentId: string;
  workerName?: string;
  call: VapiCallItem;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const audioUrl = getAudioUrl(call);
  const callerName = getCallerName(call);
  const callerEmail = getCallerEmail(call);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveBarCount, setWaveBarCount] = useState(96);

  const messages = useMemo(() => (Array.isArray(call.messages) ? call.messages : []), [call.messages]);
  const transcriptItems = useMemo(
    () =>
      messages
        .filter((m) => m.role !== "system")
        .map((m, idx) => ({
          key: `${call.id}-${idx}`,
          role: m.role,
          seconds: typeof m.secondsFromStart === "number" ? m.secondsFromStart : undefined,
          text: m.message ?? "",
        })),
    [messages, call.id]
  );
  const waveformBars = useMemo(
    () =>
      Array.from({ length: waveBarCount }, (_, i) => {
        const base = 7 + Math.abs(Math.sin(i * 0.7)) * 12;
        const shape = (i % 5) * 0.8;
        return Math.round(base + shape);
      }),
    [waveBarCount]
  );

  useEffect(() => {
    const updateBarCount = () => {
      const width = window.innerWidth;
      if (width < 640) setWaveBarCount(56);
      else if (width < 1024) setWaveBarCount(96);
      else setWaveBarCount(140);
    };
    updateBarCount();
    window.addEventListener("resize", updateBarCount, { passive: true });
    return () => window.removeEventListener("resize", updateBarCount);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleLoaded = () => setDuration(audio.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const handleSeek = (secondsFromStart?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (typeof secondsFromStart !== "number" || !Number.isFinite(secondsFromStart)) return;
    audio.currentTime = secondsFromStart;
    void audio.play().catch(() => {
      // Browser may block playback until user gesture.
    });
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const handleWaveformSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const waveformEl = waveformRef.current;
    if (!audio || !waveformEl || !duration) return;
    const rect = waveformEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, clickX / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const activeTranscriptIndex = useMemo(() => {
    if (!isPlaying || transcriptItems.length === 0) return -1;
    let active = -1;
    for (let i = 0; i < transcriptItems.length; i++) {
      const sec = transcriptItems[i].seconds;
      if (typeof sec === "number" && currentTime >= sec) active = i;
    }
    return active;
  }, [isPlaying, currentTime, transcriptItems]);

  const handleSegmentPlay = (secondsFromStart?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (typeof secondsFromStart === "number" && Number.isFinite(secondsFromStart)) {
      audio.currentTime = secondsFromStart;
      setCurrentTime(secondsFromStart);
    }
    void audio.play().catch(() => {
      // ignore browser autoplay restriction errors
    });
  };

  return (
    <Card className="p-4 bg-[#0a0f1a] border-white/[0.06] h-full overflow-hidden">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate">Caller Information</div>
        <div className="text-xs text-slate-400 mt-1">
          {/* Worker: <span className="font-mono text-[11px]">{agentId}</span> */}
          <div className="inline-flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Name: <strong>{callerName}</strong>
            </span>
          </div>
          <br />
          <div className="inline-flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Email: <strong>{callerEmail}</strong>
            </span>
          </div>

          {/* {call.assistantId ? (
            <>
              {" "}
              • Assistant: <span className="font-mono text-[11px]">{call.assistantId}</span>
            </>
          ) : null} */}
          {/* {call.status ? <> • Status: {call.status}</> : null} */}
        </div>
        {call.startedAt ? (
          <div className="text-xs text-slate-500 mt-1">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Started: <strong>{new Date(call.startedAt).toLocaleString("en-US", { hour12: false })}</strong>
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {audioUrl ? (
        <div className="mt-2 rounded-lg border border-cyan-400/25 bg-gradient-to-r from-[#173a6c] via-[#285791] to-[#224a81] p-1.5 shadow-[0_5px_14px_rgba(34,211,238,0.14)]">
          <audio ref={audioRef} className="hidden" src={audioUrl} preload="metadata" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={togglePlayback}
              className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
                isPlaying
                  ? "bg-gradient-to-br from-cyan-100 to-white text-[#1f4f8f] shadow-[0_0_20px_rgba(34,211,238,0.45)]"
                  : "bg-white/95 text-[#4d78b9] hover:bg-white"
              }`}
              aria-label={isPlaying ? "Pause recording" : "Play recording"}
            >
              {isPlaying && (
                <span className="absolute inset-0 rounded-full border border-cyan-200/70 animate-ping" />
              )}
              {isPlaying ? <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5" />}
            </button>

            <div className="flex-1 min-w-0">
              <div
                ref={waveformRef}
                onClick={handleWaveformSeek}
                className="relative h-6 sm:h-7 grid items-end gap-[2px] overflow-hidden cursor-pointer w-full"
                style={{ gridTemplateColumns: `repeat(${waveformBars.length}, minmax(0, 1fr))` }}
                title="Click to seek"
              >
                {waveformBars.map((barHeight, idx) => {
                  const progressRatio = duration > 0 ? currentTime / duration : 0;
                  const isActive = idx / waveformBars.length <= progressRatio;
                  const animatedHeight = isPlaying
                    ? Math.max(4, barHeight * 0.5 + Math.sin(currentTime * 8 + idx * 0.8) * 3)
                    : barHeight * 0.62;
                  return (
                    <div
                      key={`${call.id}-bar-${idx}`}
                      className={`w-full rounded-full transition-all duration-150 ${
                        isActive
                          ? "bg-gradient-to-t from-cyan-200 to-white shadow-[0_0_8px_rgba(255,255,255,0.35)]"
                          : "bg-white/35"
                      } ${isPlaying ? "animate-pulse" : ""}`}
                      style={{
                        height: `${animatedHeight}px`,
                        animationDelay: `${idx * 45}ms`,
                      }}
                    />
                  );
                })}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-cyan-100/80 shadow-[0_0_10px_rgba(255,255,255,0.6)] rounded-full pointer-events-none"
                  style={{ left: `${(duration > 0 ? (currentTime / duration) * 100 : 0).toFixed(2)}%` }}
                />
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[8px] sm:text-[9px] text-cyan-50/90 font-semibold">
                <span>{formatSeconds(currentTime)}</span>
                <span className="text-cyan-100/90">{formatSeconds(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-sm text-amber-400">Audio not available for this call.</div>
      )}

      <div className="mt-4 flex-1 min-h-0 overflow-hidden">
        <div className="text-xs font-medium text-slate-300 mb-2">Transcript</div>

        {transcriptItems.length > 0 ? (
          <div className="space-y-2 overflow-y-auto pr-2">
            {transcriptItems.map((item, idx) => {
              const speaker = getSpeakerLabel(item.role, call, workerName, agentId);
              const seconds = item.seconds;
              const text = item.text;
              const isActiveSegment = idx === activeTranscriptIndex;
              return (
                <div
                  key={item.key}
                  className={`w-full text-left rounded-lg border px-2.5 sm:px-3 py-2 transition-all ${
                    isActiveSegment
                      ? "border-cyan-300/40 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
                      : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`text-[12px] font-medium ${isActiveSegment ? "text-cyan-200" : "text-slate-200"}`}>
                      {speaker}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {seconds != null ? (
                        <div className={`text-[11px] font-mono ${isActiveSegment ? "text-cyan-200/90" : "text-slate-500"}`}>
                          {formatSeconds(seconds)}
                        </div>
                      ) : null}
                      {/*
                        Single toggle icon per transcript segment:
                        - Shows Pause when this segment is the active playing segment
                        - Shows Play otherwise
                      */}
                      {(() => {
                        const isSegmentPlaying = isActiveSegment && isPlaying;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (isSegmentPlaying) {
                                const audio = audioRef.current;
                                if (audio) audio.pause();
                              } else {
                                handleSegmentPlay(seconds);
                              }
                            }}
                            disabled={!audioUrl}
                            className="w-6 h-6 rounded-md border border-white/15 bg-white/10 hover:bg-white/20 text-slate-100 inline-flex items-center justify-center disabled:opacity-50"
                            aria-label={isSegmentPlaying
                              ? "Pause audio"
                              : `Play from ${seconds != null ? formatSeconds(seconds) : "current point"}`}
                          >
                            {isSegmentPlaying ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3 ml-[1px]" />
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                  {text ? (
                    <button
                      type="button"
                      className={`w-full text-left text-sm mt-1 whitespace-pre-wrap break-words ${
                        isActiveSegment ? "text-cyan-50" : "text-slate-100"
                      }`}
                      onClick={() => handleSeek(seconds)}
                      disabled={seconds == null || !audioUrl}
                      aria-label={`Seek to ${speaker} ${seconds ?? ""}`}
                    >
                      {text}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-slate-500">No transcript found for this call.</div>
        )}
      </div>
    </Card>
  );
}

export default function CallHistoryWorker({ agentId, showHeader = true }: CallHistoryWorkerProps) {
  const [, setLocation] = useLocation();
  const selectedAgent = useAppSelector((state) => state.avatar.selectedAgent);
  const selectedAgentWorkerName = useMemo(() => {
    if (!selectedAgent) return "";
    if (selectedAgent.agent_id && agentId && selectedAgent.agent_id !== agentId) return "";
    return (
      selectedAgent.fullName?.trim() ||
      selectedAgent.full_name?.trim() ||
      selectedAgent.name?.trim() ||
      ""
    );
  }, [selectedAgent, agentId]);
  const shouldShowAddVapiKeyCta = selectedAgent?.vapi_credentials_added === false;

  const [calls, setCalls] = useState<VapiCallItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [selectedCallId, setSelectedCallId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const isVapiConfigError = (error || "").toLowerCase().includes("vapi api key required");
  const isNoCallHistoryState = /failed to fetch (vapi )?call history/i.test(error || "");

  useEffect(() => {
    if (!agentId) return;

    let cancelled = false;
    const controller = new AbortController();

    const fetchCallHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
        if (!BASE_URL) throw new Error("Missing VITE_API_BASE_URL");

        const token = localStorage.getItem("qiko_session_token");
        const res = await appFetch(
          `${BASE_URL}/voice/${encodeURIComponent(agentId)}/vapi-call-history`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          }
        );

        const data = (await res.json().catch(() => ({}))) as VapiCallHistoryResponse;
        // if (!res.ok) {
        //   throw new Error((data as { message?: string })?.message || "Failed to fetch call history");
        // }

        if (!res.ok) {
          const errorMsg = (data as { message?: string; error?: string }).message
            || (data as { message?: string; error?: string }).error
            || "Failed to fetch call history";
          throw new Error(errorMsg);
        }

        const nextCalls = Array.isArray(data.calls) ? data.calls : [];
        if (!cancelled) setCalls(nextCalls);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to fetch call history");
        setCalls([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCallHistory();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [agentId, refreshIndex]);

  useEffect(() => {
    if (calls.length === 0) return;
    if (selectedCallId && calls.some((c) => c.id === selectedCallId)) return;
    setSelectedCallId(calls[0]?.id ?? "");
  }, [calls, selectedCallId]);

  const selectedCall = useMemo(
    () => (selectedCallId ? calls.find((c) => c.id === selectedCallId) : undefined),
    [calls, selectedCallId]
  );

  const filteredCalls = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter((call) => {
      const name = call?.assistantOverrides?.metadata?.caller_name?.toLowerCase() ?? "";
      const email = call?.assistantOverrides?.metadata?.caller_email?.toLowerCase() ?? "";
      const phone =
        call?.assistantOverrides?.metadata?.caller_phone?.toLowerCase() ??
        call?.assistantOverrides?.metadata?.caller_number?.toLowerCase() ??
        "";
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [calls, searchQuery]);

  useEffect(() => {
    if (filteredCalls.length === 0) {
      setSelectedCallId("");
      setMobileView("list");
      return;
    }
    if (!selectedCallId || !filteredCalls.some((c) => c.id === selectedCallId)) {
      setSelectedCallId(filteredCalls[0].id);
    }
  }, [filteredCalls, selectedCallId]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0f1a]">
      {showHeader ? (
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">Call History</div>
            <div className="text-xs text-slate-400 mt-1">
              Fetching Vapi calls for <span className="font-mono text-[11px]">{agentId}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-slate-200 hover:bg-white/[0.08]"
            onClick={() => setRefreshIndex((v) => v + 1)}
            disabled={loading || !agentId}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-hidden p-4">
        {loading ? (
          <div className="mt-2 flex items-center gap-2 text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading calls...</span>
          </div>
        ) : error ? (
          <ImportantMessageCard
            title={isNoCallHistoryState ? "No call history yet" : "Unable to load call history"}
            message={
              isNoCallHistoryState
                ? "No calls have been recorded yet. Your first calls will appear here."
                : error
            }
            maxWidthClassName="max-w-[920px]"
            ctaLabel={shouldShowAddVapiKeyCta ? "Add VAPI Key" : undefined}
            ctaOnClick={shouldShowAddVapiKeyCta ? () => setLocation("voice?chat_status=training") : undefined}
          />
        ) : calls.length === 0 ? (
          <div className="text-sm text-slate-400">No calls found.</div>
        ) : (
          <div className="h-full grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 overflow-hidden">
            <div
              className={`${
                mobileView === "detail" ? "hidden md:block" : "block"
              } overflow-y-auto pr-2 md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-180px)]`}
            >
              <div className="text-xs font-medium text-slate-300 mb-2">{filteredCalls?.length} Calls </div>
              <div className="mb-3 px-1">
              <SearchQueryForm
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search caller information..."
              />
              </div>
              <div className="space-y-2">
                {filteredCalls.map((call) => {
                  const isActive = call.id === selectedCallId;
                  const audioUrl = getAudioUrl(call);
                  return (
                    <button
                      key={call.id}
                      type="button"
                      onClick={() => {
                        setSelectedCallId(call.id);
                        setMobileView("detail");
                      }}
                      className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                        isActive
                          ? "border-white/[0.14] bg-white/[0.06]"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[12px] font-medium text-white truncate">
                          <div className="inline-flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Name: <strong>{call?.assistantOverrides?.metadata?.caller_name ?? "Unknown"}</strong>
                            </span>
                          </div>
                          <br />
                          <div className="inline-flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Email: <strong>{getCallerEmail(call)}</strong>
                            </span>
                          </div>
                        </div>
                        {call.status ? (
                          <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 shrink-0 ml-2">
                            <Activity className="w-3 h-3" />
                            <span>{call.status}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {call.startedAt ? (
                          <span className="inline-flex items-center gap-1.5 font-mono">
                            <Clock3 className="w-3 h-3 text-slate-500" />
                            {new Date(call.startedAt).toLocaleString("en-US", { hour12: false })}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                        {/* {call.assistantId ? (
                          <>
                            {" "}
                            • <span className="font-mono">{call.assistantId}</span>
                          </>
                        ) : null} */}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {audioUrl ? "Audio ready" : "Audio missing"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`${mobileView === "list" ? "hidden md:block" : "block"} overflow-y-auto`}>
              {selectedCall ? (
                <>
                  <div className="md:hidden mb-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-slate-300 hover:bg-white/[0.08]"
                      onClick={() => setMobileView("list")}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1.5" />
                      Back
                    </Button>
                  </div>
                  <CallDetail
                    agentId={agentId}
                    workerName={selectedAgentWorkerName}
                    call={selectedCall}
                  />
                </>
              ) : (
                <DataNotFound message="Select a call to view details." />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

