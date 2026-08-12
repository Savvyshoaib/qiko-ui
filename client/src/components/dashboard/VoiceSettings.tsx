import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { 
  Phone, 
  Mic, 
  Settings, 
  Save, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Volume2,
  RefreshCw,
  PhoneCall,
  PhoneOff,
  CirclePlus,
  ExternalLink,
  Globe,
  Calendar,
  Mail,
} from "lucide-react";
import GmailSetting from "@/components/dashboard/GmailSetting";
import VoiceCallButton from "@/components/VoiceCallButton";
import CalendlyView from "@/components/dashboard/CalendlyView";
import CalendlyToken from "@/components/dashboard/CalendlyToken";
import VoiceCredentialsSkeleton from "@/components/dashboard/VoiceCredentialsSkeleton";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getVapiCredentials, saveVapiCredentials } from "@/lib/avatarApi";
import { decryptVapiCredentials } from "@/lib/laravelDecrypt";
import WithPermission from "@/_core/components/WithPermission";

interface VoiceSettingsProps {
  worker: {
    id: number;
    agent_id?: string;
    name: string | null;
    fullName: string | null;
    voiceEnabled?: number;
    vapiAssistantId?: string | null;
    vapiPhoneNumber?: string | null;
    voiceFirstMessage?: string | null;
    voiceId?: string | null;
  };
  onUpdate: () => void;
}

const VOICE_OPTIONS = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "echo", name: "Echo", description: "Warm and conversational" },
  { id: "fable", name: "Fable", description: "Expressive and dynamic" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { id: "nova", name: "Nova", description: "Friendly and upbeat" },
  { id: "shimmer", name: "Shimmer", description: "Clear and professional" },
];

