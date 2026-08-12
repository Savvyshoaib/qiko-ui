import { useState } from "react";
// import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Link2, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles,
  Hotel,
  Plane,
  Utensils,
  Cloud,
  Calendar,
  CreditCard,
  Database,
  ExternalLink,
  Settings,
  Play,
  X,
  Phone,
  Loader2,
  Eye,
  EyeOff,
  Crown,
  Lock,
  Check,
  Zap,
  Globe,
  MessageSquare,
  Mail,
  Webhook,
  Plug
} from "lucide-react";
import { toast } from "sonner";
import type { DigitalWorker } from "../../../../drizzle/schema";
import CalendlyView from "./CalendlyView";
import CalendlyToken from "./CalendlyToken";

type DashboardView = "chat" | "train" | "data" | "rapidqa" | "synthetic" | "readiness" | "pricing" | "export" | "connections" | "commercials" | "performance" | "settings" | "optimiser";
type ConnectionStep = 'overview' | 'integrations' | 'apis' | 'voice' | 'third_party';

interface ConnectionsProps {
  worker: DigitalWorker;
  onUpdate?: () => void;
  onNavigate?: (view: DashboardView) => void;
}

const CONNECTION_STEPS = [
  { 
    id: 'overview' as const, 
    label: 'Overview', 
    icon: Link2, 
    color: '#6366F1',
    description: 'Connection status'
  },
  { 
    id: 'integrations' as const, 
    label: 'Integrations', 
    icon: Zap, 
    color: '#22D3EE',
    description: 'Third-party apps'
  },
  { 
    id: 'apis' as const, 
    label: 'APIs', 
    icon: Webhook, 
    color: '#10B981',
    description: 'Custom endpoints'
  },
  { 
    id: 'voice' as const, 
    label: 'Voice', 
    icon: Phone, 
    color: '#F59E0B',
    description: 'Calling & SMS'
  },
  { 
    id: 'third_party' as const, 
    label: '3rd Party', 
    icon: Plug, 
    color: '#A855F7',
    description: 'Vapi & Calendly'
  },
];

const INTEGRATIONS = [
  { id: 'calendar', name: 'Google Calendar', icon: Calendar, color: '#4285F4', connected: false },
  { id: 'email', name: 'Gmail / Email', icon: Mail, color: '#EA4335', connected: false },
  { id: 'crm', name: 'CRM System', icon: Database, color: '#7C3AED', connected: false },
  { id: 'payments', name: 'Stripe', icon: CreditCard, color: '#635BFF', connected: true },
  { id: 'booking', name: 'Booking System', icon: Hotel, color: '#003580', connected: false },
  { id: 'weather', name: 'Weather API', icon: Cloud, color: '#00BFFF', connected: false },
];

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    label: "Pending",
  },
  active: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Active",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    label: "Error",
  },
};

