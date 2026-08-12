import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setTeamInvitePassword } from "@/lib/TeamApi";

type SetPasswordFormProps = {
  token: string;
};

export default function SetPasswordForm({ token }: SetPasswordFormProps) {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiMessage, setApiMessage] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    password_confirmation?: string;
  }>({});

  const passwordRequirements = useMemo(
    () => [
      { met: password.length >= 8, text: "At least 8 characters" },
      { met: /[A-Z]/.test(password), text: "One uppercase letter" },
      { met: /[a-z]/.test(password), text: "One lowercase letter" },
      { met: /[0-9]/.test(password), text: "One number" },
    ],
    [password]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiMessage("");
    setFieldErrors({});
    const allRequirementsMet = passwordRequirements.every((req) => req.met);
    if (!allRequirementsMet) {
      toast.error("Please meet all password requirements");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await setTeamInvitePassword({
        token,
        password,
        password_confirmation: confirmPassword,
      });
      toast.success(res.message || "Password set successfully");
      if (res.success) {
        setLocation("/app");
      }
    } catch (error) {
      const typedError = error as Error & { validationErrors?: Record<string, string[]> };
      setApiMessage(typedError.message || "Failed to set password");
      const validationErrors = typedError.validationErrors;
      if (validationErrors) {
        setFieldErrors({
          email: validationErrors.email?.[0],
          password: validationErrors.password?.[0],
          password_confirmation: validationErrors.password_confirmation?.[0],
        });
      }
      toast.error(typedError.message || "Failed to set password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white">Set your password</h2>
        <p className="text-sm text-slate-400">Create a secure password to activate your team access.</p>
      </div>

      {apiMessage ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {apiMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="invite-password" className="text-slate-300">Password</Label>
        <div className="relative">
          <Input
            id="invite-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            required
            className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 pr-10 ${
              fieldErrors.password ? "border-red-500" : ""
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
          >
            {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        {password && (
          <div className="mt-2 space-y-1">
            {passwordRequirements.map((req) => (
              <div key={req.text} className={`flex items-center gap-2 text-xs ${req.met ? "text-green-400" : "text-slate-500"}`}>
                <Check className={`w-3 h-3 ${req.met ? "opacity-100" : "opacity-30"}`} />
                {req.text}
              </div>
            ))}
          </div>
        )}
        {fieldErrors.password && <p className="text-xs text-red-400">{fieldErrors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-confirm-password" className="text-slate-300">Confirm Password</Label>
        <Input
          id="invite-confirm-password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.password_confirmation) {
              setFieldErrors((prev) => ({ ...prev, password_confirmation: undefined }));
            }
          }}
          required
          className={`bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 ${
            confirmPassword && password !== confirmPassword
              ? "border-red-500"
              : fieldErrors.password_confirmation
                ? "border-red-500"
                : ""
          }`}
        />
        {fieldErrors.password_confirmation && (
          <p className="text-xs text-red-400">{fieldErrors.password_confirmation}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || password !== confirmPassword}
        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white border-0"
      >
        {isSubmitting ? "Saving..." : "Set Password"}
      </Button>
    </form>
  );
}

