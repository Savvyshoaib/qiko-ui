import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { acceptCustomerInvite } from "@/lib/adminApi";
import { arePasswordRequirementsMet, getPasswordRequirements } from "@/lib/passwordRequirements";

type Phase = "boot" | "invalid" | "form" | "submitting" | "success" | "error";

/**
 * Landing page for customer invite emails:
 * /customer-invite?email=...&customer_unique_id=...
 * User sets password, then Save calls accept-invite API with password in payload.
 */
export default function AcceptCustomerInvite() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<Phase>("boot");
  const [email, setEmail] = useState("");
  const [customerUniqueId, setCustomerUniqueId] = useState("");
  const [invalidMessage, setInvalidMessage] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const e = url.searchParams.get("email")?.trim() ?? "";
    const id = url.searchParams.get("customer_unique_id")?.trim() ?? "";
    if (!e || !id) {
      setPhase("invalid");
      setInvalidMessage("Invalid invite link: missing email or customer_unique_id.");
      return;
    }
    setEmail(e);
    setCustomerUniqueId(id);
    setPhase("form");
  }, []);

  const passwordRequirements = useMemo(() => getPasswordRequirements(password), [password]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (phase !== "form" || !email || !customerUniqueId) return;

    if (!arePasswordRequirementsMet(password)) {
      toast.error("Please meet all password requirements");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setPhase("submitting");
    try {
      const res = await acceptCustomerInvite({
        email,
        customer_unique_id: customerUniqueId,
        password,
        password_confirmation: confirmPassword,
      });
      setPhase("success");
      setMessage(res.message || "Invite accepted successfully.");
      toast.success(res.message || "Invite accepted");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to accept invite";
      setPhase("error");
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const statusTitle =
    phase === "submitting"
      ? "Saving..."
      : phase === "success"
        ? "Invite accepted"
        : phase === "error"
          ? "Could not accept invite"
          : phase === "invalid"
            ? "Invalid link"
            : phase === "boot"
              ? "Loading..."
              : "Accept invitation";

  const iconCircle =
    phase === "submitting" ? (
      <Loader2 className="h-10 w-10 animate-spin text-white" />
    ) : phase === "success" ? (
      <CheckCircle2 className="h-10 w-10 text-white" />
    ) : phase === "invalid" || phase === "error" ? (
      <XCircle className="h-10 w-10 text-white" />
    ) : null;

  const gradientClass =
    phase === "submitting"
      ? "bg-gradient-to-br from-cyan-500 to-blue-600"
      : phase === "success"
        ? "bg-gradient-to-br from-emerald-500 to-lime-500"
        : phase === "invalid" || phase === "error"
          ? "bg-gradient-to-br from-rose-500 to-amber-500"
          : "bg-gradient-to-br from-indigo-500 to-cyan-600";

  if (phase === "boot") {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" aria-label="Loading" />
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent>
              <div className="px-6 py-8 text-center">
                <div
                  className={`mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full shadow-[0_0_24px_rgba(59,130,246,0.15)] ${gradientClass}`}
                >
                  {iconCircle}
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-rose-50">{statusTitle}</h3>
                <p className="mx-auto mt-3 max-w-sm text-md leading-relaxed text-slate-300">{invalidMessage}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "form" || phase === "submitting") {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8">
              <div className="px-2 sm:px-4">
                <h3 className="text-center text-2xl font-semibold tracking-tight text-rose-50">{statusTitle}</h3>
                <p className="mt-2 text-center text-sm text-slate-400">Set a password for your account, then save.</p>
                <p className="mt-1 truncate text-center text-xs text-slate-500" title={email}>
                  {email}
                </p>

                <form onSubmit={handleSave} className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-invite-password" className="text-slate-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="customer-invite-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(ev) => setPassword(ev.target.value)}
                        disabled={phase === "submitting"}
                        className="bg-white/[0.04] border-white/10 pr-10 text-white placeholder:text-slate-500"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>


                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {passwordRequirements.map((req) => (
                      <li key={req.text} className={req.met ? "text-emerald-400/90" : ""}>
                        {req.text}
                      </li>
                    ))}
                  </ul>


                  <div className="space-y-2">
                    <Label htmlFor="customer-invite-confirm" className="text-slate-300">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Input
                        id="customer-invite-confirm"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(ev) => setConfirmPassword(ev.target.value)}
                        disabled={phase === "submitting"}
                        className={`bg-white/[0.04] border-white/10 pr-10 text-white placeholder:text-slate-500 ${
                          confirmPassword && password !== confirmPassword ? "border-red-500" : ""
                        }`}
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                        aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-400">Passwords do not match</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:from-indigo-500 hover:to-cyan-500"
                    disabled={phase === "submitting" || password !== confirmPassword}
                  >
                    {phase === "submitting" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent>
            <div className="px-6 py-8 text-center">
              <div
                className={`mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full shadow-[0_0_24px_rgba(59,130,246,0.15)] ${gradientClass}`}
              >
                {iconCircle}
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-rose-50">{statusTitle}</h3>
              <p className="mx-auto mt-3 max-w-sm text-md leading-relaxed text-slate-300">{message}</p>
              {phase === "error" && (
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                  Check your password and try again, or open the full link from your email.
                </p>
              )}
              {phase === "success" && (
                <Button type="button" className="mt-6 w-full" variant="secondary" onClick={() => setLocation("/login")}>
                  Go to login
                </Button>
              )}
              {phase === "error" && (
                <Button
                  type="button"
                  className="mt-6 w-full"
                  variant="outline"
                  onClick={() => {
                    setPassword("");
                    setConfirmPassword("");
                    setPhase("form");
                  }}
                >
                  Try again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
