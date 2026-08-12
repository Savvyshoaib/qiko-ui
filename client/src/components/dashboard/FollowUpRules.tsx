import { useState } from "react";
// import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Loader2,
  Zap,
  Mail,
  Bell,
  ArrowRight,
  CheckCircle2,
  Clock,
  Users,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Rocket,
  X,
} from "lucide-react";

interface FollowUpRulesProps {
  workerId: number;
}

// ============================================
// Trigger type labels
// ============================================

const TRIGGER_LABELS: Record<string, { label: string; description: string; icon: typeof Clock }> = {
  status_is: { label: "Status is", description: "When a contact is in a specific pipeline stage", icon: Users },
  days_inactive: { label: "Inactive for", description: "When a contact hasn't been active for N days", icon: Clock },
  missing_info: { label: "Missing info", description: "When contact info (name/email/phone) is missing", icon: AlertCircle },
  value_above: { label: "Value above", description: "When estimated deal value exceeds threshold", icon: DollarSign },
  new_prospect: { label: "New prospect", description: "When a new prospect is created", icon: Users },
};

const ACTION_LABELS: Record<string, { label: string; icon: typeof Mail }> = {
  send_email: { label: "Create email task", icon: Mail },
  create_action: { label: "Create action item", icon: CheckCircle2 },
  change_status: { label: "Change status", icon: ArrowRight },
  notify_creator: { label: "Send notification", icon: Bell },
};

const STATUS_OPTIONS = ["new", "contacted", "interested", "quoted", "converted", "lost"];
const INFO_FIELDS = ["name", "email", "phone"];

// ============================================
// Rule Builder (Create/Edit form)
// ============================================