export default function Connections({ worker, onUpdate, onNavigate }: ConnectionsProps) {
  const [activeStep, setActiveStep] = useState<ConnectionStep>('overview');
  const [showApiForm, setShowApiForm] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiDescription, setApiDescription] = useState("");
  const [connectingCalendar, setConnectingCalendar] = useState(false);

  const { data: connections, isLoading, refetch } = () => {}
  /*  trpc.connections.list.useQuery(
    { workerId: worker.id },
    { enabled: !!worker.id }
  ); */

  // OAuth connections query
  const { data: oauthConnections, refetch: refetchOAuth } = () => {}
  /*  trpc.oauth.listConnections.useQuery(
    { workerId: worker.id },
    { enabled: !!worker.id }
  ); */

  // Check if Google Calendar is connected
  const googleCalendarConnection = oauthConnections?.find(c => c.provider === 'google_calendar' && c.status === 'active');

  const activeConnections = connections?.filter(c => c.status === 'active') || [];
  const pendingConnections = connections?.filter(c => c.status === 'pending') || [];

  // Handle Google Calendar connect
  const handleConnectGoogleCalendar = async () => {
    setConnectingCalendar(true);
    try {
      // For now, show a toast that this requires Google OAuth setup
      toast.info('Google Calendar integration requires OAuth setup. Contact support to enable this feature.', {
        duration: 5000,
      });
      // In production, this would redirect to Google OAuth:
      // const result = await trpc.oauth.getGoogleAuthUrl.mutate({ workerId: worker.id });
      // window.location.href = result.url;
    } catch (error) {
      toast.error('Failed to connect Google Calendar');
    } finally {
      setConnectingCalendar(false);
    }
  };

  const getStepProgress = (stepId: ConnectionStep) => {
    switch (stepId) {
      case 'overview': return 100;
      case 'integrations': return activeConnections.length > 0 ? 100 : 0;
      case 'apis': return 50;
      case 'voice': return 0;
      case 'third_party': return 0;
      default: return 0;
    }
  };

  const handleAddApi = () => {
    if (!apiEndpoint.trim()) {
      toast.error('Please enter an API endpoint');
      return;
    }
    toast.success('API endpoint added!');
    setApiEndpoint("");
    setApiDescription("");
    setShowApiForm(false);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 'overview':
        return (
          <div className="space-y-4">
            {/* Connection Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-white">{activeConnections.length}</p>
                <p className="text-xs text-slate-400">Active</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-white">{pendingConnections.length}</p>
                <p className="text-xs text-slate-400">Pending</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-white">{INTEGRATIONS.length}</p>
                <p className="text-xs text-slate-400">Available</p>
              </div>
            </div>

            {/* Active Connections */}
            {activeConnections.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white mb-2">Active Connections</h3>
                <div className="space-y-2">
                  {activeConnections.map((conn) => (
                    <div 
                      key={conn.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{conn.name}</p>
                        <p className="text-xs text-slate-400">{conn.serviceType}</p>
                      </div>
                      <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => setActiveStep('integrations')}
                className="h-10 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
              <Button 
                onClick={() => setActiveStep('apis')}
                variant="outline"
                className="h-10 border-white/10 text-white hover:bg-white/5 text-sm"
              >
                <Webhook className="w-4 h-4 mr-2" />
                Custom API
              </Button>
            </div>

            {/* Tip */}
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-indigo-300">Pro Tip</p>
                  <p className="text-xs text-slate-400">Connect your calendar to let your AI schedule appointments automatically.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-3">
            {INTEGRATIONS.map((integration) => {
              const Icon = integration.icon;
              // Check if this integration is connected via OAuth
              const isConnected = integration.id === 'calendar' 
                ? !!googleCalendarConnection 
                : integration.id === 'payments' 
                  ? true // Stripe is always shown as connected for demo
                  : false;
              const connectionEmail = integration.id === 'calendar' && googleCalendarConnection 
                ? googleCalendarConnection.accountEmail 
                : null;
              
              return (
                <div 
                  key={integration.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isConnected 
                      ? 'bg-green-500/5 border-green-500/20' 
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${integration.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: integration.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{integration.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {isConnected 
                        ? (connectionEmail || 'Connected') 
                        : 'Not connected'}
                    </p>
                  </div>
                  {isConnected ? (
                    <Button 
                      size="sm"
                      variant="outline"
                      className="h-7 border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      disabled={connectingCalendar && integration.id === 'calendar'}
                      onClick={() => {
                        if (integration.id === 'calendar') {
                          handleConnectGoogleCalendar();
                        } else {
                          toast.info(`Connect ${integration.name} - Coming soon!`);
                        }
                      }}
                      className="h-7 bg-white/10 text-white hover:bg-white/20 text-xs"
                    >
                      {connectingCalendar && integration.id === 'calendar' ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : null}
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}

            {/* Workflow Setup Tip */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-4">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-300">Enable AI Workflows</p>
                  <p className="text-xs text-slate-400">Once connected, go to the Train tab to set up workflows that your AI can trigger automatically.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'apis':
        return (
          <div className="space-y-4">
            {/* Existing APIs */}
            {connections?.filter(c => c.serviceType === 'custom').length ? (
              <div className="space-y-2">
                {connections.filter(c => c.serviceType === 'custom').map((api) => (
                  <div 
                    key={api.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Webhook className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{api.name}</p>
                      <p className="text-xs text-slate-400 truncate">{api.apiEndpoint}</p>
                    </div>
                    <Badge className={`text-[10px] ${STATUS_CONFIG[api.status as keyof typeof STATUS_CONFIG]?.bgColor} ${STATUS_CONFIG[api.status as keyof typeof STATUS_CONFIG]?.color}`}>
                      {api.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Add API Form */}
            {showApiForm ? (
              <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">API Endpoint</Label>
                  <Input
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    placeholder="https://api.example.com/webhook"
                    className="bg-white/5 border-white/10 text-white text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400 mb-1 block">Description</Label>
                  <Textarea
                    value={apiDescription}
                    onChange={(e) => setApiDescription(e.target.value)}
                    placeholder="What does this API do?"
                    className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddApi}
                    className="flex-1 h-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-white text-sm"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Add API
                  </Button>
                  <Button 
                    onClick={() => setShowApiForm(false)}
                    variant="outline"
                    className="h-8 border-white/10 text-white hover:bg-white/5 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => setShowApiForm(true)}
                className="w-full h-10 bg-white/5 border border-dashed border-white/20 text-white hover:bg-white/10 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom API
              </Button>
            )}

            {/* API Documentation */}
            <div className="p-3 rounded-lg bg-slate-800/50 border border-white/10">
              <h4 className="text-xs font-medium text-white mb-2">Your Worker's API</h4>
              <div className="flex items-center gap-2 p-2 rounded bg-black/30">
                <code className="text-xs text-cyan-400 flex-1 truncate">
                  POST /api/workers/{worker.id}/chat
                </code>
                <Button 
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-slate-400 hover:text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(`/api/workers/${worker.id}/chat`);
                    toast.success('Copied to clipboard!');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="space-y-4">
            {/* Voice Features */}
            {[
              { id: 'calling', label: 'Phone Calling', icon: Phone, desc: 'Make & receive calls', premium: true },
              { id: 'sms', label: 'SMS Messaging', icon: MessageSquare, desc: 'Send & receive texts', premium: true },
              { id: 'voicemail', label: 'Voicemail', icon: Phone, desc: 'Handle missed calls', premium: true },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{feature.label}</span>
                      {feature.premium && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">PRO</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{feature.desc}</p>
                  </div>
                  <Button 
                    size="sm"
                    className="h-7 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs"
                    onClick={() => toast.info('Upgrade to unlock!')}
                  >
                    Upgrade
                  </Button>
                </div>
              );
            })}

            {/* Twilio Setup Info */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <Crown className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-300">Premium Feature</p>
                  <p className="text-xs text-slate-400">Voice features require a premium subscription. Upgrade to enable phone calling and SMS.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'third_party':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">Vapi & Calendly</h3>
            <p className="text-xs text-slate-400">Configure third-party voice and scheduling integrations.</p>
            <CalendlyView worker={worker as { agent_id?: string; id?: string | number }} onUpdate={onUpdate} />
            <CalendlyToken onUpdate={onUpdate} />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header - Compact */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Connections</h1>
            <p className="text-xs text-slate-400">Integrations & APIs</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
              {activeConnections.length} Active
            </Badge>
          </div>
        </div>
      </div>

      {/* Step Pills - Horizontal */}
      <div className="px-4 py-2 border-b border-white/5 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {CONNECTION_STEPS.map((step) => {
            const Icon = step.icon;
            const progress = getStepProgress(step.id);
            const isActive = activeStep === step.id;
            
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  isActive 
                    ? 'bg-white/10 border border-white/20' 
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  {progress >= 100 ? (
                    <Check className="w-3 h-3" style={{ color: step.color }} />
                  ) : (
                    <Icon className="w-3 h-3" style={{ color: step.color }} />
                  )}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto">
          {/* Step Header */}
          <div className="mb-4">
            {CONNECTION_STEPS.filter(s => s.id === activeStep).map(step => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${step.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: step.color }} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">{step.label}</h2>
                    <p className="text-xs text-slate-400">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}
