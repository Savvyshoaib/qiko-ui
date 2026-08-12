"use client";

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getWebCallConfig, type AvatarAgentDetail } from "@/lib/avatarApi";
import { decryptLaravel } from "@/lib/laravelDecrypt";
import { useAppSelector } from "@/store/hooks";

// Vapi Web SDK – joins the call in-page so the user is not removed (unlike opening the raw Daily URL in an iframe)
import Vapi from "@vapi-ai/web";

interface WorkerCallViewProps {
  workerId: string;
  worker?: AvatarAgentDetail | null;
  /** When provided, called instead of navigating on back/end call (e.g. for public chat overlay) */
  onBack?: () => void;
}

export default function WorkerCallView({ workerId, worker, onBack }: WorkerCallViewProps) {
  const [, setLocation] = useLocation();
  const userInfo = useAppSelector((state) => state.auth.userInfo);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [micPermission, setMicPermission] = useState<"unknown" | "requesting" | "granted" | "denied">("unknown");
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null);

  const agentId = worker?.agent_id || workerId;
  const displayName = worker?.agent_name || worker?.name || "Worker";

  // Cleanup Vapi on unmount
  useEffect(() => {
    return () => {
      const vapi = vapiRef.current;
      if (vapi) {
        try {
          vapi.stop();
        } catch (_) {}
        vapiRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const permissionsApi = navigator.permissions;
    if (!permissionsApi?.query) return;

    let cancelled = false;
    permissionsApi
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        if (result.state === "granted") setMicPermission("granted");
        else if (result.state === "denied") setMicPermission("denied");
        else setMicPermission("unknown");
      })
      .catch(() => {
        // Ignore browsers where microphone permission cannot be queried.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartCall = async () => {
    if (!agentId) {
      toast.error("Worker not ready for voice");
      return;
    }
    setError(null);
    setMicPermission("requesting");
    setStatus("connecting");
    try {
      const config = await getWebCallConfig(agentId);
      const rawAssistantId = config?.voice?.assistantId;
      const rawVapiPublicKey = config?.voice?.vapiPublicKey;

      if (!rawAssistantId) {
        throw new Error("Voice config missing assistant ID");
      }
      if (!rawVapiPublicKey) {
        throw new Error("Voice config missing Vapi public key. Contact support to enable in-app calls.");
      }

      const decryptKey = import.meta.env.VITE_LARAVEL_DECRYPT_KEY as string | undefined;

      let assistantId = rawAssistantId;
      let vapiPublicKey = rawVapiPublicKey;

      if (decryptKey) {
        try {
          assistantId = await decryptLaravel(rawAssistantId, decryptKey);
          console.log("assistantId", assistantId);
          console.log("rawAssistantId", rawAssistantId);
        } catch (err) {
          console.error("Failed to decrypt assistantId for WorkerCallView:", err);
          assistantId = rawAssistantId;
        }

        try {
          vapiPublicKey = await decryptLaravel(rawVapiPublicKey, decryptKey);
        } catch (err) {
          console.error("Failed to decrypt vapiPublicKey for WorkerCallView:", err);
          vapiPublicKey = rawVapiPublicKey;
        }
      }

      const vapi = new Vapi(vapiPublicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setStatus("connected");
        setMicPermission("granted");
        toast.success("You’re in the call — talk and listen");
      });
      vapi.on("call-end", () => {
        setStatus("ended");
        setIsAssistantSpeaking(false);
        vapiRef.current = null;
      });
      vapi.on("speech-start", () => setIsAssistantSpeaking(true));
      vapi.on("speech-end", () => setIsAssistantSpeaking(false));
      vapi.on("error", (e: unknown) => {
        // console.log("Vapi error:", );
        const erorrMsg = (e as any).error.message.message || "Connection failed. Verify network and credentials.";
        toast.error(erorrMsg);
      });

      // const callerEmail = userInfo?.email;

      await vapi.start(assistantId, {
        variableValues: {
          caller_name: userInfo?.user_name || userInfo?.name || undefined,
          caller_email: userInfo?.email || undefined,
        },
        metadata: {
          caller_name: userInfo?.user_name || userInfo?.name || undefined,
          caller_email: userInfo?.email || undefined,
        },
      });
    } catch (err) {
      setStatus("idle");
      vapiRef.current = null;
      const msg = err instanceof Error ? err.message : "Failed to start call";
      if (/notallowed|permission|microphone/i.test(msg)) {
        setMicPermission("denied");
      }
      setError(msg);
      toast.error(msg);
    }
  };

  const handleEndCall = () => {
    const vapi = vapiRef.current;
    if (vapi) {
      try {
        vapi.stop();
      } catch (_) {}
      vapiRef.current = null;
    }
    setStatus("ended");
    toast.info("Call ended");
    if (onBack) onBack();
    else setLocation(`/app/workers/${workerId}`);
  };

  const handleBack = () => {
    if (onBack) onBack();
    else setLocation(workerId ? `/app/workers/${workerId}` : "/app/workers");
  };

  const handleAskPermissionAgain = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error("Microphone access is not supported in this browser");
      return;
    }

    // Browser permissions cannot be programmatically reset once blocked.
    // Help the user jump to browser settings and then retry.
    if (micPermission === "denied") {
      setMicPermission("unknown");
      setError("Microphone is blocked. Reset microphone permission in browser settings, then try again.");
      window.open(
        "https://support.google.com/chrome/answer/2693767",
        "_blank",
        "noopener,noreferrer"
      );
      toast.info("Open browser settings and allow microphone, then click again.");
      return;
    }

    setMicPermission("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission("granted");
      setError(null);
      toast.success("Microphone permission granted");
    } catch (err) {
      setMicPermission("denied");
      toast.error("Microphone permission is still blocked");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[400px] bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/30">
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/5 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="text-slate-400 hover:text-white gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
        
        {/* In-call: show status and end button (audio is in-page via SDK) */}
        {status === "connected" ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-indigo-500/20 mb-6">
              {(displayName || "W").charAt(0).toUpperCase()}
            </div>
            <h1 className="text-xl font-semibold text-white mb-1">{displayName}</h1>
            <p className="text-slate-400 text-sm mb-6">
              {isAssistantSpeaking ? "Assistant speaking…" : "Listening…"}
            </p>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-emerald-400">In call</span>
            </div>
            <Button
              size="lg"
              variant="destructive"
              onClick={handleEndCall}
              className="rounded-full px-8 gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              End call
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-indigo-500/20 mb-6">
              {(displayName || "W").charAt(0).toUpperCase()}
            </div>
            <h1 className="text-xl font-semibold text-white mb-1">{displayName}</h1>
            <p className="text-slate-400 text-sm mb-6">Voice call</p>

            {error && (
              <p className="text-red-400 text-sm mb-4 max-w-md text-center">{error}</p>
            )}

            <div className="mb-8 min-h-[2rem]">
              {status === "connecting" && (
                <span className="inline-flex items-center gap-2 text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting…
                </span>
              )}
              {status === "ended" && (
                <span className="text-slate-400">Call ended</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {status === "idle" && (
                <Button
                  size="lg"
                  onClick={handleStartCall}
                  className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-full px-8 gap-2 shadow-lg shadow-indigo-500/25"
                >
                  <Phone className="w-5 h-5" />
                  Start call
                </Button>
              )}
              {status === "connecting" && (
                <Button size="lg" variant="secondary" disabled className="rounded-full px-8 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting…
                </Button>
              )}
              {status === "ended" && (
                <>
                
                <Button size="lg" variant="outline" onClick={handleBack} className="rounded-full px-8 gap-2">
                    <ArrowLeft className="w-5 h-5" />
                    Back to worker
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleStartCall}
                    className="bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-full px-8 gap-2 shadow-lg shadow-indigo-500/25"
                  >
                    <Phone className="w-5 h-5" />
                    Call again
                  </Button>
                </>
              )}
            </div>

            <p className="text-slate-500 text-xs mt-8 max-w-sm text-center">
              Start a voice conversation with this worker. Allow your microphone when prompted.
            </p>
            <p
              className={`text-[11px] mt-2 max-w-sm text-center ${
                micPermission === "granted"
                  ? "text-emerald-400"
                  : micPermission === "denied"
                  ? "text-rose-400"
                  : "text-slate-500"
              }`}
            >
              Microphone permission:{" "}
              {micPermission === "granted"
                ? "Allowed"
                : micPermission === "denied"
                ? "Blocked"
                : micPermission === "requesting"
                ? "Requesting..."
                : "Not requested"}
            </p>
            {(micPermission === "denied" || micPermission === "unknown") && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAskPermissionAgain}
                className="mt-3 rounded-full border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
              >
                Update Permission
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
