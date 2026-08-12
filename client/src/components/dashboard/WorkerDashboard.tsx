import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
// import { trpc } from "@/lib/trpc";
import { 
  Server, 
  Cpu, 
  Activity,
  Users, 
  DollarSign, 
  MessageSquare, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Target,
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CreditCard,
  UserPlus,
  BarChart3,
  Bot,
  Zap,
  CheckCircle2,
  Calendar,
  FileText,
  Search,
  Mail,
  Phone,
  Globe,
  Shield,
  Workflow,
  Link,
  Code,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Layout,
  Palette,
} from "lucide-react";
import { useState } from "react";
import { DigitalWorker } from "../../../../drizzle/schema";

interface WorkerDashboardProps {
  worker: DigitalWorker;
  onUpdate?: () => void;
}

// Define workflow types based on industry/profession
const getWorkflowsForWorker = (worker: DigitalWorker) => {

  const worker1 = worker[0];

  const profession = worker?.professionalTitle?.toLowerCase() || "";
  const headline = worker?.headline?.toLowerCase() || "";
  const industry = worker?.industry || "other";
  
  // Base workflows available to all workers
  const baseWorkflows = [
    { id: "chat", name: "Answer Questions", icon: MessageSquare, description: "Respond to client inquiries in real-time", status: "active" },
    { id: "knowledge", name: "Knowledge Lookup", icon: Search, description: "Search trained knowledge base for answers", status: "active" },
  ];
  
  // Industry-specific workflows
  const industryWorkflows: Record<string, Array<{ id: string; name: string; icon: any; description: string; status: string }>> = {
    travel_leisure: [
      { id: "booking", name: "Trip Planning", icon: Calendar, description: "Create personalized travel itineraries", status: "active" },
      { id: "quote", name: "Quote Generation", icon: FileText, description: "Generate detailed trip quotes", status: "active" },
      { id: "followup", name: "Follow-up Sequences", icon: Mail, description: "Automated nurture campaigns", status: "ready" },
    ],
    real_estate: [
      { id: "property", name: "Property Matching", icon: Search, description: "Match clients with ideal properties", status: "active" },
      { id: "valuation", name: "Market Analysis", icon: TrendingUp, description: "Provide property valuations", status: "active" },
      { id: "scheduling", name: "Viewing Scheduler", icon: Calendar, description: "Book property viewings", status: "ready" },
    ],
    financial_services: [
      { id: "assessment", name: "Risk Assessment", icon: Shield, description: "Evaluate client risk profiles", status: "active" },
      { id: "planning", name: "Financial Planning", icon: FileText, description: "Create personalized financial plans", status: "active" },
      { id: "review", name: "Portfolio Review", icon: BarChart3, description: "Analyze investment portfolios", status: "ready" },
    ],
    healthcare: [
      { id: "triage", name: "Symptom Triage", icon: Activity, description: "Initial symptom assessment", status: "active" },
      { id: "appointment", name: "Appointment Booking", icon: Calendar, description: "Schedule consultations", status: "active" },
      { id: "followup", name: "Care Follow-up", icon: Phone, description: "Post-visit check-ins", status: "ready" },
    ],
    legal: [
      { id: "intake", name: "Client Intake", icon: FileText, description: "Gather case information", status: "active" },
      { id: "research", name: "Legal Research", icon: Search, description: "Research relevant precedents", status: "active" },
      { id: "document", name: "Document Drafting", icon: FileText, description: "Draft legal documents", status: "ready" },
    ],
    other: [
      { id: "consultation", name: "Consultation", icon: MessageSquare, description: "Provide expert consultations", status: "active" },
      { id: "scheduling", name: "Appointment Booking", icon: Calendar, description: "Schedule meetings", status: "ready" },
      { id: "followup", name: "Follow-up", icon: Mail, description: "Automated follow-ups", status: "ready" },
    ],
  };
  
  return [...baseWorkflows, ...(industryWorkflows[industry] || industryWorkflows.other)];
};

