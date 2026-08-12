"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CirclePlus, ExternalLink, Hash, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateSlackBotToken } from "@/lib/avatarApi";
import { decryptSlackCredentials } from "@/lib/laravelDecrypt";
import WithPermission from "@/_core/components/WithPermission";
import { useAppSelector } from "@/store/hooks";

interface SlackSettingProps {
  onUpdate?: () => void;
}

export default function SlackSetting({ onUpdate }: SlackSettingProps) {
  const userInfoSlackToken = useAppSelector(
    (state) =>
      (state.auth.userInfo as { slack_token?: string } | null)?.slack_token ??
      ""
  );
  const hasSlackTokenInRedux = !!userInfoSlackToken.trim();
  const [slackBotToken, setSlackBotToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tokenMasked, setTokenMasked] = useState(true);
  const [previousToken, setPreviousToken] = useState("");

  const maskToken = (token: string, headLength = 8, maxStars = 24): string =>
    token.length <= headLength
      ? token
      : token.slice(0, headLength) +
        "*".repeat(Math.min(token.length - headLength, maxStars));

  const resolveDecryptedSlackToken = async (value: string): Promise<string> => {
    const encrypted = value?.trim();
    if (!encrypted) return "";

    const decryptKey = import.meta.env.VITE_LARAVEL_DECRYPT_KEY as string | undefined;
    if (!decryptKey) {
      return encrypted;
    }

    try {
      const res = await decryptSlackCredentials(
        { slack_token: encrypted },
        decryptKey
      );
      return res.slack_token || encrypted;
    } catch (err) {
      console.error("[Slack] Failed to decrypt slack_token:", err);
      return encrypted;
    }
  };

  useEffect(() => {
    if (hydrated) return;

    const initial = userInfoSlackToken?.trim();
    if (initial) {
      void resolveDecryptedSlackToken(initial).then((usable) => {
        setSlackBotToken(usable);
        setPreviousToken(usable);
        setTokenMasked(true);
      });
    }
    setHydrated(true);
  }, [userInfoSlackToken, hydrated]);

  const handleSave = async () => {
    const token = slackBotToken.trim();
    if (!token) {
      toast.error("Please enter a Slack bot token");
      return;
    }
    setSaving(true);
    try {
      await updateSlackBotToken({ slack_token: token });
      setPreviousToken(token);
      setTokenMasked(true);
      toast.success("Slack bot token saved");
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
      setSlackBotToken("");
    }
  };

  const handleCancelEditMode = () => {
    setSlackBotToken(previousToken);
    setTokenMasked(true);
  };

  return (
    <div className="space-y-4">
      {!hasSlackTokenInRedux && (
        <Card className="p-6 border-[#E01E5A]/50 bg-[#E01E5A]/10">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-[#E01E5A] mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-1">Slack bot token required</h3>
              <p className="text-sm text-muted-foreground mb-3">
                You need a bot token from a Slack app so your worker can post messages and DMs
                from chat.
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>
                  <b>1. Create a Slack app</b>
                  <br />
                  Go to api.slack.com/apps → Create New App → From scratch. Name it and pick your
                  workspace.
                </li>
                <li>
                  <b>2. Add bot scopes</b>
                  <br />
                  Open OAuth &amp; Permissions → Bot Token Scopes → add {" "}
                  <code className="bg-muted px-1 rounded text-xs">chat:write</code>,{" "}
                  <code className="bg-muted px-1 rounded text-xs">channels:read</code>, and{" "}
                  <code className="bg-muted px-1 rounded text-xs">users:read</code> (plus{" "}
                  <code className="bg-muted px-1 rounded text-xs">im:write</code> for DMs).
                </li>
                <li>
                  <b>3. Install &amp; copy the token</b>
                  <br />
                  Install App to Workspace → copy the Bot User OAuth Token (starts with{" "}
                  <code className="bg-muted px-1 rounded text-xs">xoxb-</code>) into{" "}
                  <b>slack_token</b> below.
                </li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-10 rounded-md border-[#E01E5A]/40 bg-[#E01E5A]/10 px-4 text-rose-100 hover:border-[#E01E5A]/70 hover:bg-[#E01E5A]/20 hover:text-white"
              >
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Open Slack API apps</span>
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Hash className="w-5 h-5 text-[#E01E5A]" />
            Slack Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="slack_bot_token" className="text-sm text-slate-400">
                Bot token from your Slack app (starts with xoxb-).
              </Label>
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
              <Input
                id="slack_token"
                name="slack_token"
                type="password"
                autoComplete="off"
                value={
                  slackBotToken && tokenMasked ? maskToken(slackBotToken) : slackBotToken
                }
                onChange={(e) => setSlackBotToken(e.target.value)}
                placeholder="xoxb-..."
                readOnly={tokenMasked && hasPreviousToken}
                className="font-mono text-xs bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </WithPermission>
          </div>

          <WithPermission>
            <Button
              onClick={handleSave}
              disabled={saving || !slackBotToken.trim()}
              className="w-full bg-[#4A154B] hover:bg-[#611f69] text-white"
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
    </div>
  );
}
