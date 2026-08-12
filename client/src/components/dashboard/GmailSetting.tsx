"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/selectWithSearch";
import { Mail, Save } from "lucide-react";
import { toast } from "sonner";
import WithPermission from "@/_core/components/WithPermission";
import timezones from "@/constants/timezones.json";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAgentGmailConfig, saveGmailConfig } from "@/store/slices/gmailSlice";

type TimezoneOption = {
  value: string;
  abbr: string;
  offset: number;
  isdst: boolean;
  text: string;
  utc: string[];
};

interface GmailSettingProps {
  onUpdate?: () => void;
  agentId?: string | null;
  worker?: { agent_id?: string | null } | null;
}

export default function GmailSetting({ onUpdate, agentId, worker }: GmailSettingProps) {
  const dispatch = useAppDispatch();
  const agentIdentifier = agentId ?? worker?.agent_id;
  const gmailState = useAppSelector((state) => state.gmail);
  const activeAgentConfig = agentIdentifier
    ? gmailState.configByAgent[agentIdentifier]
    : undefined;

  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [timezone, setTimezone] = useState("");

  const saving = gmailState.saving;
  const loading = gmailState.loading;

  useEffect(() => {
    if (!agentIdentifier) return;
    void dispatch(fetchAgentGmailConfig(agentIdentifier));
  }, [agentIdentifier, dispatch]);

  useEffect(() => {
    setEmail(activeAgentConfig?.gmail_email ?? "");
    setTimezone(activeAgentConfig?.timezone ?? "");
  }, [activeAgentConfig]);

  const handleSave = async () => {
    if (!email.trim()) {
      toast.error("Please enter your Gmail address.");
      return;
    }

    if (!appPassword.trim()) {
      toast.error("Please enter your Gmail app password.");
      return;
    }

    if (!timezone.trim()) {
      toast.error("Please enter your timezone.");
      return;
    }

    try {
      await dispatch(
        saveGmailConfig({
          agentId: agentIdentifier ?? undefined,
          payload: {
            gmail_email: email.trim(),
            gmail_app_password: appPassword.trim(),
            timezone: timezone.trim() || undefined,
          },
        })
      ).unwrap();

      toast.success("Gmail settings saved.");
      onUpdate?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save Gmail settings.";
      toast.error(message);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
        {/* {JSON.stringify(worker)} */}
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Mail className="w-5 h-5 text-[#7B68EE]" />
          Gmail Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="gmail_email" className="text-sm text-slate-400">
              Gmail address
            </Label>
            <Input
              id="gmail_email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-1 bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <Label htmlFor="gmail_app_password" className="text-sm text-slate-400">
              Gmail app password
            </Label>
            <Input
              id="gmail_app_password"
              type="password"
              autoComplete="current-password"
              value={appPassword}
              onChange={(event) => setAppPassword(event.target.value)}
              placeholder="App password from Google"
              className="mt-1 bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <Label htmlFor="timezone" className="text-sm text-slate-400">
              Timezone
            </Label>
            <Select value={timezone} onValueChange={(value) => setTimezone(value)}>
              <SelectTrigger
                id="timezone"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/80 text-left text-white"
              >
                <SelectValue placeholder="Select a timezone" />
              </SelectTrigger>
              <SelectContent searchable className="max-h-64 w-full bg-slate-950/80 text-white">
                {((timezones as TimezoneOption[]) || []).map((item) => (
                  <SelectItem
                    key={`${item.value}-${item.utc[0] ?? item.value}`}
                    value={item.utc[0] ?? item.value}
                  >
                    {item.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Select the timezone for outgoing Gmail automation.
            </p>
          </div>
        </div>

        <WithPermission>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white"
          >
            {saving ? "Saving…" : loading ? "Loading…" : "Save"}
            <Save className="w-4 h-4 ml-2" />
          </Button>
        </WithPermission>
      </CardContent>
    </Card>
  );
}
