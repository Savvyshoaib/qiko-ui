import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";
import { trpc } from "../lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Save, Sparkles, Check, Plane, Lock, Building2, Briefcase, Heart, Scale } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  WizardData, 
  SPECIALIZATION_CATEGORIES, 
  TRAVEL_SPECIALIZATION_CATEGORIES,
  TONE_OPTIONS, 
  PLAN_OPTIONS,
  INDUSTRY_OPTIONS 
} from "../types";
import { toast } from "sonner";

const TOTAL_STEPS = 10;

const STEP_TITLES = [
  "Choose your industry",
  "Tell us who you are",
  "What is your specialisation?",
  "How should your digital worker speak?",
  "Share your background",
  "Show your track record",
  "How do you think and decide?",
  "Your judgement and boundaries",
  "What should your worker actually do?",
  "Choose your plan",
];

export default function CreatorWizard() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardData>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing worker data
  const { data: existingWorker, isLoading: workerLoading } = trpc.worker.get.useQuery();
  
  // Mutations
  const saveMutation = trpc.worker.save.useMutation();
  const createMutation = trpc.worker.create.useMutation();

  // Load existing data
  useEffect(() => {
    if (existingWorker) {
      setFormData({
        fullName: existingWorker.fullName || "",
        professionalTitle: existingWorker.professionalTitle || "",
        location: existingWorker.location || "",
        headline: existingWorker.headline || "",
        categories: existingWorker.categories || [],
        yearsOfExperience: existingWorker.yearsOfExperience || undefined,
        typicalClients: existingWorker.typicalClients || "",
        tone: existingWorker.tone || "",
        additionalGuidance: existingWorker.additionalGuidance || "",
        professionalBackground: existingWorker.professionalBackground || "",
        credentials: existingWorker.credentials || "",
        achievements: existingWorker.achievements || "",
        commonMistakes: existingWorker.commonMistakes || "",
        frameworks: existingWorker.frameworks || "",
        stakeholderBalance: existingWorker.stakeholderBalance || "",
        boundaries: existingWorker.boundaries || "",
        commonTasks: existingWorker.commonTasks || "",
        exampleQA: existingWorker.exampleQA || "",
        planType: existingWorker.planType || "foundational",
        monthlyPrice: existingWorker.monthlyPrice || undefined,
        industry: existingWorker.industry || undefined,
      });
      setCurrentStep(existingWorker.currentStep || 1);
    }
  }, [existingWorker]);

  const updateField = <K extends keyof WizardData>(field: K, value: WizardData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    const current = formData.categories || [];
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updateField("categories", updated);
  };

  const handleSaveAndExit = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        ...formData,
        currentStep,
      });
      toast.success("Progress saved!");
      setLocation("/");
    } catch (error) {
      toast.error("Failed to save progress");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // Auto-save on step change
    try {
      await saveMutation.mutateAsync({
        ...formData,
        currentStep: currentStep + 1,
      });
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const newWorker = await createMutation.mutateAsync(formData);
      // Navigate to the creating page with the worker ID
      if (newWorker?.id) {
        setLocation(`/creating/${newWorker.id}`);
      } else {
        setLocation("/creating");
      }
    } catch (error) {
      toast.error("Failed to create digital worker");
    } finally {
      setIsSaving(false);
    }
  };

  if (workerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-lg qiko-gradient animate-pulse-glow flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-background" />
        </div>
      </div>
    );
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/qiko-logo.png" 
                alt="Qiko" 
                className="h-6 w-auto"
              />
              <span className="text-muted-foreground">Creator</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSaveAndExit}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              Save & exit
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="container py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</span>
            <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Form Content */}
      <main className="container pb-24">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-8">
                {STEP_TITLES[currentStep - 1]}
              </h1>

              <Card>
                <CardContent className="p-6 space-y-6">
                  {currentStep === 1 && (
                    <Step1Industry formData={formData} updateField={updateField} />
                  )}
                  {currentStep === 2 && (
                    <Step2Profile formData={formData} updateField={updateField} />
                  )}
                  {currentStep === 3 && (
                    <Step3Specialisation 
                      formData={formData} 
                      updateField={updateField}
                      onCategoryToggle={handleCategoryToggle}
                    />
                  )}
                  {currentStep === 4 && (
                    <Step4Tone formData={formData} updateField={updateField} />
                  )}
                  {currentStep === 5 && (
                    <Step5Background formData={formData} updateField={updateField} />
                  )}
                  {currentStep === 6 && (
                    <Step6Achievements formData={formData} updateField={updateField} />
                  )}
                  {currentStep === 7 && (
                    <Step7Opinions formData={formData} updateField={updateField} />
                  )}
                  {currentStep === 8 && (
                    <Step8Empathy formData={formData} updateField={updateField} />
                  )}
                  {currentStep === 9 && (
                    <Step9Services formData={formData} updateField={updateField} />
                  )}
                  {currentStep === 10 && (
                    <Step10Plan formData={formData} updateField={updateField} />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border">
        <div className="container py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="qiko-btn-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < TOTAL_STEPS ? (
              <Button onClick={handleNext} className="qiko-btn-primary">
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleFinish} 
                disabled={isSaving}
                className="qiko-btn-primary"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Finish & create my digital worker
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

// Step Components
interface StepProps {
  formData: WizardData;
  updateField: <K extends keyof WizardData>(field: K, value: WizardData[K]) => void;
}

function Step1Industry({ formData, updateField }: StepProps) {
  const industryIcons: Record<string, React.ReactNode> = {
    travel_leisure: <Plane className="w-5 h-5" />,
    real_estate: <Building2 className="w-5 h-5" />,
    financial_services: <Briefcase className="w-5 h-5" />,
    healthcare: <Heart className="w-5 h-5" />,
    legal: <Scale className="w-5 h-5" />,
    other: <Sparkles className="w-5 h-5" />,
  };

  return (
    <>
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Select the industry your digital worker will specialize in. Each industry unlocks specific features and integrations.
        </p>
        <div className="grid grid-cols-1 gap-3">
          {INDUSTRY_OPTIONS.map((industry) => (
            <div
              key={industry.value}
              className={`relative flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                !industry.active ? "opacity-60" : ""
              } ${
                formData.industry === industry.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => industry.active && updateField("industry", industry.value)}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                formData.industry === industry.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {industryIcons[industry.value]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{industry.title}</span>
                  {!industry.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Coming Soon
                    </span>
                  )}
                  {industry.value === "travel_leisure" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{industry.description}</p>
                {industry.active && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {industry.features.map((feature) => (
                      <span key={feature} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {formData.industry === industry.value && (
                <div className="absolute top-4 right-4">
                  <Check className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Step2Profile({ formData, updateField }: StepProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          value={formData.fullName || ""}
          onChange={(e) => updateField("fullName", e.target.value)}
          placeholder="Your full name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="professionalTitle">Professional Title</Label>
        <Input
          id="professionalTitle"
          value={formData.professionalTitle || ""}
          onChange={(e) => updateField("professionalTitle", e.target.value)}
          placeholder="e.g., Procurement & ERP Specialist"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location || ""}
          onChange={(e) => updateField("location", e.target.value)}
          placeholder="e.g., Dubai, UAE"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Textarea
          id="headline"
          value={formData.headline || ""}
          onChange={(e) => updateField("headline", e.target.value)}
          placeholder="e.g., I help UAE SMEs run world-class procurement."
          rows={2}
        />
        <p className="text-sm text-muted-foreground">A short, compelling description of what you do (1-2 lines)</p>
      </div>
    </>
  );
}

interface Step3Props extends StepProps {
  onCategoryToggle: (category: string) => void;
}

function Step3Specialisation({ formData, updateField, onCategoryToggle }: Step3Props) {
  // Use travel-specific categories for Travel & Leisure industry
  const categories = formData.industry === 'travel_leisure' 
    ? TRAVEL_SPECIALIZATION_CATEGORIES 
    : SPECIALIZATION_CATEGORIES;
  
  const categoryLabel = formData.industry === 'travel_leisure'
    ? "What type of travel do you specialise in? (select all that apply)"
    : "Category (select all that apply)";

  return (
    <>
      <div className="space-y-3">
        <Label>{categoryLabel}</Label>
        {formData.industry === 'travel_leisure' && (
          <p className="text-sm text-muted-foreground">
            Select the travel experiences you're an expert in. This helps your digital worker provide specialised advice.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((category) => (
            <div
              key={category}
              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.categories?.includes(category)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => onCategoryToggle(category)}
            >
              <Checkbox
                checked={formData.categories?.includes(category)}
                onCheckedChange={() => onCategoryToggle(category)}
              />
              <span className="text-sm">{category}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="yearsOfExperience">Years of Experience</Label>
        <Input
          id="yearsOfExperience"
          type="number"
          min={0}
          max={50}
          value={formData.yearsOfExperience || ""}
          onChange={(e) => updateField("yearsOfExperience", parseInt(e.target.value) || undefined)}
          placeholder="e.g., 10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="typicalClients">Typical Clients & Industries</Label>
        <Textarea
          id="typicalClients"
          value={formData.typicalClients || ""}
          onChange={(e) => updateField("typicalClients", e.target.value)}
          placeholder="Describe the types of clients and industries you typically work with..."
          rows={4}
        />
      </div>
    </>
  );
}

function Step4Tone({ formData, updateField }: StepProps) {
  return (
    <>
      <div className="space-y-3">
        <Label>Tone</Label>
        <RadioGroup
          value={formData.tone || ""}
          onValueChange={(value) => updateField("tone", value)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {TONE_OPTIONS.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                formData.tone === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => updateField("tone", option.value)}
            >
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value} className="cursor-pointer font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div className="space-y-2">
        <Label htmlFor="additionalGuidance">Additional Guidance</Label>
        <Textarea
          id="additionalGuidance"
          value={formData.additionalGuidance || ""}
          onChange={(e) => updateField("additionalGuidance", e.target.value)}
          placeholder="e.g., I am direct but respectful. I like to give clear recommendations, not just options."
          rows={4}
        />
        <p className="text-sm text-muted-foreground">
          Any specific communication preferences or style notes
        </p>
      </div>
    </>
  );
}

function Step5Background({ formData, updateField }: StepProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="professionalBackground">Professional Background</Label>
        <Textarea
          id="professionalBackground"
          value={formData.professionalBackground || ""}
          onChange={(e) => updateField("professionalBackground", e.target.value)}
          placeholder="Share your professional journey, key roles, and experience..."
          rows={8}
        />
        <p className="text-sm text-muted-foreground">
          Include your career history, key roles, and relevant experience
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="credentials">Key Credentials / Certifications</Label>
        <Textarea
          id="credentials"
          value={formData.credentials || ""}
          onChange={(e) => updateField("credentials", e.target.value)}
          placeholder="List your certifications, degrees, and professional qualifications..."
          rows={4}
        />
      </div>
    </>
  );
}

function Step6Achievements({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="achievements">Key Achievements</Label>
      <Textarea
        id="achievements"
        value={formData.achievements || ""}
        onChange={(e) => updateField("achievements", e.target.value)}
        placeholder="Write 3-5 achievements with context and measurable outcomes. For example: 'Led a 30M procurement program with 15% cost savings while maintaining full regulatory compliance.'"
        rows={10}
      />
      <p className="text-sm text-muted-foreground">
        Include specific numbers, outcomes, and context for each achievement
      </p>
    </div>
  );
}

function Step7Opinions({ formData, updateField }: StepProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="commonMistakes">What do most people get wrong in your domain?</Label>
        <Textarea
          id="commonMistakes"
          value={formData.commonMistakes || ""}
          onChange={(e) => updateField("commonMistakes", e.target.value)}
          placeholder="Share your contrarian views and common misconceptions you've observed..."
          rows={5}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="frameworks">What frameworks do you use to solve problems?</Label>
        <Textarea
          id="frameworks"
          value={formData.frameworks || ""}
          onChange={(e) => updateField("frameworks", e.target.value)}
          placeholder="Describe your decision-making frameworks, methodologies, or mental models..."
          rows={5}
        />
      </div>
    </>
  );
}

function Step8Empathy({ formData, updateField }: StepProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="stakeholderBalance">
          How do you balance different stakeholders when making decisions?
        </Label>
        <Textarea
          id="stakeholderBalance"
          value={formData.stakeholderBalance || ""}
          onChange={(e) => updateField("stakeholderBalance", e.target.value)}
          placeholder="Describe how you navigate competing interests and priorities..."
          rows={5}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="boundaries">
          What would you never do for a client, even under pressure?
        </Label>
        <Textarea
          id="boundaries"
          value={formData.boundaries || ""}
          onChange={(e) => updateField("boundaries", e.target.value)}
          placeholder="Define your professional boundaries and ethical lines..."
          rows={5}
        />
      </div>
    </>
  );
}

function Step9Services({ formData, updateField }: StepProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="commonTasks">Common Tasks / Services</Label>
        <Textarea
          id="commonTasks"
          value={formData.commonTasks || ""}
          onChange={(e) => updateField("commonTasks", e.target.value)}
          placeholder="List concrete tasks your digital worker should handle, e.g., 'Review RFPs', 'Draft procurement strategy', 'Screen candidates'..."
          rows={5}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="exampleQA">Example Client Question and How You'd Answer</Label>
        <Textarea
          id="exampleQA"
          value={formData.exampleQA || ""}
          onChange={(e) => updateField("exampleQA", e.target.value)}
          placeholder="Provide an example question a client might ask and how you would respond..."
          rows={6}
        />
        <p className="text-sm text-muted-foreground">
          This helps train your digital worker's response style
        </p>
      </div>
    </>
  );
}

function Step10Plan({ formData, updateField }: StepProps) {
  return (
    <>
      <div className="space-y-4">
        <Label>Select Your Plan</Label>
        <RadioGroup
          value={formData.planType || "foundational"}
          onValueChange={(value) => updateField("planType", value as "foundational" | "premium")}
          className="space-y-3"
        >
          {PLAN_OPTIONS.map((plan) => (
            <div
              key={plan.value}
              className={`relative flex items-start space-x-4 p-4 rounded-lg border cursor-pointer transition-all ${
                formData.planType === plan.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => updateField("planType", plan.value as "foundational" | "premium")}
            >
              <RadioGroupItem value={plan.value} id={plan.value} className="mt-1" />
              <div className="flex-1">
                <Label htmlFor={plan.value} className="cursor-pointer font-semibold text-base">
                  {plan.title}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              {formData.planType === plan.value && (
                <div className="absolute top-4 right-4">
                  <Check className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
          ))}
        </RadioGroup>
      </div>
      <div className="space-y-2">
        <Label htmlFor="monthlyPrice">Monthly Price Suggestion (USD)</Label>
        <Input
          id="monthlyPrice"
          type="number"
          min={0}
          value={formData.monthlyPrice || ""}
          onChange={(e) => updateField("monthlyPrice", parseInt(e.target.value) || undefined)}
          placeholder="e.g., 99"
        />
        <p className="text-sm text-muted-foreground">
          You can change this later. This is just an indicative price for now.
        </p>
      </div>
    </>
  );
}