// Generate AI model summary based on worker data
const generateModelSummary = (worker: DigitalWorker) => {
  
  const worker1 = worker[0];

  // console.log("worker", worker)
  // console.log("Generating model summary for worker:", worker1);
  const name = worker?.name || "AI Assistant";
  const title = worker?.headline || "Digital Expert";
  const experience = worker?.yearsOfExperience ? `${worker?.yearsOfExperience}+ years of expertise` : "extensive expertise";
  const location = worker?.location || "your region";
  const aboutYourself = worker?.about_yourself || "tailored to your business context";
  const mainGoal = (worker as { main_goal?: string; mainGoal?: string })?.main_goal || (worker as { mainGoal?: string })?.mainGoal;
  const expertise = (worker as { expertise?: string })?.expertise;
  const targetAudience =
    (worker as { target_audience?: string; targetAudience?: string })?.target_audience ||
    (worker as { targetAudience?: string })?.targetAudience;
  const uniqueValue =
    (worker as { what_makes_you_unique?: string; uniqueValue?: string })?.what_makes_you_unique ||
    (worker as { uniqueValue?: string })?.uniqueValue;
  const tone = worker?.tone || worker?.personality;
  
  return {
    name,
    title,
    tagline: title,
    description: `This AI model has been trained to serve as a ${title}. Based in ${location}${expertise ? `, with expertise in ${expertise}` : ""}. it delivers consistent, knowledgeable responses 24/7.`,
    capabilities: [
      "Answers questions using your trained knowledge base",
      `Personality ${tone} tone and communication style`,
      "Handles multiple conversations simultaneously",
      "Never forgets important details or context",
      "Available around the clock without breaks",
      // ...(aboutYourself ? [`About: ${aboutYourself}`] : []),
      // ...(mainGoal ? [`Main goal: ${mainGoal}`] : []),
      // ...(targetAudience ? [`Target audience: ${targetAudience}`] : []),
      // ...(uniqueValue ? [`Unique value: ${uniqueValue}`] : []),
      // ...(experience ? [`Experience level: ${experience}`] : []),
    ],
    tone: tone?.charAt(0).toUpperCase() + tone?.slice(1),
  };
};

