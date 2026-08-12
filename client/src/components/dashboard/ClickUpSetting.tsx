"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CirclePlus,
  ClipboardList,
  ExternalLink,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { updateClickUpCredentials } from "@/lib/avatarApi";
import { decryptClickUpCredentials } from "@/lib/laravelDecrypt";
import WithPermission from "@/_core/components/WithPermission";
import { useAppSelector } from "@/store/hooks";

type ClickUpUserFields = {
  clickup_token?: string;
  clickup_list_id?: string;
  clickup_team_id?: string;
};

interface ClickUpSettingProps {
  onUpdate?: () => void;
}

export default function ClickUpSetting({ onUpdate }: ClickUpSettingProps) {
  const userInfo = useAppSelector(
    (state) => (state.auth.userInfo as ClickUpUserFields | null) ?? null
  );
  const hasClickUpTokenInRedux = !!(userInfo?.clickup_token ?? "").trim();

  const [apiToken, setApiToken] = useState("");
  const [listId, setListId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [tokenMasked, setTokenMasked] = useState(true);
  const [previousApiToken, setPreviousApiToken] = useState("");
  const [previousListId, setPreviousListId] = useState("");
  const [previousTeamId, setPreviousTeamId] = useState("");

  const maskToken = (token: string, headLength = 8, maxStars = 24): string =>
    token.length <= headLength
      ? token
      : token.slice(0, headLength) +
        "*".repeat(Math.min(token.length - headLength, maxStars));

  const resolveDecryptedClickUp = async (
    fields: ClickUpUserFields
  ): Promise<ClickUpUserFields> => {
    const decryptKey = import.meta.env.VITE_LARAVEL_DECRYPT_KEY as string | undefined;
    if (!decryptKey) {
      return fields;
    }

    try {
      return await decryptClickUpCredentials(
        {
          clickup_token: fields.clickup_token ?? null,
          clickup_list_id: fields.clickup_list_id ?? null,
          clickup_team_id: fields.clickup_team_id ?? null,
        },
        decryptKey
      );
    } catch (err) {
      console.error("[ClickUp] Failed to decrypt credentials:", err);
      return fields;
    }
  };

  useEffect(() => {
    if (hydrated) return;

    const raw: ClickUpUserFields = {
      clickup_token: userInfo?.clickup_token?.trim() ?? "",
      clickup_list_id: userInfo?.clickup_list_id?.trim() ?? "",
      clickup_team_id: userInfo?.clickup_team_id?.trim() ?? "",
    };

    const hasAny = Object.values(raw).some(Boolean);
    if (hasAny) {
      void resolveDecryptedClickUp(raw).then((usable) => {
        const token = usable.clickup_token ?? "";
        const list = usable.clickup_list_id ?? "";
        const team = usable.clickup_team_id ?? "";
        setApiToken(token);
        setListId(list);
        setTeamId(team);
        setPreviousApiToken(token);
        setPreviousListId(list);
        setPreviousTeamId(team);
        setTokenMasked(!!token);
      });
    }
    setHydrated(true);
  }, [userInfo, hydrated]);

  const handleSave = async () => {
    const token = apiToken.trim();
    const list = listId.trim();
    const team = teamId.trim();

    if (!token) {
      toast.error("Please enter a ClickUp API token");
      return;
    }
    if (!list) {
      toast.error("Please enter a ClickUp list ID");
      return;
    }
    if (!team) {
      toast.error("Please enter a ClickUp team ID");
      return;
    }

    setSaving(true);
    try {
      await updateClickUpCredentials({
        clickup_token: token,
        clickup_list_id: list,
        clickup_team_id: team,
      });
      setPreviousApiToken(token);
      setPreviousListId(list);
      setPreviousTeamId(team);
      setTokenMasked(true);
      toast.success("ClickUp settings saved");
      onUpdate?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const hasPreviousToken = !!previousApiToken.trim();

  const handleEnterEditMode = () => {
    setTokenMasked(false);
    if (hasPreviousToken) {
      setApiToken("");
    }
  };

  const handleCancelEditMode = () => {
    setApiToken(previousApiToken);
    setListId(previousListId);
    setTeamId(previousTeamId);
    setTokenMasked(true);
  };

  const canSave =
    apiToken.trim().length > 0 &&
    listId.trim().length > 0 &&
    teamId.trim().length > 0;

  return (
    <div className="space-y-4">
      {!hasClickUpTokenInRedux && (
        <Card className="p-6 border-[#7B68EE]/50 bg-[#7B68EE]/10">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-[#7B68EE] mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-1">ClickUp credentials required</h3>
              <p className="text-sm text-muted-foreground mb-3">
                You need these 3 values from your ClickUp workspace so your worker can create
                tasks and list work from chat.
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>
                  <b>1. CLICKUP_TOKEN</b>
                  <br />
                  In ClickUp, open your avatar ??? Settings ??? Apps ??? API Token ??? Generate (or copy
                  your personal token). It usually starts with{" "}
                  <code className="bg-muted px-1 rounded text-xs">pk_</code>.
                </li>
                <li>
                  <b>2. CLICKUP_TEAM_ID</b>
                  <br />
                  Open any workspace URL:{" "}
                  <code className="bg-muted px-1 rounded text-xs">
                    app.clickup.com/{`{team_id}`}/...
                  </code>{" "}
                  ??? the number after the domain is your team (workspace) ID.
                </li>
                <li>
                  <b>3. CLICKUP_LIST_ID</b>
                  <br />
                  Open the list where tasks should be created ??? copy the list ID from the URL
                  (the segment after <code className="bg-muted px-1 rounded text-xs">/list/</code>
                  ) or use ClickUp&apos;s list settings / API explorer.
                </li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-10 rounded-md border-[#7B68EE]/40 bg-[#7B68EE]/10 px-4 text-violet-100 hover:border-[#7B68EE]/70 hover:bg-[#7B68EE]/20 hover:text-white"
              >
                <a
                  href="https://app.clickup.com/settings/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Open ClickUp API settings</span>
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-white/10 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <ClipboardList className="w-5 h-5 text-[#7B68EE]" />
            ClickUp Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="CLICKUP_TOKEN" className="text-sm text-slate-400">
                Personal API token from ClickUp settings.
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
                id="CLICKUP_TOKEN"
                name="CLICKUP_TOKEN"
                type="password"
                autoComplete="off"
                value={apiToken && tokenMasked ? maskToken(apiToken) : apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="pk_..."
                readOnly={tokenMasked && hasPreviousToken}
                className="font-mono text-xs bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </WithPermission>
          </div>

          <div className="space-y-2">
            <Label htmlFor="CLICKUP_LIST_ID" className="text-sm text-slate-400">
              Default list ID for new tasks.
            </Label>
            <WithPermission>
              <Input
                id="CLICKUP_LIST_ID"
                name="CLICKUP_LIST_ID"
                type="text"
                autoComplete="off"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                placeholder="123456789"
                className="font-mono text-xs bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </WithPermission>
          </div>

          <div className="space-y-2">
            <Label htmlFor="CLICKUP_TEAM_ID" className="text-sm text-slate-400">
              Workspace (team) ID.
            </Label>
            <WithPermission>
              <Input
                id="CLICKUP_TEAM_ID"
                name="CLICKUP_TEAM_ID"
                type="text"
                autoComplete="off"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="9876543"
                className="font-mono text-xs bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </WithPermission>
          </div>

          <WithPermission>
            <Button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="w-full bg-[#7B68EE] hover:bg-[#6a58d6] text-white"
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
