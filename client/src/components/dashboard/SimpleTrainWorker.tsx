import { useState, useEffect, useRef, useCallback } from "react";
// import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search,
  ChevronDown,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  Check,
  Lock,
  Mic,
  Phone,
  MessageSquare,
  FileText,
  Globe,
  HelpCircle,
  Workflow,
  Shield,
  Target,
  Lightbulb,
  Volume2,
  User,
  Brain,
  Briefcase,
  MapPin,
  Users,
  Award,
  BookOpen,
  Upload,
  Link,
  X,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Cpu,
  Database,
  Rocket,
  BarChart3
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { addAvatarKnowledge, getAvatarBehaviors, addAvatarBehavior, updateAvatarBehavior, deleteAvatarBehavior } from "@/lib/avatarApi";
import { scrapeWebsite as scrapeWebsiteClient } from "@/lib/websiteScraper";
import { deleteUserFiles, getUserFiles, indexBatch, uploadFinancialFile, type ELUserFinanceFile } from "@/lib/ELApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAvatarFaqs, createAvatarFaq, removeAvatarFaq, fetchAvatarWebsites, createAvatarWebsite, removeAvatarWebsite, fetchAvatarPolicies, createAvatarPolicy, removeAvatarPolicy, fetchAvatarDocuments, addAvatarDocument, removeAvatarDocument, updateSelectedAgentProfile } from "@/store/slices/avatarSlice";
import { removeFinanceFileFromCache, setFinanceFilesError, setFinanceFilesLoading, setFinanceFilesSuccess } from "@/store/slices/financialSlice";
import WithPermission from "@/_core/components/WithPermission";


type RuleType = 'prompt' | 'guardrail' | 'rule';
type KnowledgeType = 'faq' | 'website' | 'document' | 'policy';
type TrainingStep = 'background' | 'tone' | 'behavior' | 'knowledge' | 'workflows' | 'features';

interface Rule {
  id: number;
  workerId: number;
  type: RuleType;
  title: string;
  content: string;
  isActive: number;
  createdAt: string;
}

interface KnowledgeItem {
  id: number;
  workerId: number;
  type: KnowledgeType;
  title: string;
  content: string;
  additionalContent?: string | null;
  category?: string;
  extension_type?: string;
  status: string;
  isActive: number;
  createdAt: Date | string;
}

interface SimpleTrainWorkerProps {
  worker?: {
    id: number;
    fullName?: string | null;
    professionalTitle?: string | null;
    headline?: string | null;
    typicalClients?: string | null;
    professionalBackground?: string | null;
    tone?: string | null;
    plan?: string | null;
    trainingExamples?: number | null;
  };
  workerId?: number;
  onUpdate?: () => void;
  canAccessPropertyFinance?: boolean;
}

// Step configuration - 6 steps
const TRAINING_STEPS = [
  { 
    id: 'background' as const, 
    label: 'Background', 
    icon: User, 
    color: '#8B5CF6',
    description: 'Who is your AI?'
  },
  { 
    id: 'tone' as const, 
    label: 'Tone', 
    icon: Volume2, 
    color: '#A855F7',
    description: 'How should it sound?'
  },
  { 
    id: 'behavior' as const, 
    label: 'Behavior', 
    icon: Brain, 
    color: '#6366F1',
    description: 'Prompts & rules'
  },
  { 
    id: 'knowledge' as const, 
    label: 'Knowledge', 
    icon: FileText, 
    color: '#22D3EE',
    description: 'FAQs & docs'
  },
  // { 
  //   id: 'finetune' as const, 
  //   label: 'Fine-Tune', 
  //   icon: Brain, 
  //   color: '#EC4899',
  //   description: 'Custom LLM training',
  //   soon: true
  // },
  // { 
  //   id: 'workflows' as const, 
  //   label: 'Workflows', 
  //   icon: Workflow, 
  //   color: '#10B981',
  //   description: 'Actions & tasks',
  //   soon: true
  // },
  // { 
  //   id: 'features' as const, 
  //   label: 'Features', 
  //   icon: Sparkles, 
  //   color: '#F59E0B',
  //   description: 'Voice & calling',
  //   soon: true
  // },
];

// Tone options
const TONE_OPTIONS = [
  { id: 'friendly', label: 'Friendly', emoji: '😊', desc: 'Warm & approachable' },
  { id: 'professional', label: 'Professional', emoji: '💼', desc: 'Formal & business-like' },
  { id: 'casual', label: 'Casual', emoji: '😎', desc: 'Relaxed & conversational' },
  { id: 'expert', label: 'Expert', emoji: '🎓', desc: 'Authoritative & confident' },
  { id: 'empathetic', label: 'Empathetic', emoji: '💚', desc: 'Understanding & caring' },
];

// Knowledge types with descriptions
const KNOWLEDGE_TYPES = [
  { 
    id: 'faq' as const, 
    label: 'FAQs', 
    icon: HelpCircle,
    description: 'Common questions and answers your AI should know',
    placeholder: 'Enter the question...',
    answerPlaceholder: 'Enter the answer...'
  },
  { 
    id: 'website' as const, 
    label: 'Websites', 
    icon: Globe,
    description: 'URLs your AI can reference for information',
    placeholder: 'https://example.com'
  },
  { 
    id: 'document' as const, 
    label: 'Documents', 
    icon: FileText,
    description: 'PDFs, docs, or text files with important info',
    placeholder: 'Document title...'
  },
  { 
    id: 'policy' as const, 
    label: 'Policies', 
    icon: Shield,
    description: 'Rules, terms, or guidelines your AI must follow',
    placeholder: 'Policy name...'
  },
];

const PROPERTY_FINANCE_ACCEPT = ".csv,.xlsx,.xls";

// Workflow actions
const WORKFLOW_ACTIONS = [
  { id: 'booking', label: 'Book Appointments', icon: '📅' },
  { id: 'email', label: 'Send Emails', icon: '📧' },
  { id: 'task', label: 'Create Tasks', icon: '✅' },
  { id: 'notify', label: 'Notifications', icon: '🔔' },
];