export default function VoiceSettings({ worker, onUpdate }: VoiceSettingsProps) {
  const [firstMessage, setFirstMessage] = useState(
    worker.voiceFirstMessage || `Hello! I'm ${worker.name || worker.fullName || "your AI assistant"}. How can I help you today?`
  );
  const [selectedVoice, setSelectedVoice] = useState(worker.voiceId || "alloy");
  const [hasChanges, setHasChanges] = useState(false);

  // API / Vapi credentials form
  const [assistantId, setAssistantId] = useState(worker.vapiAssistantId ?? "");
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [keysMasked, setKeysMasked] = useState(false);
  const [previousPublicKey, setPreviousPublicKey] = useState("");
  const [previousSecretKey, setPreviousSecretKey] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [vapiConfig, setVapiConfig] = useState<{ configured: boolean }>({ configured: true });

  const maskKey = (val: string) => (val.length > 4 ? val.slice(0, 4) + "*****" : val);

  // Load Vapi credentials when agent_id is available
  useEffect(() => {
    const agentId = worker.agent_id;
    if (!agentId) return;
    let cancelled = false;
    setLoadingCredentials(true);
    getVapiCredentials(agentId)
      .then(async (creds) => {
        if (cancelled) return;
        const decryptKey = import.meta.env.VITE_LARAVEL_DECRYPT_KEY as string | undefined;
        let decrypted = creds;
        if (decryptKey) {
          try {
            decrypted = await decryptVapiCredentials(creds, decryptKey);
          } catch (err) {
            console.error("Failed to decrypt Vapi credentials:", err);
          }
        }
        let hasAny = false;
        if (decrypted.vapi_assistant_id != null && decrypted.vapi_assistant_id !== "") {
          setAssistantId(decrypted.vapi_assistant_id);
          hasAny = true;
        }
        if (decrypted.vapi_public_key != null && decrypted.vapi_public_key !== "") {
          setPublicKey(decrypted.vapi_public_key);
          setPreviousPublicKey(decrypted.vapi_public_key);
          hasAny = true;
        }
        if (decrypted.vapi_api_key != null && decrypted.vapi_api_key !== "") {
          setSecretKey(decrypted.vapi_api_key);
          setPreviousSecretKey(decrypted.vapi_api_key);
          setKeysMasked(true);
          hasAny = true;
        }
        setVapiConfig({ configured: hasAny });
      })
      .catch(() => {
        if (!cancelled) {
          // If fetch fails (e.g. no credentials yet), treat as not configured
          setVapiConfig({ configured: false });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCredentials(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worker.agent_id]);

  // Check if Vapi is configured
  // const { data: vapiConfig } = () => {}
  
  // Get voice status for this worker
  const { data: voiceStatus } = () => {}

  // Mutations
  const enableVoiceMutation = () => {}

  const disableVoiceMutation = () => {}

  const updateSettingsMutation = () => {}

  const syncPromptMutation = () => {}

  useEffect(() => {
    if (voiceStatus) {
      const changed = 
        firstMessage !== (voiceStatus.firstMessage || "") ||
        selectedVoice !== (voiceStatus.voiceId || "alloy");
      setHasChanges(changed);
    }
  }, [firstMessage, selectedVoice, voiceStatus]);

  const handleEnableVoice = () => {  };

  const handleDisableVoice = () => { };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      workerId: worker.id,
      firstMessage,
      voiceId: selectedVoice,
    });
  };

  const handleSyncPrompt = () => {
    syncPromptMutation.mutate({ workerId: worker.id });
  };

  const handleSaveCredentials = async () => {
    const agentId = worker.agent_id;
    if (!agentId) {
      toast.error("No agent linked to this worker");
      return;
    }
    if (!assistantId.trim()) {
      toast.error("Assistant ID is required");
      return;
    }
    if (!publicKey.trim()) {
      toast.error("Public Key is required");
      return;
    }
    if (!secretKey.trim()) {
      toast.error("Private Key (API Key) is required");
      return;
    }
    setSavingCredentials(true);
    try {
      await saveVapiCredentials(agentId, {
        vapi_assistant_id: assistantId.trim(),
        vapi_public_key: publicKey.trim(),
        vapi_api_key: secretKey.trim(),
      });
      toast.success("Credentials saved");
      // Update "last saved" values so Cancel restores the most recent saved keys.
      setPreviousPublicKey(publicKey.trim());
      setPreviousSecretKey(secretKey.trim());
      setKeysMasked(true);
      // Once credentials are saved, mark Vapi as configured
      setVapiConfig({ configured: true });
      // Automatically enable voice after saving credentials (if not already enabled)
      if (!isVoiceEnabled) {
        handleEnableVoice();
      }
      onUpdate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save credentials");
    } finally {
      setSavingCredentials(false);
    }
  };

  const isVoiceEnabled = assistantId;
  const isLoading = enableVoiceMutation.isPending || disableVoiceMutation.isPending;

  const [voiceSubTab, setVoiceSubTab] = useState<"voice" | "calendly" | "gmail">("voice");
  const hasPreviousPublicKey = previousPublicKey.trim().length > 0;
  const hasPreviousSecretKey = previousSecretKey.trim().length > 0;

  const handleEnterEditMode = () => {
    // Clear values while editing; use last saved values for cancel/restore.
    setPreviousPublicKey(publicKey);
    setPreviousSecretKey(secretKey);
    setPublicKey("");
    setSecretKey("");
    setKeysMasked(false);
  };

  const handleCancelEditMode = () => {
    // Restore last saved values and go back to masked/read-only view.
    setPublicKey(previousPublicKey);
    setSecretKey(previousSecretKey);
    setKeysMasked(true);
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-auto">
      <div className="max-w-3xl mx-auto">
        {/* Sub-tabs: Voice | Calendly (Train Your Worker style) */}
        <div className="mb-6">
          <div className="flex gap-1.5 min-w-max">
            {[
              { id: "voice" as const, label: "Voice", icon: Phone, color: "#8B5CF6" },
              { id: "calendly" as const, label: "Calendly", icon: Calendar, color: "#A855F7" },
              { id: "gmail" as const, label: "Gmail", icon: Mail, color: "#06B6D4" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = voiceSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setVoiceSubTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                    isActive
                      ? "bg-white/10 border border-white/20"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${tab.color}20` }}
                  >
                    <Icon className="w-3 h-3" style={{ color: tab.color }} />
                  </div>
                  <span
                    className={`text-xs font-medium ${isActive ? "text-white" : "text-slate-400"}`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {voiceSubTab === "calendly" ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Calendly
              </h1>
              <p className="text-muted-foreground">
                Connect a Calendly event type so your worker can schedule meetings
              </p>
            </div>
            <CalendlyView worker={worker} onUpdate={onUpdate} />
            {/* <CalendlyToken onUpdate={onUpdate} /> */}
          </>
        ) : voiceSubTab === "gmail" ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-foreground mb-2 flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                Gmail
              </h1>
              <p className="text-muted-foreground">
                Configure Gmail settings for outgoing automation and notifications
              </p>
            </div>
            <GmailSetting worker={worker} onUpdate={onUpdate} />
          </>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-foreground mb-2 flex items-center gap-2">
                <Phone className="h-6 w-6 text-primary" />
                Voice AI Settings
              </h1>
              <p className="text-muted-foreground">
                Enable voice conversations so customers can call and talk to your digital worker
              </p>
            </div>
        {/* API Configuration Status */}
        {!vapiConfig?.configured && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 mb-6 border-amber-500/50 bg-amber-500/10">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-1">Vapi API Key Required</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    You need these 3 values from your Vapi account to enable voice for this worker.
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-2 mb-4">
                    <li>
                      <b>1. Assistant ID</b>
                      <br/>
                      In Vapi, go to Assistants → open your assistant → copy the Assistant ID (this is not the assistant name).
                    </li>
                    <li>
                      <b>2. Public Key</b>
                      <br/>
                      In Vapi, go to Dashboard → API Keys → copy the Public Key (usually starts with pk-).
                    </li>
                    <li>
                      <b>3. Private Key</b>
                      <br/>
                      In Vapi, go to Dashboard → API Keys → copy the Private Key (keep this private).
                    </li>
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-10 rounded-md border-amber-400/40 bg-amber-500/10 px-4 text-amber-100 hover:border-amber-300/70 hover:bg-amber-500/20 hover:text-white"
                  >
                    <a href="https://vapi.ai" target="_blank" rel="noopener noreferrer">
                      <span>Get Vapi ID &amp; Keys</span>
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Voice Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {isVoiceEnabled ? (
                  <div className="p-2 rounded-full bg-green-500/20">
                    <PhoneCall className="h-5 w-5 text-green-500" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-muted">
                    <PhoneOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-foreground">Voice Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {isVoiceEnabled ? "Voice is enabled for this worker" : "Voice is not enabled"}
                  </p>
                </div>
              </div>
              { isVoiceEnabled && <Button
                className="cursor-default"
                variant={isVoiceEnabled ? "primary" : "default"}
                // onClick={isVoiceEnabled ? handleDisableVoice : handleEnableVoice}
                disabled={isLoading || !vapiConfig?.configured}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : isVoiceEnabled ? (
                  <Phone className="h-4 w-4 mr-2" />
                ) : (
                  <Phone className="h-4 w-4 mr-2" />
                )}
                {isVoiceEnabled ? "Voice Enabled" : "Enable Voice"}
              </Button> }
            </div>

            {/* Assistant ID & API Keys Form */}
            <form
              className="mt-4 pt-4 border-t border-border space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveCredentials();
              }}
            >
              {(loadingCredentials) ? (
                <VoiceCredentialsSkeleton />
              ):(<>
              <div className="grid gap-4 sm:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="assistantId">Assistant ID</Label>
                  <WithPermission>
                  <Input
                    id="assistantId"
                    type="text"
                    placeholder="e.g. your-vapi-assistant-id"
                    value={assistantId}
                    onChange={(e) => setAssistantId(e.target.value)}
                    disabled={loadingCredentials}
                    className="font-mono text-sm border border-input bg-white text-black dark:bg-white dark:text-black"
                  />
                  </WithPermission>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="publicKey">Public Key</Label>
                    <WithPermission>
                      <>
                    {keysMasked ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs inline-flex items-center justify-center gap-1.5 min-w-[110px] rounded-md whitespace-nowrap transition-colors hover:bg-white/5 active:bg-white/10"
                        onClick={handleEnterEditMode}
                      >
                        <CirclePlus className="h-3.5 w-3.5" />
                        <span>Add new key</span>
                      </Button>
                    ) : hasPreviousPublicKey ? (
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
                    </>
                    </WithPermission>
                  </div>
                  <WithPermission>
                  <Input
                    id="publicKey"
                    type="text"
                    placeholder="pk-..."
                    value={keysMasked ? maskKey(publicKey) : publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    readOnly={keysMasked}
                    disabled={loadingCredentials}
                    className="font-mono text-sm border border-input bg-white text-black dark:bg-white dark:text-black"
                  />
                  </WithPermission>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="secretKey">Secret Key</Label>
                    <WithPermission>
                    {keysMasked ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs inline-flex items-center justify-center gap-1.5 min-w-[110px] rounded-md whitespace-nowrap transition-colors hover:bg-white/5 active:bg-white/10"
                        onClick={handleEnterEditMode}
                      >
                        <CirclePlus className="h-3.5 w-3.5" />
                        <span>Add new key</span>
                      </Button>
                    ) : hasPreviousSecretKey ? (
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
                    </WithPermission>
                  </div>
                  <WithPermission>
                  <Input
                    id="secretKey"
                    type={keysMasked ? "text" : "password"}
                    placeholder="••••••••"
                    value={keysMasked ? maskKey(secretKey) : secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    readOnly={keysMasked}
                    disabled={loadingCredentials}
                    className="font-mono text-sm border border-input bg-white text-black dark:bg-white dark:text-black"
                    autoComplete="off"
                  />
                  </WithPermission>
                </div>
              </div>
              <WithPermission>
                <Button className="w-[100%]" type="submit" disabled={savingCredentials || loadingCredentials || !worker.agent_id}>
                  {savingCredentials ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </WithPermission>
              </>)}
            </form>

            {isVoiceEnabled && voiceStatus?.assistantId && (
              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Assistant ID:</span>
                    <p className="font-mono text-xs mt-1 truncate">{voiceStatus.assistantId}</p>
                  </div>
                  {voiceStatus.phoneNumber && (
                    <div>
                      <span className="text-muted-foreground">Phone Number:</span>
                      <p className="font-medium mt-1">{voiceStatus.phoneNumber}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Web Calling Section */}
        {isVoiceEnabled && voiceStatus?.assistantId && (
          <WebCallingSection workerId={worker.id} workerName={worker.name || worker.fullName || "AI Assistant"} />
        )}

        {/* Voice Configuration */}
        {/* { false && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 mb-6">
              <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Voice Configuration
              </h3>

              <div className="space-y-6">
                
                <div className="space-y-2">
                  <Label htmlFor="firstMessage">Greeting Message</Label>
                  <Textarea
                    id="firstMessage"
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    placeholder="Hello! How can I help you today?"
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is what your worker will say when answering a call
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex items-center gap-2">
                            <Volume2 className="h-4 w-4" />
                            <span>{voice.name}</span>
                            <span className="text-muted-foreground text-xs">- {voice.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 pt-4 w-100">
                  <Button
                    onClick={handleSaveSettings}
                    
                    disabled={!hasChanges || updateSettingsMutation.isPending || !isVoiceEnabled}
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Settings
                  </Button>

                  {isVoiceEnabled && (
                    <Button
                      variant="outline"
                      onClick={handleSyncPrompt}
                      disabled={syncPromptMutation.isPending}
                    >
                      {syncPromptMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sync with Worker Profile
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )} */}

        {/* How It Works */}
        {/* {!vapiConfig?.configured && ( <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Mic className="h-4 w-4" />
              How Voice AI Works
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">1</div>
                <div>
                  <p className="font-medium text-foreground">Enable Voice</p>
                  <p>Click "Enable Voice" to create a voice assistant powered by your worker's knowledge and personality.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">2</div>
                <div>
                  <p className="font-medium text-foreground">Get a Phone Number</p>
                  <p>Once enabled, you can purchase a phone number from Vapi that customers can call directly.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">3</div>
                <div>
                  <p className="font-medium text-foreground">Customers Call & Chat</p>
                  <p>Your digital worker answers calls, has natural conversations, and can help customers just like in text chat.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">4</div>
                <div>
                  <p className="font-medium text-foreground">Track in Bookings</p>
                  <p>Voice conversations create prospects in your Bookings tab, just like chat conversations.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Pricing:</strong> Vapi charges approximately $0.08-0.13 per minute for voice calls, 
                which includes speech recognition, AI processing, and text-to-speech.
              </p>
            </div>
          </Card>
        </motion.div>) } */}
          </>
        )}
      </div>
    </div>
  );
}

// Web Calling Section Component
function WebCallingSection({ workerId, workerName }: { workerId: number; workerName: string }) {
  const { data: webCallConfig, isLoading } = trpc.voice.getWebCallConfig.useQuery({ workerId });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground">Loading web call configuration...</span>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Browser Voice Calling</h3>
              <p className="text-sm text-muted-foreground">
                Test voice conversations directly in your browser
              </p>
            </div>
          </div>
        </div>

        {webCallConfig?.publicKey && webCallConfig?.assistantId ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">Ready for Web Calls</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Click the button below to start a voice conversation with your worker using your browser's microphone.
              </p>
              <VoiceCallButton
                assistantId={webCallConfig.assistantId}
                publicKey={webCallConfig.publicKey}
                workerName={workerName}
                variant="default"
                size="lg"
              />
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-foreground mb-1">Public Key Required</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  To enable browser-based voice calls, you need to add your Vapi Public Key.
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 mb-3">
                  <li>1. Go to <a href="https://vapi.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vapi.ai</a> dashboard</li>
                  <li>2. Navigate to API Keys</li>
                  <li>3. Copy your <strong>Public Key</strong> (starts with <code className="bg-muted px-1 rounded">pk-</code>)</li>
                  <li>4. Add it in Settings → Voice Integrations</li>
                </ol>
                <Button variant="outline" size="sm" asChild>
                  <a href="/app/settings">
                    Go to Settings
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