function RuleBuilder({
  workerId,
  onClose,
  onCreated,
}: {
  workerId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<string>("days_inactive");
  const [triggerConfig, setTriggerConfig] = useState<any>({ days: 3 });
  const [actionType, setActionType] = useState<string>("create_action");
  const [actionConfig, setActionConfig] = useState<any>({ actionTitle: "Follow up with prospect" });

  const createRule = () => {};

  const handleTriggerChange = (type: string) => {
    setTriggerType(type);
    switch (type) {
      case "status_is": setTriggerConfig({ status: "interested" }); break;
      case "days_inactive": setTriggerConfig({ days: 3 }); break;
      case "missing_info": setTriggerConfig({ fields: ["email"] }); break;
      case "value_above": setTriggerConfig({ valueThreshold: 50000 }); break;
      case "new_prospect": setTriggerConfig({}); break;
    }
  };

  const handleActionChange = (type: string) => {
    setActionType(type);
    switch (type) {
      case "create_action": setActionConfig({ actionTitle: "Follow up with prospect", actionPriority: "medium" }); break;
      case "send_email": setActionConfig({ emailSubject: "Following up on our conversation" }); break;
      case "change_status": setActionConfig({ newStatus: "contacted" }); break;
      case "notify_creator": setActionConfig({ notificationTitle: "Prospect needs attention" }); break;
    }
  };

  return (
    <div className="border border-white/[0.08] rounded-xl bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-white">New Rule</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 text-slate-400">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Rule name */}
        <div>
          <label className="text-[11px] text-slate-400 mb-1 block">Rule Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Follow up inactive leads"
            className="h-8 text-xs bg-white/[0.03] border-white/[0.08]"
          />
        </div>

        {/* IF condition */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 block">When</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
            {Object.entries(TRIGGER_LABELS).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => handleTriggerChange(key)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs transition-all border
                  ${triggerType === key
                    ? "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/30"
                    : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:border-white/10"
                  }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Trigger config */}
          <div className="pl-3 border-l-2 border-[#6366F1]/20">
            {triggerType === "status_is" && (
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setTriggerConfig({ status: s })}
                    className={`px-2 py-1 rounded text-[11px] border transition-all ${
                      triggerConfig.status === s
                        ? "bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30"
                        : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:border-white/10"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {triggerType === "days_inactive" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">No activity for</span>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={triggerConfig.days || 3}
                  onChange={(e) => setTriggerConfig({ days: parseInt(e.target.value) || 3 })}
                  className="h-7 w-16 text-xs bg-white/[0.03] border-white/[0.08] text-center"
                />
                <span className="text-xs text-slate-400">days</span>
              </div>
            )}
            {triggerType === "missing_info" && (
              <div className="flex flex-wrap gap-1.5">
                {INFO_FIELDS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      const fields = triggerConfig.fields || [];
                      setTriggerConfig({
                        fields: fields.includes(f) ? fields.filter((x: string) => x !== f) : [...fields, f],
                      });
                    }}
                    className={`px-2 py-1 rounded text-[11px] border transition-all ${
                      (triggerConfig.fields || []).includes(f)
                        ? "bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30"
                        : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:border-white/10"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
            {triggerType === "value_above" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Value above $</span>
                <Input
                  type="number"
                  min={0}
                  value={(triggerConfig.valueThreshold || 0) / 100}
                  onChange={(e) => setTriggerConfig({ valueThreshold: (parseFloat(e.target.value) || 0) * 100 })}
                  className="h-7 w-24 text-xs bg-white/[0.03] border-white/[0.08] text-center"
                />
              </div>
            )}
            {triggerType === "new_prospect" && (
              <p className="text-[11px] text-slate-500">Triggers for every new prospect that starts a conversation.</p>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center gap-2 text-slate-600">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <ArrowRight className="w-4 h-4" />
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* THEN action */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 block">Then</label>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {Object.entries(ACTION_LABELS).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => handleActionChange(key)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs transition-all border
                  ${actionType === key
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                    : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:border-white/10"
                  }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Action config */}
          <div className="pl-3 border-l-2 border-cyan-500/20">
            {actionType === "create_action" && (
              <div className="space-y-2">
                <Input
                  value={actionConfig.actionTitle || ""}
                  onChange={(e) => setActionConfig({ ...actionConfig, actionTitle: e.target.value })}
                  placeholder="Action title"
                  className="h-7 text-xs bg-white/[0.03] border-white/[0.08]"
                />
                <div className="flex gap-1.5">
                  {["low", "medium", "high"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setActionConfig({ ...actionConfig, actionPriority: p })}
                      className={`px-2 py-1 rounded text-[11px] border transition-all ${
                        actionConfig.actionPriority === p
                          ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                          : "bg-white/[0.02] text-slate-400 border-white/[0.06]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {actionType === "send_email" && (
              <Input
                value={actionConfig.emailSubject || ""}
                onChange={(e) => setActionConfig({ ...actionConfig, emailSubject: e.target.value })}
                placeholder="Email subject"
                className="h-7 text-xs bg-white/[0.03] border-white/[0.08]"
              />
            )}
            {actionType === "change_status" && (
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setActionConfig({ newStatus: s })}
                    className={`px-2 py-1 rounded text-[11px] border transition-all ${
                      actionConfig.newStatus === s
                        ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                        : "bg-white/[0.02] text-slate-400 border-white/[0.06]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {actionType === "notify_creator" && (
              <Input
                value={actionConfig.notificationTitle || ""}
                onChange={(e) => setActionConfig({ ...actionConfig, notificationTitle: e.target.value })}
                placeholder="Notification title"
                className="h-7 text-xs bg-white/[0.03] border-white/[0.08]"
              />
            )}
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={() => {
            if (!name.trim()) { toast.error("Give your rule a name"); return; }
            createRule.mutate({
              workerId,
              name: name.trim(),
              triggerType: triggerType as any,
              triggerConfig,
              actionType: actionType as any,
              actionConfig,
            });
          }}
          disabled={createRule.isPending || !name.trim()}
          className="w-full h-9 text-xs bg-[#6366F1] hover:bg-[#5558E8]"
        >
          {createRule.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
          Create Rule
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Rule Card
// ============================================

function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const triggerInfo = TRIGGER_LABELS[rule.triggerType] || TRIGGER_LABELS.status_is;
  const actionInfo = ACTION_LABELS[rule.actionType] || ACTION_LABELS.create_action;
  const TriggerIcon = triggerInfo.icon;
  const ActionIcon = actionInfo.icon;

  // Build human-readable condition
  let conditionText = triggerInfo.label;
  const config = rule.triggerConfig || {};
  if (rule.triggerType === "status_is") conditionText += `: ${config.status}`;
  if (rule.triggerType === "days_inactive") conditionText += ` ${config.days} days`;
  if (rule.triggerType === "missing_info") conditionText += `: ${(config.fields || []).join(", ")}`;
  if (rule.triggerType === "value_above") conditionText += ` $${((config.valueThreshold || 0) / 100).toFixed(0)}`;

  // Build human-readable action
  let actionText = actionInfo.label;
  const aConfig = rule.actionConfig || {};
  if (rule.actionType === "create_action" && aConfig.actionTitle) actionText = aConfig.actionTitle;
  if (rule.actionType === "send_email" && aConfig.emailSubject) actionText = `Email: ${aConfig.emailSubject}`;
  if (rule.actionType === "change_status" && aConfig.newStatus) actionText = `Move to: ${aConfig.newStatus}`;
  if (rule.actionType === "notify_creator" && aConfig.notificationTitle) actionText = aConfig.notificationTitle;

  return (
    <div className={`border rounded-lg transition-all ${rule.isActive ? "border-white/[0.08] bg-white/[0.02]" : "border-white/[0.04] bg-white/[0.01] opacity-60"}`}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Active indicator */}
        <button onClick={onToggle} className="shrink-0" title={rule.isActive ? "Pause rule" : "Activate rule"}>
          {rule.isActive ? (
            <div className="w-2 h-2 rounded-full bg-green-400 ring-2 ring-green-400/20" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-slate-600 ring-2 ring-slate-600/20" />
          )}
        </button>

        {/* Rule summary */}
        <button onClick={() => setExpanded(!expanded)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-white truncate">{rule.name}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500">
            <TriggerIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{conditionText}</span>
            <ArrowRight className="w-3 h-3 shrink-0 text-slate-600" />
            <ActionIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{actionText}</span>
          </div>
        </button>

        {/* Stats + controls */}
        <div className="flex items-center gap-1 shrink-0">
          {rule.totalExecutions > 0 && (
            <span className="text-[10px] text-slate-500 tabular-nums mr-1">{rule.totalExecutions}x</span>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-slate-500 hover:text-white">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onDelete} className="p-1 text-slate-600 hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500 block mb-0.5">Condition</span>
              <span className="text-slate-300">{triggerInfo.description}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Action</span>
              <span className="text-slate-300">{actionText}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Max per contact</span>
              <span className="text-slate-300">{rule.maxExecutionsPerProspect || 1}x</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Cooldown</span>
              <span className="text-slate-300">{rule.cooldownHours || 24}h</span>
            </div>
          </div>
          {rule.lastExecutedAt && (
            <p className="text-[10px] text-slate-600 mt-2">
              Last run: {new Date(rule.lastExecutedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main FollowUpRules Component
// ============================================

export function FollowUpRules({ workerId }: FollowUpRulesProps) {
  const [showBuilder, setShowBuilder] = useState(false);

  const { data: rules, isLoading, refetch } = () => {}

  const toggleRule = () => {}

  const deleteRule = () => {}

  const runNow = () => {}

  const activeCount = (rules || []).filter((r) => r.isActive).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Follow-Up Rules
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {rules?.length || 0} rules · {activeCount} active
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => runNow.mutate({ workerId })}
              disabled={runNow.isPending || activeCount === 0}
              className="h-7 text-[11px] border-white/[0.08] text-slate-300 hover:text-white"
            >
              {runNow.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Rocket className="w-3 h-3 mr-1" />}
              Run Now
            </Button>
            <Button
              size="sm"
              onClick={() => setShowBuilder(true)}
              className="h-7 text-[11px] bg-[#6366F1] hover:bg-[#5558E8]"
            >
              <Plus className="w-3 h-3 mr-1" />
              New Rule
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Builder */}
        {showBuilder && (
          <RuleBuilder
            workerId={workerId}
            onClose={() => setShowBuilder(false)}
            onCreated={() => refetch()}
          />
        )}

        {/* Rules list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : (rules || []).length === 0 && !showBuilder ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Zap className="w-10 h-10 text-slate-700 mb-3" />
            <h3 className="text-sm font-medium text-slate-400 mb-1">No follow-up rules yet</h3>
            <p className="text-[11px] text-slate-600 max-w-xs mb-4">
              Create rules to automatically follow up with prospects based on their pipeline status, activity, or missing information.
            </p>
            <Button
              size="sm"
              onClick={() => setShowBuilder(true)}
              className="h-8 text-xs bg-[#6366F1] hover:bg-[#5558E8]"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Your First Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {(rules || []).map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => toggleRule.mutate({ ruleId: rule.id, isActive: !rule.isActive })}
                onDelete={() => {
                  if (confirm("Delete this rule?")) {
                    deleteRule.mutate({ ruleId: rule.id });
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Explanation */}
        {(rules || []).length > 0 && (
          <div className="mt-4 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Rules are evaluated when you click "Run Now". Each rule checks all your contacts against its condition and executes the action for matches. Rules respect cooldown periods and max execution limits to prevent spam.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
