"use client";

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Loader2, Save, Clock, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  updateCalendlyEventType,
  syncVapiCalendlyTools,
  getCalendlyUserMe,
  getCalendlyEventTypes,
  type CalendlyEventTypesResponse,
} from "@/lib/avatarApi";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { decryptCalendlyCredentials } from "@/lib/laravelDecrypt";
import WithPermission from "@/_core/components/WithPermission";

const CALENDLY_TOKEN_STORAGE_KEY = "qiko_calendly_token";

function getCalendlyTokenFromReduxOrStorage(storedToken: string | null): string | null {
  const t = (storedToken ?? "").trim();
  if (t) return t;
  if (typeof window !== "undefined") {
    const fromStorage = localStorage.getItem(CALENDLY_TOKEN_STORAGE_KEY);
    return fromStorage?.trim() || null;
  }
  return null;
}

interface CalendlyViewProps {
  worker: {
    agent_id?: string;
    id?: string | number;
    calendly_event_type?: string | null;
  };
  onUpdate?: () => void;
}

export default function CalendlyView({ worker, onUpdate }: CalendlyViewProps) {
  const agentId = worker?.agent_id ?? (worker?.id != null ? String(worker.id) : undefined);
  const storedToken = useAppSelector((state) => state.auth.calendlyToken);
  const calendlyToken = getCalendlyTokenFromReduxOrStorage(storedToken);
  const hasCalendlyToken = !!calendlyToken;
  const agents = useAppSelector((state) => state.avatar.agents);
  const currentAgent = agents.find(
    (a) => a.agent_unique_id === agentId || a.id === agentId
  );
  const savedCalendlyEventType =
    (currentAgent?.calendly_event_type ?? worker.calendly_event_type)?.trim() ?? "";
  const [calendlyEventType, setCalendlyEventType] = useState("");
  const [saving, setSaving] = useState(false);
  const [calendlyUserUri, setCalendlyUserUri] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<CalendlyEventTypesResponse | null>(null);
  const [selectedEventTypeUri, setSelectedEventTypeUri] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleConnectCalendly = async () => {
    const token = getCalendlyTokenFromReduxOrStorage(storedToken);
    if (!token) {
      toast.error("Please save a Calendly token first");
      return;
    }

    const decryptKey = import.meta.env.VITE_LARAVEL_DECRYPT_KEY as string | undefined;
    let usableToken = token;
    if (decryptKey) {
      try {
        const res = await decryptCalendlyCredentials({ calendly_token: token }, decryptKey);
        usableToken = res.calendly_token || token;
      } catch (err) {
        console.error("[CalendlyView] Failed to decrypt Calendly token:", err);
      }
    }

    setConnecting(true);
    try {
      const data = await getCalendlyUserMe(usableToken);
      const uri = data?.resource?.uri ?? null;
      setCalendlyUserUri(uri);
      if (uri) {
        const eventTypesData = await getCalendlyEventTypes(usableToken, uri);
        setEventTypes(eventTypesData);
        // If we already have a saved event type, reflect it; otherwise let the user choose
        if (savedCalendlyEventType && eventTypesData.collection?.length) {
          const match = eventTypesData.collection.find(
            (et) =>
              et?.uri === savedCalendlyEventType ||
              et?.scheduling_url === savedCalendlyEventType,
          );
          const matchUri = match?.uri ?? null;
          setSelectedEventTypeUri(matchUri);
          setCalendlyEventType(savedCalendlyEventType);
        } else {
          setSelectedEventTypeUri(null);
          setCalendlyEventType("");
        }
        toast.success("Calendly connected");
      } else {
        setEventTypes(null);
        setSelectedEventTypeUri(null);
        toast.info("No user URI in response");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to Calendly";
      toast.error(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    const url = calendlyEventType.trim();
    if (!url) {
      toast.error("Please enter a Calendly event type URL");
      return;
    }
    if (!agentId) {
      toast.error("Worker not ready for Calendly");
      return;
    }
    setSaving(true);
    try {
      await updateCalendlyEventType(agentId, { calendly_event_type: url });
      await syncVapiCalendlyTools(agentId);
      toast.success("Calendly event type saved");
      onUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!agentId) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-6">
          <p className="text-slate-400 text-sm">Worker not loaded. Select a worker to configure Calendly.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Calendar className="w-5 h-5 text-emerald-400" />
          Calendly event type
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {savedCalendlyEventType && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2">
            <Lock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <Label className="text-xs text-slate-400">Selected Calendly event</Label>
              <p className="text-xs text-slate-200 font-mono mt-1 break-all">
                {savedCalendlyEventType}
              </p>
            </div>
          </div>
        )}
        {!hasCalendlyToken ? (<>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white mb-1">Calendly token required</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Add your Calendly token in settings, then come back here to connect and select an event.
                </p>
                <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>
                    Go to <span className="px-1">App Settings</span>
                  </li>
                  <li>Add Calendly token</li>
                  <li>
                    Return here and click <b>Connect Calendly</b>
                  </li>
                </ol>
              </div>
            </div>
          </div>
          <WithPermission>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/app/settings">
                Add Calendly token <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </WithPermission>
          </>
        ) : (<>
          <WithPermission>
            <Button
              type="button"
              onClick={handleConnectCalendly}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              {savedCalendlyEventType ? "Change Calendly event" : "Connect Calendly"}
            </Button>
          </WithPermission>
        </>)}
        {calendlyUserUri && (
          <div className="space-y-3">
            {/* <div>
              <Label className="text-sm text-slate-400">User URI</Label>
              <p className="text-sm text-white font-mono mt-1 break-all">{calendlyUserUri}</p>
            </div> */}
            {eventTypes?.collection && eventTypes.collection.length > 0 && (
              <div>
                <Label className="text-sm text-slate-400 mb-2 block">Choose an event type</Label>
                <RadioGroup
                  value={selectedEventTypeUri ?? ""}
                  onValueChange={(value) => {
                    setSelectedEventTypeUri(value);
                    const et = eventTypes.collection?.find((e) => e.uri === value);
                    const url = et?.uri ?? et?.uri ?? value;
                    setCalendlyEventType(url ?? "");
                  }}
                  className="grid gap-2"
                >
                  {eventTypes.collection.map((et) => {
                    const eventUri = et?.uri ?? "";
                    const schedulingUrl = et?.scheduling_url ?? "";
                    const duration = (et as { duration?: number })?.duration;
                    const isSelected = selectedEventTypeUri === eventUri;
                    const isSaved =
                      !!savedCalendlyEventType &&
                      (savedCalendlyEventType === eventUri || savedCalendlyEventType === schedulingUrl);
                    
                    return (
                      <label
                        key={eventUri}
                        htmlFor={`event-type-${eventUri}`}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                          isSelected
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                        )}
                      >
                        <RadioGroupItem
                          value={eventUri}
                          id={`event-type-${eventUri}`}
                          disabled={isSaved}
                          className={cn(
                            "mt-0.5 border-white/20 text-emerald-500",
                            isSaved && "opacity-60 cursor-not-allowed"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white">{et?.name ?? "Unnamed"}</span>
                            {isSaved && (
                              <span title="Saved for this worker">
                                <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              </span>
                            )}
                            {duration != null && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="h-3 w-3" />
                                {duration} min
                              </span>
                            )}
                          </div>
                          {et?.scheduling_url && (
                            <p className="text-xs text-slate-500 truncate mt-0.5" title={et.scheduling_url}>
                              {et.scheduling_url}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
                {selectedEventTypeUri && (
                  <Button
                    onClick={handleSave}
                    disabled={saving || !calendlyEventType.trim()}
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