export default function WorkerDashboard({ worker, onUpdate }: WorkerDashboardProps) {
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(true);
  const [sharingExpanded, setSharingExpanded] = useState(true);
  const [workflowsExpanded, setWorkflowsExpanded] = useState(true);
  const [commercialsExpanded, setCommercialsExpanded] = useState(true);
  const [performanceExpanded, setPerformanceExpanded] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWidget, setCopiedWidget] = useState(false);
  const [websiteExpanded, setWebsiteExpanded] = useState(true);

  // const worker1 = {...worker[0], id: 1}; // WIP ID
  // Website templates based on industry/profession
  const getWebsiteTemplates = () => {
    const profession = worker?.professionalTitle?.toLowerCase() || '';
    const industry = worker?.industry?.toLowerCase() || '';
    
    const templates = [
      {
        id: 'travel',
        name: 'Travel Agency',
        description: 'Perfect for travel advisors, tour operators, and destination specialists',
        color: 'from-blue-500 to-cyan-500',
        icon: '✈️',
        match: ['travel', 'tourism', 'vacation', 'tour', 'destination', 'golf travel'],
      },
      {
        id: 'finance',
        name: 'Financial Services',
        description: 'Ideal for financial advisors, wealth managers, and investment consultants',
        color: 'from-emerald-500 to-green-500',
        icon: '💰',
        match: ['finance', 'financial', 'advisor', 'wealth', 'investment', 'banking', 'accounting'],
      },
      {
        id: 'realestate',
        name: 'Real Estate',
        description: 'Great for real estate agents, property managers, and brokers',
        color: 'from-orange-500 to-amber-500',
        icon: '🏠',
        match: ['real estate', 'property', 'realtor', 'broker', 'housing'],
      },
      {
        id: 'healthcare',
        name: 'Healthcare',
        description: 'Designed for healthcare providers, clinics, and wellness professionals',
        color: 'from-red-500 to-pink-500',
        icon: '🏥',
        match: ['health', 'medical', 'doctor', 'clinic', 'wellness', 'therapy'],
      },
      {
        id: 'legal',
        name: 'Legal Services',
        description: 'Tailored for law firms, attorneys, and legal consultants',
        color: 'from-slate-500 to-gray-500',
        icon: '⚖️',
        match: ['legal', 'law', 'attorney', 'lawyer', 'paralegal'],
      },
      {
        id: 'consulting',
        name: 'Business Consulting',
        description: 'Suitable for consultants, coaches, and business advisors',
        color: 'from-purple-500 to-indigo-500',
        icon: '📊',
        match: ['consult', 'coach', 'business', 'strategy', 'management'],
      },
    ];
    
    // Find matching templates based on profession/industry
    const matchingTemplates = templates.filter(t => 
      t.match.some(keyword => 
        profession.includes(keyword) || industry.includes(keyword)
      )
    );
    
    // If no matches, return top 3 generic templates
    if (matchingTemplates.length === 0) {
      return templates.slice(0, 3);
    }
    
    // Return matching templates first, then fill with others
    const otherTemplates = templates.filter(t => !matchingTemplates.includes(t));
    return [...matchingTemplates, ...otherTemplates].slice(0, 3);
  };
  
  const websiteTemplates = getWebsiteTemplates();

  // Generate public URLs
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const publicChatUrl = `${baseUrl}/chat/${worker?.agent_id}`;
  const laravelDecryptKey = import.meta.env.VITE_LARAVEL_DECRYPT_KEY as string | undefined;
  const widgetCode = `<script src="${baseUrl}/widget.js" data-worker-id="${worker?.agent_id}"></script>`;

  // Fetch demo metrics for performance
  const { data: metrics } = () => {}
  /* trpc.performance.generateDemoMetrics.useQuery(
    { workerId: worker?.id },
    { enabled: !!worker?.id }
  ); */

  // Calculate aggregated stats from metrics
  const latestMetric = metrics?.[0];
  const avgLatency = metrics?.length 
    ? Math.round(metrics.reduce((sum, m) => sum + (m.avgLatencyMs || 0), 0) / metrics.length)
    : 0;
  const avgAccuracy = metrics?.length
    ? Math.round(metrics.reduce((sum, m) => sum + (m.accuracyScore || 0), 0) / metrics.length)
    : 0;
  const avgHallucination = metrics?.length
    ? Math.round(metrics.reduce((sum, m) => sum + (m.hallucinationScore || 0), 0) / metrics.length)
    : 0;
  const totalRequests = metrics?.reduce((sum, m) => sum + (m.totalRequests || 0), 0) || 0;
  const totalThumbsUp = metrics?.reduce((sum, m) => sum + (m.thumbsUp || 0), 0) || 0;
  const totalThumbsDown = metrics?.reduce((sum, m) => sum + (m.thumbsDown || 0), 0) || 0;
  const satisfactionRate = totalThumbsUp + totalThumbsDown > 0
    ? Math.round((totalThumbsUp / (totalThumbsUp + totalThumbsDown)) * 100)
    : 0;

  // Demo commercial data
  const commercialMetrics = {
    totalUsers: 1247,
    userGrowth: 12.5,
    monthlyRevenue: 24850,
    revenueGrowth: 8.3,
    totalConversations: 15420,
    conversationGrowth: 23.1,
    avgRevenuePerUser: 19.93,
    arpuGrowth: -2.1,
    newUsersThisMonth: 156,
    activeUsers: 892,
    churnRate: 3.2,
    conversionRate: 4.8,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const GrowthIndicator = ({ value, size = "sm" }: { value: number; size?: "sm" | "xs" }) => {
    const isPositive = value >= 0;
    const sizeClasses = size === "sm" ? "text-sm" : "text-xs";
    const iconSize = size === "sm" ? "w-4 h-4" : "w-3 h-3";
    return (
      <span className={`flex items-center ${sizeClasses} ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <ArrowUpRight className={iconSize} /> : <ArrowDownRight className={iconSize} />}
        {Math.abs(value)}%
      </span>
    );
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 400) return "text-emerald-400";
    if (ms < 700) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreColor = (score: number, inverse = false) => {
    if (inverse) {
      if (score < 10) return "text-emerald-400";
      if (score < 20) return "text-yellow-400";
      return "text-red-400";
    }
    if (score > 85) return "text-emerald-400";
    if (score > 70) return "text-yellow-400";
    return "text-red-400";
  };

  const modelSummary = generateModelSummary(worker);
  const workflows = getWorkflowsForWorker(worker);

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your digital worker's capabilities and performance
        </p>
      </div>

      {/* AI Model Overview Section - Combined with Workflows */}
      <Card className="bg-gradient-to-br from-[#6366F1]/10 via-slate-800/30 to-[#22D3EE]/10 border-slate-700/50 overflow-hidden">
        <CardHeader 
          className="py-4 px-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
          onClick={() => setAiSummaryExpanded(!aiSummaryExpanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#22D3EE]">
                <Bot className="w-4 h-4 text-white" />
              </div>
              AI Model Overview
              <Badge variant="outline" className="ml-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                Active
              </Badge>
            </CardTitle>
            {aiSummaryExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {aiSummaryExpanded && (
          <CardContent className="pt-0 px-4 pb-4 space-y-6">
            {/* Model Identity & Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Model Identity */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#22D3EE] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#6366F1]/20">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{modelSummary.name}</h3>
                    <p className="text-sm text-cyan-400 font-medium">{modelSummary.tagline}</p>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                      {modelSummary.description}
                    </p>
                  </div>
                </div>
                
                {/* Language Response Capabilities */}
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    Language Response Capabilities
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {modelSummary.capabilities.map((capability, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-300">{capability}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Model Stats */}
              {/* <div className="space-y-3">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <h4 className="text-xs font-medium text-slate-400 mb-3">Model Configuration</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Base Model</span>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                        {latestMetric?.modelType || "GPT-4 Turbo"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Version</span>
                      <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                        {latestMetric?.modelVersion || "qiko-v2.1"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Communication Style</span>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                        {modelSummary.tone}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Environment</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                        Production
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Training Status</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                      Complete
                    </Badge>
                  </div>
                  <Progress value={100} className="h-1.5" />
                  <p className="text-xs text-slate-500 mt-2">Model is fully trained and ready to serve</p>
                </div>
              </div> */}
            </div>

            {/* Divider */}
            {/* <div className="border-t border-slate-700/50" /> */}

            {/* Workflow Capabilities */}
            {/* <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-purple-400" />
                  Workflow Capabilities
                  <span className="text-xs text-slate-400 font-normal ml-2">
                    {workflows.filter(w => w.status === "active").length} active
                  </span>
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {workflows.map((workflow) => {
                  const Icon = workflow.icon;
                  const isActive = workflow.status === "active";
                  return (
                    <div 
                      key={workflow.id}
                      className={`
                        relative rounded-xl p-3 transition-all
                        ${isActive 
                          ? 'bg-slate-700/40 hover:bg-slate-700/60 cursor-pointer' 
                          : 'bg-slate-800/30 opacity-60'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`
                          p-2 rounded-lg flex-shrink-0
                          ${isActive 
                            ? 'bg-gradient-to-br from-[#6366F1]/20 to-[#22D3EE]/20' 
                            : 'bg-slate-700/50'
                          }
                        `}>
                          <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                              {workflow.name}
                            </h5>
                            {isActive ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/30 text-[10px] px-1.5 py-0">
                                Ready
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                            {workflow.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Workflows are automatically enabled based on your training data and industry
              </p>
            </div> */}
          </CardContent>
        )}
      </Card>

      {/* Share & Embed Section */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader 
          className="py-3 px-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
          onClick={() => setSharingExpanded(!sharingExpanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-400" />
              Share & Embed
            </CardTitle>
            {sharingExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {sharingExpanded && (
          <CardContent className="pt-0 px-4 pb-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Public Chat Link */}
              <div className="bg-slate-700/30 rounded-xl p-4 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 flex-shrink-0">
                    <Globe className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white">Public Chat Link</h4>
                    <p className="text-xs text-slate-400">Share this link to let anyone chat with your AI</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-600/50 overflow-hidden">
                    <p className="text-sm text-cyan-400 font-mono truncate">{publicChatUrl}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 hover:bg-slate-700 flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(publicChatUrl);
                      setCopiedLink(true);
                      console.log("setTimeout 13");
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 hover:bg-slate-700 flex-shrink-0"
                    onClick={() => window.open(publicChatUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Widget Embed Code */}
              <div className="bg-slate-700/30 rounded-xl p-4 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-purple-500/20 flex-shrink-0">
                    <Code className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white">Website Widget</h4>
                    <p className="text-xs text-slate-400">Add this code to embed the chat on your website</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-600/50 overflow-hidden">
                    <p className="text-xs text-purple-400 font-mono truncate">{widgetCode}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 hover:bg-slate-700 flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(widgetCode);
                      setCopiedWidget(true);
                      console.log("setTimeout 14");
                      setTimeout(() => setCopiedWidget(false), 2000);
                    }}
                  >
                    {copiedWidget ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Paste before the closing &lt;/body&gt; tag
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Create Website Section */}
      {/* <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader 
          className="py-3 px-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
          onClick={() => setWebsiteExpanded(!websiteExpanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layout className="w-4 h-4 text-pink-400" />
              Create Website
              <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/30 text-[10px] ml-2">
                New
              </Badge>
            </CardTitle>
            {websiteExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {websiteExpanded && (
          <CardContent className="pt-0 px-4 pb-4">
            <p className="text-sm text-slate-400 mb-4">
              Launch a professional website for your AI assistant. Choose a template that matches your industry.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {websiteTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group relative bg-slate-700/30 rounded-xl p-4 hover:bg-slate-700/50 transition-all cursor-pointer border border-transparent hover:border-slate-600"
                  onClick={() => {
                    // TODO: Navigate to website builder with template
                    window.open(`/app/website-builder?workerId=${worker?.id}&template=${template.id}`, '_blank');
                  }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center text-2xl mb-3 shadow-lg`}>
                    {template.icon}
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                    {template.name}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Palette className="w-3 h-3" />
                Templates are customized based on your worker's specialty
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 hover:bg-slate-700 text-xs"
                onClick={() => window.open('/app/website-builder?workerId=' + worker?.id, '_blank')}
              >
                View All Templates
              </Button>
            </div>
          </CardContent>
        )}
      </Card> */}

      {/* Commercials Section */}
      {/* <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader 
          className="py-3 px-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
          onClick={() => setCommercialsExpanded(!commercialsExpanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Commercials
            </CardTitle>
            {commercialsExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {commercialsExpanded && (
          <CardContent className="pt-0 px-4 pb-4">
           
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <GrowthIndicator value={commercialMetrics.userGrowth} size="xs" />
                </div>
                <p className="text-xl font-bold text-white">{formatNumber(commercialMetrics.totalUsers)}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <GrowthIndicator value={commercialMetrics.revenueGrowth} size="xs" />
                </div>
                <p className="text-xl font-bold text-white">{formatCurrency(commercialMetrics.monthlyRevenue)}</p>
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <GrowthIndicator value={commercialMetrics.conversationGrowth} size="xs" />
                </div>
                <p className="text-xl font-bold text-white">{formatNumber(commercialMetrics.totalConversations)}</p>
                <p className="text-xs text-muted-foreground">Conversations</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <GrowthIndicator value={commercialMetrics.arpuGrowth} size="xs" />
                </div>
                <p className="text-xl font-bold text-white">${commercialMetrics.avgRevenuePerUser.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">ARPU</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center justify-between bg-slate-700/20 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-muted-foreground">New Users</span>
                </div>
                <span className="text-sm font-semibold text-white">{commercialMetrics.newUsersThisMonth}</span>
              </div>
              <div className="flex items-center justify-between bg-slate-700/20 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">Active</span>
                </div>
                <span className="text-sm font-semibold text-white">{commercialMetrics.activeUsers}</span>
              </div>
              <div className="flex items-center justify-between bg-slate-700/20 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3 h-3 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Conversion</span>
                </div>
                <span className="text-sm font-semibold text-emerald-400">{commercialMetrics.conversionRate}%</span>
              </div>
              <div className="flex items-center justify-between bg-slate-700/20 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-muted-foreground">Churn</span>
                </div>
                <span className="text-sm font-semibold text-red-400">{commercialMetrics.churnRate}%</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card> */}

      {/* Performance Section */}
      {/* <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader 
          className="py-3 px-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
          onClick={() => setPerformanceExpanded(!performanceExpanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Performance
            </CardTitle>
            {performanceExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {performanceExpanded && (
          <CardContent className="pt-0 px-4 pb-4">
           
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className={`text-xs ${getLatencyColor(avgLatency)}`}>
                    {avgLatency < 400 ? "Fast" : avgLatency < 700 ? "OK" : "Slow"}
                  </span>
                </div>
                <p className={`text-xl font-bold ${getLatencyColor(avgLatency)}`}>{avgLatency}ms</p>
                <p className="text-xs text-muted-foreground">Avg Latency</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span className={`text-xs ${getScoreColor(avgAccuracy)}`}>
                    {avgAccuracy > 85 ? "Excellent" : avgAccuracy > 70 ? "Good" : "Needs Work"}
                  </span>
                </div>
                <p className={`text-xl font-bold ${getScoreColor(avgAccuracy)}`}>{avgAccuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className={`text-xs ${getScoreColor(avgHallucination, true)}`}>
                    {avgHallucination < 10 ? "Low" : avgHallucination < 20 ? "Medium" : "High"}
                  </span>
                </div>
                <p className={`text-xl font-bold ${getScoreColor(avgHallucination, true)}`}>{avgHallucination}%</p>
                <p className="text-xs text-muted-foreground">Hallucination</p>
              </div>
              
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-emerald-400">+12%</span>
                </div>
                <p className="text-xl font-bold text-white">{totalRequests.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Requests</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-700/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">User Satisfaction</span>
                  <span className="text-sm font-semibold text-emerald-400">{satisfactionRate}%</span>
                </div>
                <Progress value={satisfactionRate} className="h-1.5" />
                <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>👍 {totalThumbsUp}</span>
                  <span>👎 {totalThumbsDown}</span>
                </div>
              </div>
              
              <div className="bg-slate-700/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Response Quality</span>
                  <span className="text-sm font-semibold text-cyan-400">{avgAccuracy}%</span>
                </div>
                <Progress value={avgAccuracy} className="h-1.5" />
                <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>Accuracy Score</span>
                  <span>Target: 90%</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card> */}

      {/* Quick Actions */}
      {/* <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700">
          <Sparkles className="w-3 h-3 mr-1.5" />
          Training Boost Available
        </Button>
        <Button variant="outline" size="sm" className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700">
          <DollarSign className="w-3 h-3 mr-1.5" />
          Connect Payments
        </Button>
      </div> */}
    </div>
  );
}