export default function SimpleTrainWorker({
  worker,
  workerId: propWorkerId,
  onUpdate,
  canAccessPropertyFinance = false,
}: SimpleTrainWorkerProps) {
  const worker1 = (worker && worker[0]) ? worker[0] : worker;
  const selectedAgentTone = useAppSelector((state) => state.avatar.selectedAgent?.tone);
  const selectedAgent = useAppSelector((state) => state.avatar.selectedAgent);
  
  const actualWorkerId = worker1?.id || propWorkerId || 0;
  
  const [activeStep, setActiveStep] = useState<TrainingStep>('background');

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const requestedStep = (
      searchParams.get("step") ||
      searchParams.get("train_step") ||
      searchParams.get("tab") ||
      window.location.hash.replace("#", "")
    )
      .trim()
      .toLowerCase();

    if (!requestedStep) return;

    const isValidStep = TRAINING_STEPS.some((step) => step.id === requestedStep);
    if (isValidStep) {
      setActiveStep(requestedStep as TrainingStep);
    }
  }, []);
  
  // console.log("worker1", worker1);
  // Background state
  const [background, setBackground] = useState({
    expertise: worker1?.expertise || '',
    targetAudience: worker1?.target_audience || '',
    mainGoal: worker1?.main_goal || '',
    uniqueValue: worker1?.what_makes_you_unique || '',
    commonQuestions: ''
  });
  
  const [selectedTone, setSelectedTone] = useState<string>(
    selectedAgentTone || worker1?.tone || worker1?.personality || "friendly"
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<RuleType, boolean>>({
    prompt: true,
    guardrail: false,
    rule: false
  });
  const [openTooltipType, setOpenTooltipType] = useState<RuleType | null>(null);
  const isDesktopHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [isUpdatingRule, setIsUpdatingRule] = useState(false);
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [isAddingWebsite, setIsAddingWebsite] = useState(false);
  const [isAddingPolicy, setIsAddingPolicy] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isPropertyFinanceDialogOpen, setIsPropertyFinanceDialogOpen] = useState(false);
  const [propertyFinanceFile, setPropertyFinanceFile] = useState<File | null>(null);
  const [propertyFinanceTitle, setPropertyFinanceTitle] = useState("");
  const [propertyFinanceDescription, setPropertyFinanceDescription] = useState("");
  const [isUploadingPropertyFinance, setIsUploadingPropertyFinance] = useState(false);
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [isSavingTone, setIsSavingTone] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);
  const [knowledgeToDelete, setKnowledgeToDelete] = useState<KnowledgeItem | null>(null);
  const [deletingFaqId, setDeletingFaqId] = useState<number | null>(null);
  const [deletingWebsiteId, setDeletingWebsiteId] = useState<number | null>(null);
  const [deletingPolicyId, setDeletingPolicyId] = useState<number | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [deletingFinanceNamespace, setDeletingFinanceNamespace] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [newRule, setNewRule] = useState({ type: 'prompt' as RuleType, title: '', content: '' });
  
  // Knowledge state
  const [activeKnowledgeType, setActiveKnowledgeType] = useState<KnowledgeType | null>(null);
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', additionalContent: '' });
  const [showLibrary, setShowLibrary] = useState(false);

   // Fine-tune training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStage, setTrainingStage] = useState<'idle' | 'preparing' | 'training' | 'validating' | 'deploying' | 'complete'>('idle');
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [totalEpochs] = useState(5);
  const [isModelTrained, setIsModelTrained] = useState(false);
  const [trainingDataCount] = useState(250); // Demo: simulate having enough data

  // Training data file upload (Custom LLM section)
  const trainingFileInputRef = useRef<HTMLInputElement>(null);
  const [trainingSelectedFile, setTrainingSelectedFile] = useState<File | null>(null);
  const [trainingUploadLoading, setTrainingUploadLoading] = useState(false);
  const [trainingCategory, setTrainingCategory] = useState("finetone");

  // Fetch rules from avatar behaviors API
  const agentUniqueId = (worker1 as { agent_id?: string })?.agent_id || worker1?.id;
  const dispatch = useAppDispatch();
  const financeFilesEntry = useAppSelector((state) =>
    agentUniqueId ? state.financial.filesByWorkerId[String(agentUniqueId)] : undefined
  );
  const financeFiles = financeFilesEntry?.files ?? [];
  const [rules, setRules] = useState<Array<{ id: number; workerId: number; category: string; title: string; description: string; status: string; createdAt: Date }>>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  const refetchRules = (): Promise<void> => {
    if (!agentUniqueId) {
      setRules([]);
      return Promise.resolve();
    }
    setRulesLoading(true);
    return getAvatarBehaviors(String(agentUniqueId))
      .then((items) => {
        const mapped = items.map((b, i) => ({
          id: typeof b.id === 'number' ? b.id : Number(b.id) || i + 1,
          workerId: actualWorkerId || 1,
          category: (b.category || b.type || 'rule') as string,
          title: b.title || '',
          description: b.description || b.content || '',
          status: b.status || 'active',
          createdAt: b.created_at || b.createdAt ? new Date(b.created_at || b.createdAt!) : new Date(),
        }));
        setRules(mapped);
      })
      .catch((err) => {
        setRules([]);
        toast.error(err instanceof Error ? err.message : 'Failed to load behaviors');
      })
      .finally(() => {
        setRulesLoading(false);
      });
  };

  useEffect(() => {
    if (agentUniqueId) {
      setRulesLoading(true);
      getAvatarBehaviors(String(agentUniqueId))
        .then((items) => {
          // console.log("behaviors", items);  
          const mapped = items.map((b, i) => ({
            id: typeof b.id === 'number' ? b.id : Number(b.id) || i + 1,
            workerId: actualWorkerId || 1,
            category: (b.category || b.type || 'rule') as string,
            title: b.title || '',
            description: b.description || b.content || '',
            status: b.status || 'active',
            createdAt: b.created_at || b.createdAt ? new Date(b.created_at || b.createdAt!) : new Date(),
          }));
          setRules(mapped);
        })
        .catch((err) => {
          setRules([]);
          toast.error(err instanceof Error ? err.message : 'Failed to load behaviors');
        })
        .finally(() => setRulesLoading(false));
    } else {
      setRules([]);
    }
  }, [agentUniqueId]);
  
  // Fetch FAQs (knowledge items)
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);

  const refetchKnowledge = () => {
    if (!agentUniqueId) {
      setKnowledgeItems([]);
      return;
    }
    setKnowledgeLoading(true);
    Promise.all([
      dispatch(fetchAvatarFaqs(String(agentUniqueId))).unwrap(),
      dispatch(fetchAvatarWebsites(String(agentUniqueId))).unwrap(),
      dispatch(fetchAvatarPolicies(String(agentUniqueId))).unwrap(),
      dispatch(fetchAvatarDocuments(String(agentUniqueId))).unwrap(),
    ])
      .then(([faqs, websites, policies, documentsPayload]) => {
        const documents = documentsPayload.documents;
        const faqItems: KnowledgeItem[] = faqs.map((f, i) => ({
          id: typeof f.id === 'number' ? f.id : Number(f.id) || i + 1,
          workerId: actualWorkerId || 1,
          type: 'faq' as KnowledgeType,
          title: f.question || f.title || f.prompt || '',
          content: f.answer || f.content || f.completion || '',
          additionalContent: null,
          status: 'ready',
          isActive: 1,
          createdAt: f.created_at || f.createdAt || new Date().toISOString(),
        }));
        const websiteItems: KnowledgeItem[] = websites.map((w, i) => ({
          id: typeof w.id === 'number' ? w.id : Number(w.id) || 10000 + i,
          workerId: actualWorkerId || 1,
          type: 'website' as KnowledgeType,
          title: w.title || w.url || '',
          content: w.content || '',
          additionalContent: w.url || null,
          status: (w.status as string) || 'ready',
          isActive: 1,
          createdAt: w.created_at || w.createdAt || new Date().toISOString(),
        }));
        const policyItems: KnowledgeItem[] = policies.map((p, i) => ({
          id: typeof p.id === 'number' ? p.id : Number(p.id) || 20000 + i,
          workerId: actualWorkerId || 1,
          type: 'policy' as KnowledgeType,
          title: p.title || p.name || '',
          content: p.content || p.description || '',
          additionalContent: null,
          status: 'ready',
          isActive: 1,
          createdAt: p.created_at || p.createdAt || new Date().toISOString(),
        }));
        const documentItems: KnowledgeItem[] = documents.map((doc, i) => ({
          id: typeof doc.id === 'number' ? doc.id : Number(doc.id) || 30000 + i,
          workerId: actualWorkerId || 1,
          type: 'document' as KnowledgeType,
          title: doc.title || doc.original_filename || doc.file_name || '',
          content: doc.original_filename || doc.file_name || doc.file_path || '',
          additionalContent: doc.description || null,
          category: doc.category,
          extension_type: doc.extension_type,
          status: 'ready',
          isActive: 1,
          createdAt: doc.created_at || new Date().toISOString(),
        }));
        setKnowledgeItems([...faqItems, ...websiteItems, ...policyItems, ...documentItems]);
      })
      .catch((err) => {
        setKnowledgeItems([]);
        toast.error(err instanceof Error ? err.message : 'Failed to load knowledge');
      })
      .finally(() => setKnowledgeLoading(false));
  };

  useEffect(() => {
    if (agentUniqueId) {
      refetchKnowledge();
    } else {
      setKnowledgeItems([]);
    }
  }, [agentUniqueId]);

  const refetchFinanceFiles = useCallback(async (opts?: { force?: boolean }) => {
    if (!agentUniqueId) return;
    const workerKey = String(agentUniqueId);
    if (!opts?.force && financeFilesEntry?.loaded) return;
    dispatch(setFinanceFilesLoading({ workerId: workerKey, loading: true }));
    try {
      const payload = await getUserFiles(workerKey);
      dispatch(
        setFinanceFilesSuccess({
          workerId: workerKey,
          files: payload.files,
          totalFiles: payload.totalFiles,
          totalRows: payload.totalRows,
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load finance files.";
      dispatch(setFinanceFilesError({ workerId: workerKey, error: message }));
      toast.error(message);
    }
  }, [agentUniqueId, dispatch, financeFilesEntry?.loaded]);

  const handleDeleteFinanceFile = useCallback(async (namespace: string) => {
    if (!agentUniqueId) {
      toast.error("No agent selected");
      return;
    }
    const ns = namespace?.trim();
    if (!ns) {
      toast.error("Namespace is required");
      return;
    }
    setDeletingFinanceNamespace(ns);
    try {
      const result = await deleteUserFiles({ ids: ns });
      const deletedList = Array.isArray(result.deleted) && result.deleted.length > 0 ? result.deleted : [ns];
      deletedList.forEach((deletedNs) => {
        dispatch(removeFinanceFileFromCache({ workerId: String(agentUniqueId), namespace: deletedNs }));
      });
      toast.success(result.message || "Finance file deleted successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete finance file");
    } finally {
      setDeletingFinanceNamespace(null);
    }
  }, [agentUniqueId, dispatch]);

  useEffect(() => {
    if (!canAccessPropertyFinance || !agentUniqueId) return;
    void refetchFinanceFiles();
  }, [canAccessPropertyFinance, agentUniqueId, refetchFinanceFiles]);

  useEffect(() => {
    if (selectedAgentTone) {
      setSelectedTone(selectedAgentTone);
      return;
    }
    if (worker1?.tone) {
      setSelectedTone(worker1.tone);
      return;
    }
    if (worker1?.personality) {
      setSelectedTone(worker1.personality);
    }
  }, [selectedAgentTone, worker1?.tone, worker1?.personality]);

  const trainingDocuments = knowledgeItems.filter((i) => i.type === 'document' && (i.category ?? '') === 'finetone');

  const getFileIconColor = (extension_type: string | undefined): string => {
    const ext = (extension_type ?? '').toLowerCase().replace(/^\./, '');
    const colorMap: Record<string, string> = {
      pdf: 'text-red-400',
      doc: 'text-blue-400',
      docx: 'text-blue-400',
      csv: 'text-emerald-400',
      xls: 'text-emerald-400',
      xlsx: 'text-emerald-400',
      json: 'text-amber-400',
      jsonl: 'text-amber-400',
      txt: 'text-slate-300',
      md: 'text-cyan-400',
    };
    return colorMap[ext] ?? 'text-slate-400';
  };

  const handleTrainingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setTrainingSelectedFile(file);
    e.target.value = '';
  };

  const handleTrainingUpload = async () => {
    if (!trainingSelectedFile || !agentUniqueId) {
      toast.error('Select a file and ensure an agent is loaded');
      return;
    }
    setTrainingUploadLoading(true);
    try {
      await dispatch(addAvatarDocument({
        file: trainingSelectedFile,
        agent_unique_id: String(agentUniqueId),
        title: trainingSelectedFile.name.replace(/\.[^/.]+$/, '') || trainingSelectedFile.name,
        description: '',
        category: trainingCategory || undefined,
      })).unwrap();
      refetchKnowledge();
      setTrainingSelectedFile(null);
      toast.success('Document uploaded successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setTrainingUploadLoading(false);
    }
  };

  const handlePropertyFinanceUpload = async () => {
    if (!propertyFinanceFile || !agentUniqueId) {
      toast.error("Select a file and ensure an agent is loaded");
      return;
    }

    const lower = propertyFinanceFile.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      toast.error("Only .csv, .xlsx, and .xls files are supported.");
      return;
    }

    setIsUploadingPropertyFinance(true);
    try {
      const fallbackTitle = propertyFinanceFile.name.replace(/\.[^/.]+$/, "") || propertyFinanceFile.name;
      const title = propertyFinanceTitle.trim() || fallbackTitle;
      const description = propertyFinanceDescription.trim();
      const upload = await uploadFinancialFile(propertyFinanceFile, String(agentUniqueId), {
        title,
        description,
      });
      const namespace = upload.namespace?.trim();
      if (!namespace) {
        throw new Error("Upload succeeded but namespace is missing.");
      }
      await indexBatch(namespace);
      await refetchFinanceFiles({ force: true });
      toast.success("Finance file uploaded and indexed.");
      setPropertyFinanceFile(null);
      setPropertyFinanceTitle("");
      setPropertyFinanceDescription("");
      setIsPropertyFinanceDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload finance file");
    } finally {
      setIsUploadingPropertyFinance(false);
    }
  };

  // Update worker mutation
  const updateWorker = () => {}
  /*
  trpc.worker.update.useMutation({
    onSuccess: () => {
      onUpdate?.();
      toast.success('Saved!');
    }
  });
  */
  
  // Rule mutations
  const createRule = () => {}
  /* trpc.rule.create.useMutation({
    onSuccess: () => {
      refetchRules();
      setIsAddDialogOpen(false);
      setNewRule({ type: 'prompt', title: '', content: '' });
      toast.success('Added!');
    }
  }); */

  const handleDeleteRule = async (ruleId: number) => {
    setDeletingRuleId(ruleId);
    try {
      await deleteAvatarBehavior(ruleId);
      await refetchRules();
      if (editingRule?.id === ruleId) setEditingRule(null);
      toast.success('Deleted!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete behavior');
    } finally {
      setDeletingRuleId(null);
    }
  };
  
  // Knowledge mutations
  const createKnowledge = () => {}
  /* trpc.knowledge.create.useMutation({
    onSuccess: () => {
      refetchKnowledge();
      setIsKnowledgeDialogOpen(false);
      setNewKnowledge({ title: '', content: '', additionalContent: '' });
      setActiveKnowledgeType(null);
      toast.success('Added!');
    }
  }); */
  
  const handleDeleteKnowledge = async (item: KnowledgeItem) => {
    if (item.type === 'faq') {
      setDeletingFaqId(item.id);
      try {
        await dispatch(removeAvatarFaq(item.id)).unwrap();
        setKnowledgeItems((prev) => prev.filter((k) => !(k.type === 'faq' && k.id === item.id)));
        toast.success('FAQ deleted!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete FAQ');
      } finally {
        setDeletingFaqId(null);
      }
    } else if (item.type === 'website') {
      setDeletingWebsiteId(item.id);
      try {
        await dispatch(removeAvatarWebsite(item.id)).unwrap();
        setKnowledgeItems((prev) => prev.filter((k) => !(k.type === 'website' && k.id === item.id)));
        toast.success('Website deleted!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete website');
      } finally {
        setDeletingWebsiteId(null);
      }
    } else if (item.type === 'policy') {
      setDeletingPolicyId(item.id);
      try {
        await dispatch(removeAvatarPolicy(item.id)).unwrap();
        refetchKnowledge();
        toast.success('Policy deleted!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete policy');
      } finally {
        setDeletingPolicyId(null);
      }
    } else if (item.type === 'document') {
      setDeletingDocumentId(item.id);
      try {
        await dispatch(removeAvatarDocument(item.id)).unwrap();
        refetchKnowledge();
        toast.success('Document deleted!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete document');
      } finally {
        setDeletingDocumentId(null);
      }
    } else {
      toast.info('Delete not implemented for this type yet');
    }
  };

  // Scrape website mutation
  const scrapeWebsite = () => {}
  /* trpc.knowledge.scrapeWebsite.useMutation({
    onSuccess: (result) => {
      refetchKnowledge();
      if (result.success) {
        toast.success(`Scraped ${result.contentLength?.toLocaleString()} characters from website`);
      } else {
        toast.error(result.error || 'Failed to scrape website');
      }
    },
    onError: (error) => {
      refetchKnowledge();
      toast.error(error.message || 'Failed to scrape website');
    }
  });
 */

  // Map backend fields to frontend
  const mappedRules: Rule[] = (rules as Array<{
    id: number;
    workerId: number;
    category: string;
    title: string;
    description: string;
    status: string;
    createdAt: Date;
  }>).map(r => ({
    id: r.id,
    workerId: r.workerId,
    type: (['prompt', 'guardrail', 'rule'].includes(r.category) ? r.category : 'rule') as RuleType,
    title: r.title,
    content: r.description,
    isActive: r.status === 'active' ? 1 : 0,
    createdAt: r.createdAt?.toString() || new Date().toISOString()
  }));

  const getRulesByType = (type: RuleType) => mappedRules.filter(r => r.type === type);
  
  const getKnowledgeByType = (type: KnowledgeType) =>
    (knowledgeItems as KnowledgeItem[]).filter((k) => {
      if (k.type !== type) return false;
      if (type === 'document') return (k.category ?? '') === 'knowledge';
      return true;
    });

  const filteredRules = mappedRules.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate progress
  const getStepProgress = (step: TrainingStep): number => {
    switch (step) {
      case 'background':
        const bgFields = [background.expertise, background.targetAudience, background.mainGoal];
        const bgFilled = bgFields.filter(f => f.trim().length > 0).length;
        return (bgFilled / bgFields.length) * 100;
      case 'tone':
        return selectedTone ? 100 : 0;
      case 'behavior':
        const totalRules = mappedRules.length;
        return Math.min((totalRules / 5) * 100, 100);
      case 'knowledge':
        const totalKnowledge = (knowledgeItems as KnowledgeItem[]).length;
        return Math.min((totalKnowledge / 5) * 100, 100);
      case 'workflows':
        return 0;
      case 'features':
        return 0;
      default:
        return 0;
    }
  };

  const overallProgress = Math.round(
    TRAINING_STEPS.reduce((acc, step) => acc + getStepProgress(step.id), 0) / TRAINING_STEPS.length
  );

  const handleSaveBackground = async () => {
    setIsSavingBackground(true);
    try {
      const industry = (worker1 as { industry?: string })?.industry ?? background?.expertise ?? "Global";
      const nextHeadline =
        worker1?.headline?.trim() ||
        selectedAgent?.headline?.trim() ||
        background?.expertise?.trim() ||
        "Digital Worker";
      const nextFullName =
        worker1?.name?.trim() ||
        worker1?.full_name?.trim() ||
        selectedAgent?.fullName?.trim() ||
        selectedAgent?.full_name?.trim() ||
        selectedAgent?.name?.trim() ||
        "Digital Worker";
      const nextSkills = Array.isArray(worker1?.skills) && worker1.skills.length > 0
        ? worker1.skills
        : [background?.expertise?.trim() || nextHeadline].filter(Boolean);
      const moreInfo = JSON.stringify({
        expertise: background?.expertise,
        targetAudience: background?.targetAudience,
        mainGoal: background?.mainGoal,
        uniqueValue: background?.uniqueValue,
      });
      const existingAboutYourself = (worker1 as { about_yourself?: string })?.about_yourself?.trim();
      const existingLocation = (worker1 as { location?: string })?.location?.trim();

      
      // console.log("worker1", worker1);
      // console.log("existingAboutYourself", existingAboutYourself);
      // console.log("existingLocation", existingLocation);
      // return;

      await addAvatarKnowledge({
        agent_unique_id: worker1?.agent_id,
        user_name: worker1?.user_name,
        knowledge: existingAboutYourself,
        full_name: nextFullName,
        headline: nextHeadline,
        personality: selectedTone,
        skills: nextSkills,
        about_yourself:
          existingAboutYourself && existingAboutYourself.length > 0
            ? existingAboutYourself
            : `I am a ${nextHeadline}. I help clients with ${worker1?.description || "business goals"}.`,
        strength: existingAboutYourself || `I specialize in ${nextHeadline}`,
        short_bio: `I specialize in ${nextHeadline} and assist with ${worker1?.description || "business goals"}.`,
        location: existingLocation && existingLocation.length > 0 ? existingLocation : "Global",
        expertise: background?.expertise,
        industry,
        target_audience: background?.targetAudience,
        main_goal: background?.mainGoal,
        what_makes_you_unique: background?.uniqueValue,
        more_info: moreInfo,
      });
      dispatch(
        updateSelectedAgentProfile({
          expertise: background?.expertise || undefined,
          industry: industry || undefined,
          target_audience: background?.targetAudience || undefined,
          main_goal: background?.mainGoal || undefined,
          what_makes_you_unique: background?.uniqueValue || undefined,
          more_info: moreInfo,
        })
      );
      
      toast.success("Worker knowledge added sucessfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save background");
    } finally {
      setIsSavingBackground(false);
    }
  };

  const handleSaveTone = async () => {
    setIsSavingTone(true);
    try {
      // if (actualWorkerId > 0) {
      //   updateWorker.mutate({
      //     workerId: actualWorkerId,
      //     data: { tone: selectedTone }
      //   });
      // }
      const industry = (worker1 as { industry?: string })?.industry ?? (worker1 as { expertise?: string })?.expertise ?? "Global";
      const moreInfo = JSON.stringify({
        expertise: (worker1 as { expertise?: string })?.expertise,
        target_audience: (worker1 as { target_audience?: string })?.target_audience,
        main_goal: (worker1 as { main_goal?: string })?.main_goal,
        what_makes_you_unique: (worker1 as { what_makes_you_unique?: string })?.what_makes_you_unique,
      });
      const existingAboutYourself = (worker1 as { about_yourself?: string })?.about_yourself?.trim();
      const nextAboutYourself = existingAboutYourself && existingAboutYourself.length > 0
      ? existingAboutYourself
      : `I am a ${worker1?.headline}. I help clients with ${worker1?.description}.`

      const existingLocation = (worker1 as { location?: string })?.location?.trim();
      // console.log("worker1", worker1);

      // return
      await addAvatarKnowledge({
        agent_unique_id: worker1?.agent_id,
        user_name: worker1?.agent_id,
        knowledge: nextAboutYourself, 
        full_name: worker1?.name,
        headline: worker1?.headline,
        personality: selectedTone,
        skills: worker1?.skills,
        about_yourself: nextAboutYourself,
        strength: nextAboutYourself,
        short_bio: nextAboutYourself,
        location: existingLocation && existingLocation.length > 0 ? existingLocation : "Global",
        expertise: (worker1 as { expertise?: string })?.expertise || industry,
        industry,
        target_audience: (worker1 as { target_audience?: string })?.target_audience,
        main_goal: (worker1 as { main_goal?: string })?.main_goal,
        what_makes_you_unique: (worker1 as { what_makes_you_unique?: string })?.what_makes_you_unique,
        more_info: moreInfo,
      });
      dispatch(updateSelectedAgentProfile({ tone: selectedTone }));
      toast.success("Worker knowledge added sucessfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save tone");
    } finally {
      setIsSavingTone(false);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.title.trim() || !newRule.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!agentUniqueId) {
      toast.error('No agent selected');
      return;
    }
    setIsAddingRule(true);
    try {
      await addAvatarBehavior({
        agent_unique_id: String(agentUniqueId),
        type: newRule.type,
        title: newRule.title.trim(),
        description: newRule.content.trim(),
      });
      await refetchRules();
      setIsAddDialogOpen(false);
      setNewRule({ type: 'prompt', title: '', content: '' });
      toast.success('Added!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add behavior');
    } finally {
      setIsAddingRule(false);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;
    if (!agentUniqueId) {
      toast.error('No agent selected');
      return;
    }
    setIsUpdatingRule(true);
    try {
      await updateAvatarBehavior(editingRule.id, {
        agent_unique_id: String(agentUniqueId),
        type: editingRule.type,
        title: editingRule.title.trim(),
        description: editingRule.content.trim(),
      });
      await refetchRules();
      setEditingRule(null);
      toast.success('Updated!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update behavior');
    } finally {
      setIsUpdatingRule(false);
    }
  };
  
  const handleAddKnowledge = async () => {
    if (!activeKnowledgeType) {
      toast.error('Please select a knowledge type');
      return;
    }

    // Document upload - different validation
    if (activeKnowledgeType === 'document') {
      if (!newKnowledge.title.trim()) {
        toast.error('Please enter a document title');
        return;
      }
      if (!selectedFile) {
        toast.error('Please select a file to upload');
        return;
      }
      if (!newKnowledge.content.trim()) {
        toast.error('Please enter a description');
        return;
      }
      if (!agentUniqueId) {
        toast.error('No agent selected');
        return;
      }

      setIsUploadingDocument(true);
      try {
        await dispatch(addAvatarDocument({
          file: selectedFile,
          agent_unique_id: String(agentUniqueId),
          title: newKnowledge.title.trim(),
          description: newKnowledge.content.trim(),
          category: 'knowledge'
        })).unwrap();
        refetchKnowledge();
        setIsKnowledgeDialogOpen(false);
        setNewKnowledge({ title: '', content: '', additionalContent: '' });
        setSelectedFile(null);
        setActiveKnowledgeType(null);
        toast.success('Document uploaded successfully!');
      } catch (err: unknown) {
        const errorMsg =  err?.message || 'Failed to upload document';
        toast.error(errorMsg);
      } finally {
        setIsUploadingDocument(false);
      }
      return;
    }

    // Other knowledge types require content
    if (!newKnowledge.title.trim() || !newKnowledge.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (activeKnowledgeType === 'faq') {
      if (!agentUniqueId) {
        toast.error('No agent selected');
        return;
      }
      setIsAddingFaq(true);
      try {
        const created = await dispatch(createAvatarFaq({
          agent_unique_id: String(agentUniqueId),
          question: newKnowledge.title.trim(),
          answer: newKnowledge.content.trim(),
        })).unwrap();
        const newItem: KnowledgeItem = {
          id: typeof created?.id === 'number' ? created.id : Number(created?.id) || Date.now(),
          workerId: actualWorkerId || 1,
          type: 'faq',
          title: created?.question ?? newKnowledge.title.trim(),
          content: created?.answer ?? newKnowledge.content.trim(),
          additionalContent: null,
          status: 'ready',
          isActive: 1,
          createdAt: created?.created_at ?? created?.createdAt ?? new Date().toISOString(),
        };
        setKnowledgeItems((prev) => [...prev, newItem]);
        setIsKnowledgeDialogOpen(false);
        setNewKnowledge({ title: '', content: '', additionalContent: '' });
        setActiveKnowledgeType(null);
        toast.success('FAQ added!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to add FAQ');
      } finally {
        setIsAddingFaq(false);
      }
      return;
    }
    
    if (activeKnowledgeType === 'website') {
      const url = newKnowledge.content.trim();

      // Validate URL
      try {
        new URL(url);
      } catch {
        toast.error('Please enter a valid URL (e.g., https://example.com)');
        return;
      }

      if (!agentUniqueId) {
        toast.error('No agent selected');
        return;
      }
      setIsAddingWebsite(true);
      try {
        // 1) Call scraping API / utility
        const detail = await scrapeWebsiteClient(url);

        // 2) Then call avatar website API with scraped detail
        const created = await dispatch(createAvatarWebsite({
          agent_unique_id: String(agentUniqueId),
          website_name: newKnowledge.title.trim(),
          url: newKnowledge.content.trim(),
          details: detail,
        })).unwrap();

        // Log website body/content returned by the backend (avoids browser CORS)
        if (created?.content) {
          console.log("WEBSITE BODY TEXT (from API, first 2000 chars):", String(created.content).slice(0, 2000));
        }
        const newItem: KnowledgeItem = {
          id: typeof created?.id === 'number' ? created.id : Number(created?.id) || 10000 + Date.now(),
          workerId: actualWorkerId || 1,
          type: 'website',
          title: created?.title ?? newKnowledge.title.trim(),
          content: created?.content ?? '',
          additionalContent: created?.url ?? newKnowledge.content.trim(),
          status: (created?.status as string) ?? 'ready',
          isActive: 1,
          createdAt: created?.created_at ?? created?.createdAt ?? new Date().toISOString(),
        };
        setKnowledgeItems((prev) => [...prev, newItem]);
        setIsKnowledgeDialogOpen(false);
        setNewKnowledge({ title: '', content: '', additionalContent: '' });
        setActiveKnowledgeType(null);
        toast.success('Website added!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to add website');
      } finally {
        setIsAddingWebsite(false);
      }
      return;
    }

    if (activeKnowledgeType === 'policy') {
      if (!agentUniqueId) {
        toast.error('No agent selected');
        return;
      }
      setIsAddingPolicy(true);
      try {
        await dispatch(createAvatarPolicy({
          agent_unique_id: String(agentUniqueId),
          name: newKnowledge.title.trim(),
          details: newKnowledge.content.trim(),
        })).unwrap();
        refetchKnowledge();
        setIsKnowledgeDialogOpen(false);
        setNewKnowledge({ title: '', content: '', additionalContent: '' });
        setActiveKnowledgeType(null);
        toast.success('Policy added!');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to add policy');
      } finally {
        setIsAddingPolicy(false);
      }
      return;
    }
    
    createKnowledge.mutate({
      workerId: actualWorkerId,
      type: activeKnowledgeType,
      title: newKnowledge.title,
      content: newKnowledge.content,
      additionalContent: newKnowledge.additionalContent || undefined,
    }, {
      onSuccess: (createdItem) => {
        if (activeKnowledgeType === 'website' && createdItem?.id) {
          toast.info('Scraping website content...');
          scrapeWebsite.mutate({
            knowledgeItemId: createdItem.id,
            url: newKnowledge.content,
          });
        }
      }
    });
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 'background':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Your Expertise</Label>
              <WithPermission>
                <Input
                  value={background.expertise}
                  onChange={(e) => setBackground(prev => ({ ...prev, expertise: e.target.value }))}
                  placeholder="e.g., Golf Travel Specialist"
                  className="bg-white/5 border-white/10 text-white text-sm h-9"
                />
              </WithPermission>
            </div>
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Target Audience</Label>
              <WithPermission>
                <Input
                  value={background.targetAudience}
                  onChange={(e) => setBackground(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="e.g., High-net-worth golf enthusiasts"
                  className="bg-white/5 border-white/10 text-white text-sm h-9"
                />
              </WithPermission>
            </div>
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Main Goal</Label>
              <WithPermission>
                <Input
                  value={background.mainGoal}
                  onChange={(e) => setBackground(prev => ({ ...prev, mainGoal: e.target.value }))}
                  placeholder="e.g., Help clients plan luxury golf trips"
                  className="bg-white/5 border-white/10 text-white text-sm h-9"
                />
              </WithPermission>
            </div>
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">What makes you unique?</Label>
              <WithPermission>
                <Textarea
                  value={background.uniqueValue}
                  onChange={(e) => setBackground(prev => ({ ...prev, uniqueValue: e.target.value }))}
                  placeholder="e.g., 20 years experience, exclusive resort partnerships..."
                  className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none"
                />
              </WithPermission>
            </div>
            <WithPermission>
            <Button 
              onClick={handleSaveBackground}
              disabled={isSavingBackground}
              className="w-full h-8 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] hover:opacity-90 text-white text-sm disabled:opacity-50"
            >
              {isSavingBackground ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Save Background
                </>
              )}
            </Button>
            </WithPermission>
          </div>
        );

      case 'tone':
        return (
          <div className="space-y-2">
            {TONE_OPTIONS.map((tone) => (<>
              <WithPermission>
              <button
                key={tone.id}
                onClick={() => {
                  setSelectedTone(tone.id);
                  dispatch(updateSelectedAgentProfile({ tone: tone.id }));
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                  selectedTone === tone.id
                    ? 'bg-[#A855F7]/20 border-[#A855F7]'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-xl">{tone.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{tone.label}</div>
                  <div className="text-[10px] text-slate-400">{tone.desc}</div>
                </div>
                {selectedTone === tone.id && (
                  <Check className="w-4 h-4 text-[#A855F7]" />
                )}
              </button>
              </WithPermission>
              </>))}
            
            <WithPermission>
            <Button 
              onClick={handleSaveTone}
              disabled={isSavingTone}
              className="w-full h-8 bg-gradient-to-r from-[#A855F7] to-[#8B5CF6] hover:opacity-90 text-white text-sm disabled:opacity-50"
            >
              {isSavingTone ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Save Tone
                </>
              )}
            </Button>
            </WithPermission>
          </div>
        );

      case 'behavior':
        return (
          <div className="space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-8 h-8 bg-white/5 border-white/10 text-white text-sm"
              />
            </div>

            {/* Sections */}
            {(['prompt', 'guardrail', 'rule'] as const).map((type) => {
              const typeRules = getRulesByType(type);
              const isExpanded = expandedSections[type];
              const colors = {
                prompt: '#6366F1',
                guardrail: '#F59E0B',
                rule: '#10B981'
              };
              const typeLabels = {
                prompt: "Prompts",
                guardrail: "Guardrails",
                rule: "Rules",
              } as const;
              const typeTooltipText = {
                prompt: "Define the main instructions that guide your worker’s responses and behavior.",
                guardrail: "Add boundaries to keep responses safe, compliant, and on-brand.",
                rule: "Set clear logic or operating instructions your worker should consistently follow.",
              } as const;
              const typeTooltipTitle = {
                prompt: "Prompts",
                guardrail: "Guardrails",
                rule: "Rules",
              } as const;
              
              return (
                <div key={type} className="rounded-lg border border-white/10 overflow-hidden">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedSections(prev => ({ ...prev, [type]: !prev[type] }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedSections(prev => ({ ...prev, [type]: !prev[type] }));
                      }
                    }}
                    className="w-full flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <span className="text-sm font-medium text-white">{typeLabels[type]}</span>
                      <Tooltip
                        open={openTooltipType === type}
                        onOpenChange={(open) => {
                          // Desktop: follow Radix hover/focus behavior. Mobile: click/tap controls open.
                          if (isDesktopHover()) {
                            setOpenTooltipType(open ? type : null);
                            return;
                          }
                          if (!open) setOpenTooltipType(null);
                        }}
                      >
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`${typeLabels[type]} info`}
                            onClick={(e) => {
                              // Desktop should remain hover-only; mobile uses tap toggle.
                              e.preventDefault();
                              e.stopPropagation();
                              if (isDesktopHover()) return;
                              setOpenTooltipType((prev) => (prev === type ? null : type));
                            }}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenTooltipType((prev) => (prev === type ? null : type));
                              }
                            }}
                            className="inline-flex items-center text-slate-500 hover:text-slate-400 cursor-help"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          sideOffset={6}
                          className="custom-tooltip max-w-[280px] rounded-2xl border border-[#334155] bg-[#1E293B] px-3.5 py-3 text-left shadow-xl [&>svg]:!fill-[#1E293B] [&>svg]:!bg-[#1E293B]"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-100">{typeTooltipTitle[type]}</p>
                            <p className="text-xs leading-relaxed text-slate-300">{typeTooltipText[type]}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">{typeRules.length}</span>
                    </div>

                    <WithPermission>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewRule({ type, title: '', content: '' });
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                    </WithPermission>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-2 space-y-1.5">
                      {typeRules.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-2">No {type}s yet</p>
                      ) : (
                        typeRules.filter(r => 
                          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.content.toLowerCase().includes(searchQuery.toLowerCase())
                        ).map((rule) => (<>
                        <WithPermission>
                          <div
                            key={rule.id}
                            className="flex items-start gap-2 p-2 rounded bg-white/5 group"
                          >
                            <div 
                              className="w-1 h-full min-h-[32px] rounded-full shrink-0"
                              style={{ backgroundColor: colors[type] }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-white truncate">{rule.title}</div>
                              <div className="text-[10px] text-slate-400 line-clamp-1">{rule.content}</div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <WithPermission showLock={false}>
                              <button
                                onClick={() => setEditingRule(rule)}
                                className="p-1 hover:bg-white/10 rounded"
                              >
                                <Edit2 className="w-3 h-3 text-slate-400" />
                              </button>
                              </WithPermission>
                              <WithPermission showLock={false}>
                              <button
                                onClick={() => setRuleToDelete(rule)}
                                disabled={deletingRuleId === rule.id}
                                className="p-1 hover:bg-white/10 rounded disabled:opacity-50"
                              >
                                {deletingRuleId === rule.id ? (
                                  <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                )}
                              </button>
                              </WithPermission>
                            </div>
                          </div>
                          </WithPermission>
                        </>))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'knowledge':
        return (
          <div className="space-y-3">
            {/* Toggle between Add and Library */}
            <div className="flex gap-2">
              <Button
                variant={!showLibrary ? "default" : "outline"}
                size="sm"
                className={`flex-1 h-8 text-xs ${!showLibrary ? 'bg-[#22D3EE] hover:bg-[#22D3EE]/90' : 'border-white/20'}`}
                onClick={() => setShowLibrary(false)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add New
              </Button>
              <Button
                variant={showLibrary ? "default" : "outline"}
                size="sm"
                className={`flex-1 h-8 text-xs ${showLibrary ? 'bg-[#22D3EE] hover:bg-[#22D3EE]/90' : 'border-white/20'}`}
                onClick={() => setShowLibrary(true)}
              >
                <BookOpen className="w-3 h-3 mr-1" />
                Library ({(knowledgeItems as KnowledgeItem[]).length + (canAccessPropertyFinance ? financeFiles.length : 0)})
              </Button>
            </div>
            
            {!showLibrary ? (
              /* Add New Section */
              <div className="space-y-2">
                {KNOWLEDGE_TYPES.map((type) => {
                  const Icon = type.icon;
                  const count = getKnowledgeByType(type.id).length;
                  return (
                    <div key={type.id} className="space-y-2">
                      <button
                        onClick={() => {
                          setActiveKnowledgeType(type.id);
                          setNewKnowledge({ title: '', content: '', additionalContent: '' });
                          setIsKnowledgeDialogOpen(true);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#22D3EE]/50 hover:bg-[#22D3EE]/5 transition-all text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#22D3EE]/20 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-[#22D3EE]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{type.label}</span>
                            {count > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#22D3EE]/20 text-[#22D3EE] flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                {count}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{type.description}</p>
                        </div>
                        <Plus className="w-4 h-4 text-[#22D3EE]" />
                      </button>
                      {type.id === "document" && canAccessPropertyFinance && (
                        <button
                          onClick={() => {
                            setPropertyFinanceFile(null);
                            setIsPropertyFinanceDialogOpen(true);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#22D3EE]/50 hover:bg-[#22D3EE]/5 transition-all text-left"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[#22D3EE]/20 flex items-center justify-center shrink-0">
                            <BarChart3 className="w-4 h-4 text-[#22D3EE]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">Finance</span>
                              {financeFiles.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#22D3EE]/20 text-[#22D3EE] flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  {financeFiles.length}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1">
                              Upload worker-specific finance workbook
                            </p>
                          </div>
                          <Plus className="w-4 h-4 text-[#22D3EE]" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Library View */
              <div className="space-y-2">
                {(knowledgeItems as KnowledgeItem[]).length === 0 && !canAccessPropertyFinance ? (
                  <div className="text-center py-6">
                    <BookOpen className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No knowledge items yet</p>
                    <p className="text-xs text-slate-500">Add FAQs, websites, or documents to get started</p>
                  </div>
                ) : (
                  <>
                    {KNOWLEDGE_TYPES.map((type) => {
                      const items = getKnowledgeByType(type.id);
                      if (items.length === 0) return null;
                      const Icon = type.icon;
                      
                      return (
                        <div key={type.id} className="rounded-lg border border-white/10 overflow-hidden">
                        <div className="flex items-center gap-2 p-2 bg-white/5">
                          <Icon className="w-3.5 h-3.5 text-[#22D3EE]" />
                          <span className="text-xs font-medium text-white">{type.label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">{items.length}</span>
                        </div>
                        <div className="p-2 space-y-1">
                          {items.map((item) => (<>
                          <WithPermission>
                            <div
                              key={item.id}
                              className="flex items-center gap-2 p-2 rounded bg-white/5 group"
                            >
                              {/* Status indicator */}
                              {item.status === 'processing' ? (
                                <div className="w-3.5 h-3.5 border-2 border-[#22D3EE] border-t-transparent rounded-full animate-spin shrink-0" />
                              ) : item.status === 'error' ? (
                                <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-xs font-medium text-white truncate">{item.title}</div>
                                  {item.status === 'processing' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#22D3EE]/20 text-[#22D3EE]">Scraping...</span>
                                  )}
                                  {item.status === 'error' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Failed</span>
                                  )}
                                  {type.id === 'website' && item.status === 'ready' && item.content.length > 100 && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                                      {(item.content.length / 1000).toFixed(1)}k chars
                                    </span>
                                  )}
                                  {type.id === 'document' && item.status === 'ready' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                      {item.content}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {type.id === 'website' ? (
                                    item.status === 'ready' && item.content.length > 100 ? (
                                      <span className="text-slate-400">{item.content.slice(0, 100)}...</span>
                                    ) : (
                                      <a href={item.additionalContent || item.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#22D3EE]">
                                        {item.additionalContent || item.content}
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )
                                  ) : type.id === 'document' ? (
                                    <span className="text-slate-400">
                                      {item.additionalContent || 'Document uploaded'}
                                    </span>
                                  ) : (
                                    item.content
                                  )}
                                </div>
                                {item.status === 'error' && item.additionalContent && (
                                  <div className="text-[9px] text-red-400 mt-0.5">{item.additionalContent}</div>
                                )}
                              </div>
                              {/* Re-scrape button for failed websites */}
                              {type.id === 'website' && item.status === 'error' && (
                                <button
                                  onClick={() => {
                                    toast.info('Re-scraping website...');
                                    scrapeWebsite.mutate({
                                      knowledgeItemId: item.id,
                                      url: item.additionalContent || item.content,
                                    });
                                  }}
                                  className="p-1 hover:bg-white/10 rounded text-[#22D3EE]"
                                  title="Retry scraping"
                                >
                                  <Globe className="w-3 h-3" />
                                </button>
                              )}
                              <WithPermission>
                              <button
                                onClick={() => setKnowledgeToDelete(item)}
                                disabled={deletingFaqId === item.id || deletingWebsiteId === item.id || deletingPolicyId === item.id || deletingDocumentId === item.id}
                                className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                              >
                                {(deletingFaqId === item.id || deletingWebsiteId === item.id || deletingPolicyId === item.id || deletingDocumentId === item.id) ? (
                                  <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                )}
                              </button>
                              </WithPermission>
                            </div>
                            </WithPermission>
                          </>))}
                        </div>
                        </div>
                      );
                    })}
                    {canAccessPropertyFinance && financeFiles.length > 0 && (
                      <div key="finance-library" className="rounded-lg border border-white/10 overflow-hidden">
                      <div className="flex items-center gap-2 p-2 bg-white/5">
                        <BarChart3 className="w-3.5 h-3.5 text-[#22D3EE]" />
                        <span className="text-xs font-medium text-white">Finance</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                          {financeFiles.length}
                        </span>
                        {financeFilesEntry?.loading && <Loader2 className="w-3 h-3 text-[#22D3EE] animate-spin" />}
                        {/* <button
                          onClick={() => void refetchFinanceFiles({ force: true })}
                          className="ml-auto p-1 rounded hover:bg-white/10 text-slate-400 hover:text-[#22D3EE]"
                          title="Refresh finance files"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button> */}
                      </div>
                      <div className="p-2 space-y-1">
                        {financeFilesEntry?.error && (
                          <p className="text-[10px] text-red-400 px-2 py-1">{financeFilesEntry.error}</p>
                        )}
                        {financeFiles.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-2">No finance files yet</p>
                        ) : (
                          financeFiles.map((file: ELUserFinanceFile) => {
                            const isDeleting = deletingFinanceNamespace === file.namespace;
                            return (
                              <div key={file.namespace} className="flex items-center gap-2 p-2 rounded bg-white/5 group">
                                <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-white truncate">{file.label || file.id}</div>
                                  {/* <div className="text-[10px] text-slate-400 truncate">
                                    {file.rowCount?.toLocaleString?.() ?? file.rowCount ?? 0} rows
                                  </div> */}
                                </div>
                                <button
                                  onClick={() => void handleDeleteFinanceFile(file.namespace)}
                                  disabled={isDeleting}
                                  className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                                  title="Delete finance file"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="w-3 h-3 text-red-400 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3 text-red-400" />
                                  )}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );

      case 'workflows':
        return (
          <div className="space-y-4">
            {/* Booking Workflow - Main Feature */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#10B981]/10 to-[#10B981]/5 border border-[#10B981]/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#10B981]/20 flex items-center justify-center text-xl">
                  📅
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">Book Appointments</h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#10B981]/20 text-[#10B981]">Active</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">AI can schedule meetings in your connected calendar</p>
                  
                  {/* Trigger Phrases */}
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Trigger Phrases</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['book a meeting', 'schedule a call', 'set up an appointment', 'find a time'].map((phrase) => (
                        <span key={phrase} className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-slate-300 border border-white/10">
                          "{phrase}"
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Connection Status */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-[10px] text-slate-400">Google Calendar not connected</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onUpdate?.()}
                      className="h-6 text-[10px] bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30"
                    >
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Workflows */}
            <div className="grid grid-cols-2 gap-2">
              {WORKFLOW_ACTIONS.filter(a => a.id !== 'booking').map((action) => (
                <button
                  key={action.id}
                  onClick={() => toast.info(`${action.label} - Coming soon!`)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#10B981]/50 hover:bg-[#10B981]/5 transition-all text-left opacity-60"
                >
                  <div className="w-8 h-8 rounded bg-[#10B981]/20 flex items-center justify-center text-base shrink-0">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">{action.label}</span>
                    <p className="text-[10px] text-slate-500">Coming soon</p>
                  </div>
                  <Lock className="w-3 h-3 text-slate-500" />
                </button>
              ))}
            </div>

            {/* How Workflows Work */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-300">How Workflows Work</p>
                  <p className="text-xs text-slate-400 mt-1">When a user says something like "book a meeting", your AI will automatically check your calendar and offer available times. Connect your calendar in the Connections tab to enable this.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-2">
            {[
              { id: 'voice', label: 'Voice Responses', icon: Volume2, desc: 'AI speaks aloud' },
              { id: 'calling', label: 'Phone Calling', icon: Phone, desc: 'Make & receive calls' },
              { id: 'sms', label: 'SMS Messaging', icon: MessageSquare, desc: 'Text support' },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="w-8 h-8 rounded bg-[#F59E0B]/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{feature.label}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">PRO</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{feature.desc}</p>
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
          </div>
        );
    
          case 'finetune':
        // Training simulation function
        const startTraining = async () => {
          setIsTraining(true);
          setTrainingStage('preparing');
          setTrainingProgress(0);
          setCurrentEpoch(0);
          
          // Stage 1: Preparing data (0-15%)
          await handleTrainingUpload();
          // await new Promise(r => setTimeout(r, 1500));
          setTrainingProgress(15);
          
          // Stage 2: Training epochs (15-80%)
          setTrainingStage('training');
          for (let epoch = 1; epoch <= totalEpochs; epoch++) {
            setCurrentEpoch(epoch);
            await new Promise(r => setTimeout(r, 1200));
            setTrainingProgress(15 + (epoch / totalEpochs) * 65);
          }
          
          // Stage 3: Validating (80-90%)
          setTrainingStage('validating');
          await new Promise(r => setTimeout(r, 1500));
          setTrainingProgress(90);
          
          // Stage 4: Deploying (90-100%)
          setTrainingStage('deploying');
          await new Promise(r => setTimeout(r, 1500));
          setTrainingProgress(100);
          
          // Complete
          setTrainingStage('complete');
          setIsModelTrained(true);
          setIsTraining(false);
        };
        
        // If training is in progress, show training visualization
        if (isTraining) {
          return (
            <div className="space-y-6">
              {/* Training Progress Header */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Training Custom Model</h3>
                    <p className="text-sm text-slate-300">Please wait while we fine-tune your AI...</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Progress</span>
                    <span className="text-purple-400 font-medium">{Math.round(trainingProgress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${trainingProgress}%` }}
                    />
                  </div>
                </div>
                
                {/* Current Stage */}
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-white">
                    {trainingStage === 'preparing' && 'Preparing training data...'}
                    {trainingStage === 'training' && `Training epoch ${currentEpoch}/${totalEpochs}...`}
                    {trainingStage === 'validating' && 'Validating model accuracy...'}
                    {trainingStage === 'deploying' && 'Deploying to production...'}
                  </span>
                </div>
              </div>
              
              {/* Training Stages Visual */}
              <div className="space-y-3">
                {[
                  { id: 'preparing', label: 'Prepare Data', desc: 'Processing training examples', icon: Database, progress: 15 },
                  { id: 'training', label: 'Train Model', desc: `Running ${totalEpochs} training epochs`, icon: Cpu, progress: 80 },
                  { id: 'validating', label: 'Validate', desc: 'Testing model accuracy', icon: BarChart3, progress: 90 },
                  { id: 'deploying', label: 'Deploy', desc: 'Publishing to production', icon: Rocket, progress: 100 },
                ].map((stage, idx) => {
                  const Icon = stage.icon;
                  const isActive = trainingStage === stage.id;
                  const isComplete = trainingProgress >= stage.progress;
                  const isPending = !isActive && !isComplete;
                  
                  return (
                    <div 
                      key={stage.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        isActive 
                          ? 'bg-purple-500/10 border-purple-500/40' 
                          : isComplete 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isActive 
                          ? 'bg-purple-500/30' 
                          : isComplete 
                            ? 'bg-emerald-500/30' 
                            : 'bg-white/10'
                      }`}>
                        {isComplete && !isActive ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        ) : (
                          <Icon className={`w-5 h-5 ${isPending ? 'text-slate-500' : 'text-white'}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isActive ? 'text-purple-300' : isComplete ? 'text-emerald-300' : 'text-slate-400'
                        }`}>{stage.label}</p>
                        <p className="text-xs text-slate-500">{stage.desc}</p>
                      </div>
                      {isActive && trainingStage === 'training' && (
                        <div className="text-right">
                          <p className="text-xs text-purple-400 font-mono">Epoch {currentEpoch}/{totalEpochs}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Training Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{trainingDataCount}</p>
                  <p className="text-xs text-slate-400">Training Examples</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-purple-400">{currentEpoch}/{totalEpochs}</p>
                  <p className="text-xs text-slate-400">Epochs</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-cyan-400">~2min</p>
                  <p className="text-xs text-slate-400">Est. Time</p>
                </div>
              </div>
            </div>
          );
        }
        
        // If model is trained, show success state with retrain option
        if (isModelTrained) {
          return (
            <div className="space-y-4">
              {/* Success Header */}
              <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl p-6 border border-emerald-500/30">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Custom Model Trained!</h3>
                    <p className="text-sm text-slate-300">Your AI is now using your fine-tuned model</p>
                  </div>
                </div>
                
                {/* Model Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-400">{trainingDataCount}</p>
                    <p className="text-xs text-slate-400">Training Samples</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-cyan-400">94.2%</p>
                    <p className="text-xs text-slate-400">Accuracy</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-purple-400">Active</p>
                    <p className="text-xs text-slate-400">Status</p>
                  </div>
                </div>
                
                <p className="text-xs text-slate-400">
                  Your custom model is now deployed and handling all conversations. Add more training data and retrain to improve accuracy.
                </p>
              </div>
              
              {/* Add More Data Section */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-sm font-medium text-white mb-3">Improve Your Model</h4>
                <p className="text-xs text-slate-400 mb-4">
                  Add more training data to improve your model's accuracy and coverage.
                </p>
                
                <div className="space-y-2 mb-4">
                  <div
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => setIsModelTrained(false)}
                  >
                    <div className="flex items-center gap-3">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-white">Upload More Data</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm text-white">Rapid Q&A Session</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
                
                {/* Retrain Button */}
                <Button
                  className="w-full h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium"
                  onClick={() => {
                    setIsModelTrained(false);
                    startTraining();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Custom LLM
                </Button>
                <p className="text-xs text-slate-500 text-center mt-2">
                  Retrain your model with the latest data
                </p>
              </div>
            </div>
          );
        }
        
        // Default: Show training setup
        return (
          <div className="space-y-4">
            {/* Fine-Tune Header */}
            <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg p-4 border border-pink-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Custom LLM Training</h3>
                  <p className="text-xs text-slate-400">Train a model specifically for your use case</p>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Fine-tuning creates a custom AI model trained on your data, providing more accurate and personalized responses.
              </p>
            </div>

            {/* Upload Training Data - Expanded Section */}
            <div className="bg-white/5 rounded-lg border border-emerald-500/20 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Upload Training Data</h4>
                    <p className="text-xs text-slate-400">Import your existing data to train the model</p>
                  </div>
                </div>
                
                {/* Upload Area */}
                <input
                  ref={trainingFileInputRef}
                  type="file"
                  accept=".pdf,.xls,.xlsx,.json,.jsonl,.csv,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,text/csv,text/plain,text/markdown"
                  className="hidden"
                  onChange={handleTrainingFileChange}
                />
                <div
                  role="button"
                  tabIndex={0}
                  className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-emerald-500/50 transition-colors cursor-pointer"
                  onClick={() => trainingFileInputRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && trainingFileInputRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) setTrainingSelectedFile(file);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-white mb-1">Drop file here or click to upload</p>
                  <p className="text-xs text-slate-400">Maximum 10MB per file. PDF, CSV, XLS, XLSX, JSON, JSONL, TXT, MD, DOC, DOCX</p>
                  {trainingSelectedFile && (
                    <p className="mt-2 text-xs text-emerald-400 truncate max-w-full">{trainingSelectedFile.name}</p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!trainingSelectedFile || !agentUniqueId || trainingUploadLoading}
                    // onClick={handleTrainingUpload}
                    onClick={startTraining}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white w-full"
                  >
                    {trainingUploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    {trainingUploadLoading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
              
              {/* Supported Formats */}
              <div className="p-4 bg-white/[0.02]">
                <h5 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Supported Formats</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-start gap-2 p-2 rounded bg-white/5">
                    <FileText className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-white">CSV / Excel</p>
                      <p className="text-[10px] text-slate-400">Q&A pairs in columns</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-white/5">
                    <FileText className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-white">JSON / JSONL</p>
                      <p className="text-[10px] text-slate-400">Structured conversations</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-white/5">
                    <FileText className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-white">TXT / Markdown</p>
                      <p className="text-[10px] text-slate-400">Plain text documents</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-white/5">
                    <FileText className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-white">PDF</p>
                      <p className="text-[10px] text-slate-400">Knowledge documents</p>
                    </div>
                  </div>
                </div>
                
                {/* Format Tips */}
                <div className="mt-3 p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-[10px] text-cyan-300">
                    <strong>Tip:</strong> For best results, use CSV with "question" and "answer" columns, or JSONL with {'{"prompt": "...", "completion": "..."}"'} format.
                  </p>
                </div>
              </div>
              
              {/* Uploaded Files */}
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Uploaded Files</span>
                  <span className="text-xs text-slate-500">{trainingDocuments.length} file{trainingDocuments.length !== 1 ? 's' : ''}</span>
                </div>
                {trainingDocuments.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-xs">
                    No files uploaded yet
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {trainingDocuments.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-left"
                      >
                        <FileText className={`w-4 h-4 flex-shrink-0 ${getFileIconColor(doc.extension_type)}`} />
                        <span className="text-xs text-white truncate flex-1">{doc.title}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          disabled={deletingDocumentId === doc.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setDeletingDocumentId(doc.id);
                            try {
                              await dispatch(removeAvatarDocument(doc.id)).unwrap();
                              refetchKnowledge();
                              toast.success('Document deleted');
                            } catch (err: unknown) {
                              toast.error(err instanceof Error ? err.message : 'Failed to delete document');
                            } finally {
                              setDeletingDocumentId(null);
                            }
                          }}
                        >
                          {deletingDocumentId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Other Training Methods */}
            <div className="space-y-2">
              {/* <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Other Training Methods</h4> */}
              
              {/* Rapid Q&A */}
              {/* <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Rapid Q&A Session</p>
                    <p className="text-xs text-slate-400">Answer questions as your AI would respond</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">0/40</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div> */}

              {/* Generate Synthetic Data */}
              {/* <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Generate Synthetic Data</p>
                    <p className="text-xs text-slate-400">AI generates training examples from your profile</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">0 examples</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div> */}
            </div>

            {/* Training Progress */}
            <div className="bg-white/5 rounded-lg p-4 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Training Readiness</span>
                <span className="text-xs font-medium text-emerald-400">100% Ready</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all" />
              </div>
              <p className="text-xs text-emerald-400 mt-2">
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                {trainingDataCount} training examples ready • Minimum requirement met
              </p>
            </div>

            {/* Start Training Button */}
            <Button
              className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium shadow-lg shadow-purple-500/25"
              onClick={startTraining}
              disabled={!trainingSelectedFile || !agentUniqueId || trainingUploadLoading}
            >
              <Brain className="w-4 h-4 mr-2" />
              Start Fine-Tuning
            </Button>

            {/* Info Notice */}
            <div className="text-center">
              <p className="text-xs text-slate-400">
                Training typically takes 2-5 minutes depending on data size
              </p>
            </div>
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
            <h1 className="text-lg font-bold text-white">Train Your Worker</h1>
            <p className="text-xs text-slate-400">Build your AI agent step by step</p>
          </div>
          {/* <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-xs text-slate-400">Progress</span>
              <span className="text-sm font-medium text-white ml-2">{overallProgress}%</span>
            </div>
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#22D3EE] transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div> */}
        </div>
      </div>

      {/* Step Pills - Horizontal */}
      <div className="px-4 py-2 border-b border-white/5 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {TRAINING_STEPS.map((step) => {
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
                  {/* {progress >= 100 ? ( */}
                    {/* <Check className="w-3 h-3" style={{ color: step.color }} /> */}
                  {/* ) : ( */}
                    <Icon className="w-3 h-3" style={{ color: step.color }} />
                  {/* )} */}
                </div>
                <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {step.label} {" "}
                  { step?.soon && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">PRO</span> }
                </span>
                {/* {progress > 0 && progress < 100 && (
                  <div className="w-8 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: step.color }}
                    />
                  </div>
                )} */}
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
            {TRAINING_STEPS.filter(s => s.id === activeStep).map(step => {
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

      {/* Add Rule Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#0D1B2A] border-white/10" 
          onInteractOutside={(e) => e.preventDefault()}
          >
          <DialogHeader>
            <DialogTitle className="text-white">Add {newRule.type}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new {newRule.type} and define how this worker should behave.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-400">Type</Label>
              <Select value={newRule.type} onValueChange={(v) => setNewRule(prev => ({ ...prev, type: v as RuleType }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prompt">Prompt</SelectItem>
                  <SelectItem value="guardrail">Guardrail</SelectItem>
                  <SelectItem value="rule">Rule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Title</Label>
              <Input
                value={newRule.title}
                onChange={(e) => setNewRule(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Be concise"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Description</Label>
              <Textarea
                value={newRule.content}
                onChange={(e) => setNewRule(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Describe the behavior..."
                className="bg-white/5 border-white/10 text-white min-h-[80px] max-h-[400px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-white/20" disabled={isAddingRule}>Cancel</Button>
            <Button onClick={handleAddRule} disabled={isAddingRule} className="bg-[#6366F1] hover:bg-[#6366F1]/90">
              {isAddingRule ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</> : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation Dialog */}
      <Dialog
        open={!!ruleToDelete}
        onOpenChange={(open) => {
          if (!open) setRuleToDelete(null);
        }}
      >
        <DialogContent className="bg-[#0D1B2A] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete rule?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Confirm before permanently deleting this rule.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-300 space-y-2">
            <p>
              This action will permanently delete
              {ruleToDelete?.title ? ` "${ruleToDelete.title}"` : " this rule"}.
            </p>
            <p className="text-slate-400">You cannot undo this action.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRuleToDelete(null)}
              className="border-white/20"
              disabled={deletingRuleId === ruleToDelete?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!ruleToDelete) return;
                await handleDeleteRule(ruleToDelete.id);
                setRuleToDelete(null);
              }}
              disabled={!ruleToDelete || deletingRuleId === ruleToDelete.id}
            >
              {deletingRuleId === ruleToDelete?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Knowledge Confirmation Dialog */}
      <Dialog
        open={!!knowledgeToDelete}
        onOpenChange={(open) => {
          if (!open) setKnowledgeToDelete(null);
        }}
      >
        <DialogContent className="bg-[#0D1B2A] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete item?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Confirm before permanently deleting this knowledge item.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-300 space-y-2">
            <p>
              This action will permanently delete
              {knowledgeToDelete?.title ? ` "${knowledgeToDelete.title}"` : " this item"}.
            </p>
            <p className="text-slate-400">You cannot undo this action.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setKnowledgeToDelete(null)}
              className="border-white/20"
              disabled={
                !!knowledgeToDelete &&
                (deletingFaqId === knowledgeToDelete.id ||
                  deletingWebsiteId === knowledgeToDelete.id ||
                  deletingPolicyId === knowledgeToDelete.id ||
                  deletingDocumentId === knowledgeToDelete.id)
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!knowledgeToDelete) return;
                await handleDeleteKnowledge(knowledgeToDelete);
                setKnowledgeToDelete(null);
              }}
              disabled={
                !knowledgeToDelete ||
                deletingFaqId === knowledgeToDelete.id ||
                deletingWebsiteId === knowledgeToDelete.id ||
                deletingPolicyId === knowledgeToDelete.id ||
                deletingDocumentId === knowledgeToDelete.id
              }
            >
              {knowledgeToDelete &&
              (deletingFaqId === knowledgeToDelete.id ||
                deletingWebsiteId === knowledgeToDelete.id ||
                deletingPolicyId === knowledgeToDelete.id ||
                deletingDocumentId === knowledgeToDelete.id) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent className="bg-[#0D1B2A] border-white/10" 
          onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white">Edit {editingRule?.type}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update the title or description for this {editingRule?.type ?? "rule"}.
            </DialogDescription>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-400">Title</Label>
                <Input
                  value={editingRule.title}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Description</Label>
                <Textarea
                  value={editingRule.content}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, content: e.target.value } : null)}
                  className="bg-white/5 border-white/10 text-white min-h-[80px] max-h-[400px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)} className="border-white/20" disabled={isUpdatingRule}>Cancel</Button>
            <Button onClick={handleUpdateRule} disabled={isUpdatingRule} className="bg-[#6366F1] hover:bg-[#6366F1]/90">
              {isUpdatingRule ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog
        open={canAccessPropertyFinance && isPropertyFinanceDialogOpen}
        onOpenChange={(open) => {
          if (!canAccessPropertyFinance) return;
          setIsPropertyFinanceDialogOpen(open);
        }}
      >
        <DialogContent className="bg-[#0D1B2A] border-white/10" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#22D3EE]" />
              Add Finance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-400">Title</Label>
              <Input
                value={propertyFinanceTitle}
                onChange={(e) => setPropertyFinanceTitle(e.target.value)}
                placeholder="e.g., April 2026 Finance"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Description</Label>
              <Textarea
                value={propertyFinanceDescription}
                onChange={(e) => setPropertyFinanceDescription(e.target.value)}
                placeholder="Optional notes about this finance file"
                className="bg-white/5 border-white/10 text-white min-h-[80px] max-h-[200px]"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400 mb-2 block">Upload File</Label>
              <div className="relative">
                <input
                  type="file"
                  id="property-finance-upload"
                  accept={PROPERTY_FINANCE_ACCEPT}
                  onChange={(e) => setPropertyFinanceFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <label
                  htmlFor="property-finance-upload"
                  className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-[#22D3EE]/50 transition-all cursor-pointer"
                >
                  {propertyFinanceFile ? (
                    <>
                      <FileText className="w-8 h-8 text-[#22D3EE] mb-2" />
                      <p className="text-sm text-white font-medium">{propertyFinanceFile.name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {(propertyFinanceFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-white mb-1">Click to upload finance file</p>
                      <p className="text-xs text-slate-400">CSV, XLS, XLSX</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPropertyFinanceDialogOpen(false);
                setPropertyFinanceFile(null);
                setPropertyFinanceTitle("");
                setPropertyFinanceDescription("");
              }}
              className="border-white/20"
              disabled={isUploadingPropertyFinance}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePropertyFinanceUpload}
              className="bg-[#22D3EE] hover:bg-[#22D3EE]/90 text-black"
              disabled={isUploadingPropertyFinance || !propertyFinanceFile}
            >
              {isUploadingPropertyFinance ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Knowledge Dialog */}
      <Dialog open={isKnowledgeDialogOpen} onOpenChange={setIsKnowledgeDialogOpen}>
        <DialogContent className="bg-[#0D1B2A] border-white/10" 
          onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {activeKnowledgeType && (
                <>
                  {(() => {
                    const type = KNOWLEDGE_TYPES.find(t => t.id === activeKnowledgeType);
                    const Icon = type?.icon || FileText;
                    return <Icon className="w-5 h-5 text-[#22D3EE]" />;
                  })()}
                  Add {KNOWLEDGE_TYPES.find(t => t.id === activeKnowledgeType)?.label}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a new {KNOWLEDGE_TYPES.find(t => t.id === activeKnowledgeType)?.label?.toLowerCase() ?? "knowledge item"} to train this worker.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {activeKnowledgeType === 'faq' ? (
              <>
                <div>
                  <Label className="text-xs text-slate-400">Question</Label>
                  <Input
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="What question should your AI answer?"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Answer</Label>
                  <Textarea
                    value={newKnowledge.content}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="The answer your AI should give..."
                    className="bg-white/5 border-white/10 text-white min-h-[100px]"
                  />
                </div>
              </>
            ) : activeKnowledgeType === 'website' ? (
              <>
                <div>
                  <Label className="text-xs text-slate-400">Website Name</Label>
                  <Input
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Company Website"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">URL</Label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={newKnowledge.content}
                      onChange={(e) => setNewKnowledge(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="https://example.com"
                      className="bg-white/5 border-white/10 text-white pl-10"
                    />
                  </div>
                </div>
              </>
            ) : activeKnowledgeType === 'document' ? (
              <>
                <div>
                  <Label className="text-xs text-slate-400">Document Title</Label>
                  <Input
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Product Catalog 2024"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Description</Label>
                  <Textarea
                    value={newKnowledge.content}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Brief description of what this document contains..."
                    className="bg-white/5 border-white/10 text-white min-h-[80px] max-h-[400px]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400 mb-2 block">Upload File</Label>
                  <div className="relative">
                    <input
                      type="file"
                      id="document-upload"
                      // accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      accept=".pdf,.xls,.xlsx,.json,.jsonl,.csv,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,text/csv,text/plain,text/markdown"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="document-upload"
                      className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-[#22D3EE]/50 transition-all cursor-pointer"
                    >
                      {selectedFile ? (
                        <>
                          <FileText className="w-8 h-8 text-[#22D3EE] mb-2" />
                          <p className="text-sm text-white font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedFile(null);
                            }}
                            className="mt-2 text-xs text-red-400 hover:text-red-300"
                          >
                            Remove file
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <p className="text-sm text-white mb-1">Click to upload document</p>
                          <p className="text-xs text-slate-400">PDF, CSV, XLS, XLSX, JSON, JSONL, TXT, MD, DOC, DOCX (Max 10MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </>
            ) : activeKnowledgeType === 'policy' ? (
              <>
                <div>
                  <Label className="text-xs text-slate-400">Policy Name</Label>
                  <Input
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Refund Policy"
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Policy Details</Label>
                  <Textarea
                    value={newKnowledge.content}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Describe the policy your AI should follow..."
                    className="bg-white/5 border-white/10 text-white min-h-[100px] max-h-[480px] "
                  />
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsKnowledgeDialogOpen(false);
                setSelectedFile(null);
              }} 
              className="border-white/20"
              disabled={isAddingFaq || isAddingWebsite || isAddingPolicy || isUploadingDocument}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddKnowledge} 
              className="bg-[#22D3EE] hover:bg-[#22D3EE]/90 text-black"
              disabled={isAddingFaq || isAddingWebsite || isAddingPolicy || isUploadingDocument}
            >
              {(isAddingFaq || isAddingWebsite || isAddingPolicy || isUploadingDocument) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploadingDocument ? 'Uploading...' : 'Adding...'}
                </>
              ) : (
                'Add'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
