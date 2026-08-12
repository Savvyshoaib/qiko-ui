import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { acceptTeamInvite } from "@/lib/TeamApi";
import SetPasswordForm from "@/components/team/SetPasswordForm";

export default function AcceptInvite() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing your invite...");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteToken, setInviteToken] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      if (typeof window === "undefined") return;

      const url = new URL(window.location.href);
      const token = url.searchParams.get("token") ?? "";
      if (!token) {
        setStatus("error");
        setMessage("Invalid invite link: missing token.");
        return;
      }
      setInviteToken(token);

      // Remove token from URL immediately after reading it.
      window.history.replaceState({}, "", "/team/invite/accept");

      try {
        const res = await acceptTeamInvite(token);
        setStatus("success");
        setInviteStatus(res.data?.invite_status ?? null);
        setInviteEmail(res.data?.email ?? "");
        setMessage(res.message || "Invite accepted successfully. Your team member status is now active.");
        toast.success(res.message || "Invite accepted");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to accept invite";
        setStatus("error");
        setMessage(errorMessage);
        toast.error(errorMessage);
      }
    };

    run();
  }, []);

  const statusTitle =
    status === "loading"
      ? "Processing invite"
      : status === "success"
        ? "Invite accepted"
        : "Invite Link Expired";

  const statusDescription =
    status === "loading"
      ? "Please wait while we validate your invite link."
      : status === "error"
        ? "This team invite is no longer valid."
        : message;

  const errorMessage =
    "Your invite link may have expired or already been used. Please ask your team admin to send you a new invite.";

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent>
            {status === "success" && inviteStatus === "accepted" ? (
              <SetPasswordForm token={inviteToken} />
            ) : (
              <div className="px-6 py-8 text-center">
                <div
                  className={`mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full shadow-[0_0_24px_rgba(59,130,246,0.15)] ${
                    status === "loading"
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600"
                      : status === "success"
                        ? "bg-gradient-to-br from-emerald-500 to-lime-500"
                        : "bg-gradient-to-br from-rose-500 to-amber-500"
                  }`}
                >
                  {status === "loading" ? (
                    <Loader2 className="h-10 w-10 animate-spin text-white" />
                  ) : status === "success" ? (
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  ) : (
                    <XCircle className="h-10 w-10 text-white" />
                  )}
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-rose-50">{statusTitle}</h3>
                <p className="mx-auto mt-3 max-w-sm text-md leading-relaxed text-slate-300">{statusDescription}</p>
                {status === "error" && (
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">{errorMessage}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
