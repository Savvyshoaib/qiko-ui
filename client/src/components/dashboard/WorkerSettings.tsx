import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { 
  Settings, 
  Save, 
  Loader2, 
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Pencil,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateAvatarStatus, optimisticUpdateStatus, updateSelectedAgentProfile, updateAgentListProfile } from "@/store/slices/avatarSlice";
import { addAvatarKnowledge } from "@/lib/avatarApi";
import WithPermission from "@/_core/components/WithPermission";

interface WorkerSettingsProps {
  worker: {
    id: number;
    agent_id?: string;
    name?: string | null;
    full_name?: string | null;
    fullName: string | null;
    professionalTitle: string | null;
    headline: string | null;
    location: string | null;
    categories: unknown;
    tone: string | null;
    personality?: string | null;
    status: string;
    chat_status?: string;
    planType: string | null;
    monthlyPrice: number | null;
    short_bio?: string | null;
    skills?: string[] | null;
    strength?: string | null;
    about_yourself?: string | null;
    industry?: string | null;
  };
  onUpdate: (newStatus?: string) => void;
}

export default function WorkerSettings({ worker, onUpdate }: WorkerSettingsProps) {
  const [, setLocation] = useLocation();
  const dispatch = useAppDispatch();
  const { loading, selectedAgent } = useAppSelector((state) => state.avatar);
  const reduxTone = selectedAgent?.tone || ((selectedAgent as { personality?: string } | null)?.personality ?? null);
  
  const [formData, setFormData] = useState({
    fullName: worker.fullName || worker.full_name || worker.name || "",
    professionalTitle: worker.headline || "",
    headline: worker.headline || "",
    location: worker.location || "",
    tone: worker.tone || worker.personality || "friendly",
    about_yourself: worker.about_yourself || "",
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get status from Redux store if available, otherwise use worker prop
  const currentStatus = worker.chat_status || selectedAgent?.status || worker.status;
  const isUpdatingStatus = loading.statusUpdate;

  const saveMutation =  () => {}
  /* trpc.worker.save.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
      setHasChanges(false);
      onUpdate();
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  }); */

  useEffect(() => {
    const changed = 
      formData.fullName !== (worker.fullName || "") ||
      formData.professionalTitle !== (worker.professionalTitle || "") ||
      formData.headline !== (worker.headline || "") ||
      formData.location !== (worker.location || "") ||
      formData.tone !== (worker.tone || "conversational") ||
      formData.about_yourself !== (worker.about_yourself || "");
    setHasChanges(changed);
  }, [formData, worker]);

  useEffect(() => {
    if (!reduxTone) return;
    setFormData((prev) => ({ ...prev, tone: reduxTone }));
  }, [reduxTone]);


  const handleSave = async () => {
    if (!worker.agent_id) {
      toast.error("Agent ID not found");
      return;
    }
    setIsSaving(true);

    const aboutYourself = (formData.about_yourself || "").trim();
    const nextHeadline = (formData.professionalTitle || formData.headline || "").trim();
    
    const nextSkill = (Array.isArray(worker.skills) && worker.skills.length) ? worker.skills : (nextHeadline ? [nextHeadline] : [" "])

    // console.log("worker", worker);

    // // return
    
    const payload: Parameters<typeof addAvatarKnowledge>[0] = {
      agent_unique_id: worker.agent_id,
      full_name: formData.fullName || undefined,
      headline: nextHeadline || undefined,
      location: formData.location || undefined,
      personality: formData.tone || undefined,
      knowledge: [nextHeadline].filter(Boolean).join(". ") || undefined,
      short_bio: worker.short_bio ?? nextHeadline ?? "",
      skills: nextSkill,
      strength: worker.strength ?? nextHeadline ?? "",
      industry: worker?.industry || "other"
    };

    // Only send about_yourself when it has a real value.
    // Skip if empty or placeholder string like "about_yourself".
    if (aboutYourself && aboutYourself.toLowerCase() !== "about_yourself") {
      payload.about_yourself = aboutYourself;
    }

    try {
      await addAvatarKnowledge(payload);
      toast.success("Settings saved successfully");

      // Optimistically update selected worker in Redux so UI (e.g. WorkersPage header)
      // reflects the new name/headline/location/tone immediately.
      dispatch(
        updateSelectedAgentProfile({
          fullName: formData.fullName || undefined,
          headline: nextHeadline || undefined,
          location: formData.location || undefined,
          tone: formData.tone || undefined,
          about_yourself: formData.about_yourself || aboutYourself || undefined,
          industry: worker.industry || undefined,
        })
      );
      dispatch(
        updateAgentListProfile({
          workerId: worker.id,
          agentId: worker.agent_id,
          fullName: formData.fullName || undefined,
          headline: nextHeadline || undefined,
          location: formData.location || undefined,
          tone: formData.tone || undefined,
          about_yourself: formData.about_yourself || aboutYourself || undefined,
          industry: worker.industry || undefined,
        })
      );

      setHasChanges(false);
    } catch (err) {
      console.log("err", err.errors);
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!worker.agent_id) {
      toast.error("Agent ID not found");
      return;
    }

    const newStatus = currentStatus === "ready" ? "training" : "ready";
    
    // Optimistic update - immediately update the UI
    dispatch(optimisticUpdateStatus({
      agentId: worker.agent_id,
      status: newStatus
    }));
    
    try {
      // Dispatch the async thunk to update status on the server
      await dispatch(updateAvatarStatus({
        agentId: worker.agent_id,
        status: newStatus
      })).unwrap();
      
      toast.success(`Worker status updated to ${newStatus}`);
      onUpdate(newStatus); // Update parent with new status
    } catch (error) {
      // Revert optimistic update on error
      dispatch(optimisticUpdateStatus({
        agentId: worker.agent_id,
        status: currentStatus as "ready" | "training"
      }));
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-auto">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Worker Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your digital worker's profile and configuration
          </p>
        </div>

        {/* Worker Status Card */}
        <Card className="qiko-card p-6 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
           
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl qiko-gradient flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-background" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Worker Status</h3>
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  currentStatus === "ready" ? "status-ready" : 
                  currentStatus === "error" ? "status-error" : "status-training"
                }`}>
                  
                  {currentStatus === "training" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                  ): (<span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />)}
                  {currentStatus === "ready" ? "Ready" : 
                   currentStatus === "error" ? "Error" : "Training"}
                </div>
              </div>
            </div>

            <WithPermission>
            <Button 
              variant="outline" 
              onClick={handleToggleStatus}
              disabled={isUpdatingStatus}
              className="qiko-btn-primary text-sm py-2 w-full md:w-auto"
              >
              <RefreshCw className={`w-4 h-4 ${isUpdatingStatus ? "animate-spin" : ""}`} />
              {currentStatus === "ready" ? "Switch to Training" : "Switch to Ready"}
            </Button>
            </WithPermission>
          </div>
        </Card>

        {/* Profile Settings */}
        <Card className="qiko-card p-6 mb-8">
          <h3 className="text-lg font-medium text-foreground mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Profile Settings
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                <WithPermission>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="bg-white text-black border-border"
                />
                </WithPermission>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="professionalTitle" className="text-foreground">Professional Title</Label>
                <WithPermission>
                <Input
                  id="professionalTitle"
                  value={formData.professionalTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, professionalTitle: e.target.value }))}
                  className="bg-white text-black border-border"
                />
                </WithPermission>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-foreground">Location</Label>
              <WithPermission>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="bg-white text-black border-border"
              />
              </WithPermission>
            </div>

            <div className="space-y-2">
              <Label htmlFor="headline" className="text-foreground">About Yourself</Label>
              <WithPermission>
              <Textarea
                id="headline"
                value={formData.about_yourself}
                onChange={(e) => setFormData(prev => ({ ...prev, about_yourself: e.target.value }))}
                className="bg-white text-black border-border min-h-[100px]"
                placeholder="A short description of what you do..."
              />
              </WithPermission>
            </div>

            {/* <div className="space-y-2">
              <Label className="text-foreground">Communication Tone</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {["friendly", "professional", "casual", "expert", "empathetic"].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, tone }));
                      dispatch(updateSelectedAgentProfile({ tone }));
                    }}
                    className={`p-3 rounded-lg border text-sm capitalize transition-all ${
                      formData.tone === tone
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-primary/10 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div> */}
          </div>

          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-6 border-t border-border">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-sm text-muted-foreground">
                  You have unsaved changes
                </span>
              )}
            </div>
            <WithPermission>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="qiko-btn-primary w-full md:w-auto"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
            </WithPermission>
          </div>
        </Card>

        {/* Plan Info */}
        {/* <Card className="qiko-card p-6 mb-8">
          <h3 className="text-lg font-medium text-foreground mb-4">Plan Details</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
              <p className="text-foreground font-medium capitalize">
                {worker.planType || "Foundational"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Monthly Price</p>
              <p className="text-foreground font-medium">
                ${worker.monthlyPrice || 0}/month
              </p>
            </div>
          </div>
        </Card> */}

        {/* Edit Full Profile */}
        {/* <Card className="qiko-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                Full Profile Editor
              </h3>
              <p className="text-sm text-muted-foreground">
                Edit all aspects of your worker's expertise and configuration
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/wizard")}
              className="qiko-btn-secondary"
            >
              <Pencil className="w-4 h-4" />
              Edit Full Profile
            </Button>
          </div>
        </Card> */}
      </div>
    </div>
  );
}
