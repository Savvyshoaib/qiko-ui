"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CirclePlus, KeyRound, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateCalendlyToken } from "@/lib/avatarApi";
import type { AnyAction } from "redux";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCalendlyToken as setCalendlyTokenInStore } from "@/store/slices/authSlice";
import { decryptCalendlyCredentials } from "@/lib/laravelDecrypt";
import WithPermission from "@/_core/components/WithPermission";

interface CalendlyTokenProps {
  onUpdate?: () => void;
}

export default function CalendlyToken({ onUpdate }: CalendlyTokenProps) {
  const dispatch = useAppDispatch();
  const storedToken = useAppSelector((state) => state.auth.calendlyToken);
  const userInfoCalendlyToken = useAppSelector(
    (state) => (state.auth.userInfo as { calendly_token?: string } | null)?.calendly_token ?? ""
  );
  const [calendlyToken, setCalendlyToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [decryptedToken, setDecryptedToken] = useState("");
  const [tokenMasked, setTokenMasked] = useState(true);
  const [previousToken, setPreviousToken] = useState("");

  const maskToken = (token: string, headLength = 6, maxStars = 170): string =>
    token.length <= headLength ? token : token.slice(0, headLength) + "*".repeat(Math.min(token.length - headLength, maxStars));

  const resolveDecryptedCalendlyToken = async (value: string): Promise<string> => {
    const encrypted = value?.trim();
    if (!encrypted) return "";

    const decryptKey = import.meta.env.VITE_LARAVEL_DECRYPT_KEY as string | undefined;
    if (!decryptKey) {
      // No decrypt key – fall back to showing the raw value (may already be plain text)
      return encrypted;
    }

    try {
      const res = await decryptCalendlyCredentials({ calendly_token: encrypted }, decryptKey);
      return res.calendly_token || encrypted;
    } catch (err) {
      console.error("[Calendly] Failed to decrypt calendly_token:", err);
      return encrypted;
    }
  };

  useEffect(() => {
    if (hydrated) return;

    const fromUserInfo = userInfoCalendlyToken?.trim();
    const fromStore = storedToken?.trim();
    const initial = fromUserInfo || fromStore || "";
    if (initial) {
      setCalendlyToken(initial);
      setPreviousToken(initial);
    }
    setHydrated(true);
  }, [storedToken, userInfoCalendlyToken, hydrated]);

  // Derive a decrypted view of the token (from userInfo's encrypted value if present)
  useEffect(() => {
    (async () => {
      const usable = await resolveDecryptedCalendlyToken(userInfoCalendlyToken);
      setDecryptedToken(usable);
    })();
  }, [userInfoCalendlyToken]);

  const handleSave = async () => {
    const token = calendlyToken.trim();
    if (!token) {
      toast.error("Please enter a Calendly token");
      return;
    }
    setSaving(true);
    try {
      await updateCalendlyToken({ calendly_token: token });
      dispatch(setCalendlyTokenInStore(token) as AnyAction);
      setPreviousToken(token);
      setTokenMasked(true);
      // Keep read-only view in sync with what we just saved
      const usable = await resolveDecryptedCalendlyToken(token);
      setDecryptedToken(usable);
      toast.success("Calendly token saved");
      onUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const hasPreviousToken = !!previousToken.trim();

  const handleEnterEditMode = () => {
    setTokenMasked(false);
    if (hasPreviousToken) {
      setCalendlyToken("");
    }
  };

  const handleCancelEditMode = () => {
    setCalendlyToken(previousToken);
    setTokenMasked(true);
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <KeyRound className="w-5 h-5 text-emerald-400" />
          Calendly Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>

          <div className="flex items-center justify-between">
            <Label className="text-sm text-slate-400">Paste the token from your Calendly developer settings.</Label>
            {!hasPreviousToken ? null : tokenMasked ? (
              <WithPermission>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs inline-flex items-center justify-center gap-1.5 min-w-[110px] rounded-md whitespace-nowrap transition-colors hover:bg-white/5 active:bg-white/10"
                onClick={handleEnterEditMode}
              >
                <CirclePlus className="h-3.5 w-3.5" />
                <span>Add new token</span>
              </Button>
              </WithPermission>
            ) : hasPreviousToken ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs inline-flex items-center justify-center min-w-[110px] rounded-md whitespace-nowrap transition-colors hover:bg-white/5 active:bg-white/10"
                onClick={handleCancelEditMode}
              >
                Cancel
              </Button>
            ) : null}
          </div>

          <WithPermission>
          <Textarea
            value={calendlyToken && tokenMasked ? maskToken(calendlyToken) : calendlyToken}
            onChange={(e) => {
              setCalendlyToken(e.target.value);
            }}
            placeholder="eyJraW..."
            rows={2}
            readOnly={tokenMasked && hasPreviousToken}
            className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-slate-500 font-mono text-xs resize-none w-full max-w-full break-all"
          />
          </WithPermission>
        </div>
       
        <WithPermission>
        <Button
          onClick={handleSave}
          disabled={saving || !calendlyToken.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </Button>
        </WithPermission>
      </CardContent>
    </Card>
  );
}
