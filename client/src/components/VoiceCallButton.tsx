import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import Vapi from "@vapi-ai/web";

interface VoiceCallButtonProps {
  assistantId: string;
  publicKey: string;
  workerName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  relevantLinks?: string[]; // URLs from training rules to share when AI mentions links
  onLinkShared?: (link: string) => void; // Callback when voice AI shares a link
}

type CallStatus = "idle" | "connecting" | "connected" | "ended";

// Phrases that indicate the AI is trying to share a link
const LINK_SHARING_PHRASES = [
  "share that link",
  "send you the link",
  "send that link",
  "share the link",
  "check the chat",
  "in the chat",
  "link in the chat",
  "shared that link",
  "shared the link",
  "booking link",
  "booking page",
  "calendly",
  "schedule a time",
  "book a time",
  "link available",
  "send you that",
  "share that with you",
];

// Helper to extract a human-readable message from Vapi error objects
const extractVapiErrorMessage = (error: any): string => {
  if (!error) return "Voice call error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.error?.message) return error.error.message;
  if (error.error?.statusMessage) return error.error.statusMessage;
  if (error.errorMessage) return error.errorMessage;
  if (error.msg) return error.msg;
  if (error.action === "meeting-left" || error.action === "left-meeting") return "Call session ended";
  try {
    const str = JSON.stringify(error);
    console.warn("[Vapi] Unstructured error object:", str);
  } catch { /* ignore */ }
  return "Voice call encountered an issue. Please try again.";
};

export default function VoiceCallButton({
  assistantId,
  publicKey,
  workerName = "AI Assistant",
  variant = "default",
  size = "default",
  className = "",
  relevantLinks = [],
  onLinkShared,
}: VoiceCallButtonProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    // Initialize Vapi client
    if (!vapiRef.current && publicKey) {
      vapiRef.current = new Vapi(publicKey);

      // Track shared links to avoid duplicates
      const sharedLinksSet = new Set<string>();

      // Set up event listeners
      vapiRef.current.on("call-start", () => {
        setCallStatus("connected");
        toast.success(`Connected to ${workerName}`);
      });

      vapiRef.current.on("call-end", () => {
        setCallStatus((prev) => {
          if (prev === "connected" || prev === "connecting") {
            setTimeout(() => toast.info("Call ended"), 100);
          }
          return "ended";
        });
        setTimeout(() => setCallStatus("idle"), 2000);
      });

      vapiRef.current.on("error", (error: any) => {
        const errorMsg = extractVapiErrorMessage(error);
        console.error("Vapi error:", JSON.stringify(error, null, 2));
        setCallStatus("idle");
        const isEjection = errorMsg.toLowerCase().includes("ejection") || 
                           errorMsg.toLowerCase().includes("meeting has ended") ||
                           errorMsg.toLowerCase().includes("call session ended");
        if (isEjection) {
          console.log("[Vapi] Call ended via ejection (normal teardown)");
        } else {
          toast.error(errorMsg);
        }
      });

      vapiRef.current.on("volume-level", (level: number) => {
        setVolumeLevel(level);
      });

      vapiRef.current.on("speech-start", () => {
        // AI is speaking
      });

      vapiRef.current.on("speech-end", () => {
        // AI finished speaking
      });

      // Listen for assistant transcript to detect link-sharing intent
      vapiRef.current.on("message", (message: any) => {
        try {
          // Method 1: Detect link-sharing phrases in transcript
          if (message.type === "transcript" && message.role === "assistant" && message.transcriptType === "final") {
            const transcript = (message.transcript || "").toLowerCase();
            const isSharingLink = LINK_SHARING_PHRASES.some(phrase => transcript.includes(phrase));
            
            if (isSharingLink && relevantLinks.length > 0) {
              relevantLinks.forEach((url) => {
                if (!sharedLinksSet.has(url)) {
                  sharedLinksSet.add(url);
                  if (onLinkShared) onLinkShared(url);
                  toast.info("Link shared in chat", { duration: 3000 });
                }
              });
            }
          }

          // Method 2: Check for VOICE_SHARE_LINK tags (backup)
          const content = message.transcript || message.content || "";
          const linkRegex = /\[VOICE_SHARE_LINK:\s*([^\]]+)\]/g;
          let match;
          while ((match = linkRegex.exec(content)) !== null) {
            const link = match[1].trim();
            if (!sharedLinksSet.has(link)) {
              sharedLinksSet.add(link);
              if (onLinkShared) onLinkShared(link);
              toast.info("Link shared in chat", { duration: 3000 });
            }
          }

          // Method 3: Check conversation-update for model output
          if (message.type === "conversation-update" && message.conversation) {
            const lastMsg = message.conversation[message.conversation.length - 1];
            if (lastMsg?.role === "assistant" && lastMsg?.content) {
              const tagRegex = /\[VOICE_SHARE_LINK:\s*([^\]]+)\]/g;
              let tagMatch;
              while ((tagMatch = tagRegex.exec(lastMsg.content)) !== null) {
                const url = tagMatch[1].trim();
                if (!sharedLinksSet.has(url)) {
                  sharedLinksSet.add(url);
                  if (onLinkShared) onLinkShared(url);
                }
              }
            }
          }
        } catch (err) {
          console.error("Error processing Vapi message:", err);
        }
      });
    }

    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (e) {
          console.log("[Vapi] Cleanup stop error (safe to ignore):", e);
        }
        vapiRef.current = null;
      }
    };
  }, [publicKey]);

  const startCall = async () => {
    if (!vapiRef.current) {
      toast.error("Voice client not initialized. Please check your Vapi keys in Settings.");
      return;
    }

    try {
      setCallStatus("connecting");
      await vapiRef.current.start(assistantId);
    } catch (error: any) {
      console.error("Failed to start call:", error);
      setCallStatus("idle");
      const msg = extractVapiErrorMessage(error);
      toast.error(msg || "Failed to start call. Please check microphone permissions.");
    }
  };

  const endCall = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch (e) {
        console.log("[Vapi] Stop error (safe to ignore):", e);
      }
      setCallStatus("idle");
    }
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      const newMuteState = !isMuted;
      vapiRef.current.setMuted(newMuteState);
      setIsMuted(newMuteState);
      toast.info(newMuteState ? "Microphone muted" : "Microphone unmuted");
    }
  };

  if (callStatus === "idle") {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={startCall}
        className={className}
      >
        <Phone className="h-4 w-4 mr-2" />
        Talk to {workerName}
      </Button>
    );
  }

  if (callStatus === "connecting") {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (callStatus === "connected") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Volume indicator */}
        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
          <Volume2 className="h-4 w-4 text-green-500" />
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-100"
              style={{ width: `${Math.min(volumeLevel * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Mute button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMute}
          className={isMuted ? "text-red-500 border-red-500" : ""}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        {/* End call button */}
        <Button variant="destructive" size={size} onClick={endCall}>
          <PhoneOff className="h-4 w-4 mr-2" />
          End Call
        </Button>
      </div>
    );
  }

  // ended state
  return (
    <Button variant={variant} size={size} disabled className={className}>
      <Phone className="h-4 w-4 mr-2" />
      Call Ended
    </Button>
  );
}
