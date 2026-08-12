import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  User,
  Globe,
  Code,
  Copy,
  Check,
  Rocket,
  Palette,
  MessageSquare,
  ExternalLink,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Settings,
} from "lucide-react";

interface PublishWorkerProps {
  workerId: number;
  workerName: string;
  readinessScore?: number;
  onPublished?: () => void;
}

type DeploymentType = "enterprise" | "consumer" | null;

export function PublishWorker({ workerId, workerName, readinessScore = 0, onPublished }: PublishWorkerProps) {
  const [selectedType, setSelectedType] = useState<DeploymentType>(null);
  const [step, setStep] = useState<"select" | "customize" | "complete">("select");
  const [copied, setCopied] = useState(false);
  
  // Enterprise widget settings
  const [widgetColor, setWidgetColor] = useState("#06b6d4");
  const [widgetPosition, setWidgetPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [welcomeMessage, setWelcomeMessage] = useState(`Hi! I'm ${workerName}. How can I help you today?`);
  
  // Consumer hosted page settings
  const [hostedSlug, setHostedSlug] = useState(workerName.toLowerCase().replace(/\s+/g, "-"));
  const [hostedTitle, setHostedTitle] = useState(`Chat with ${workerName}`);
  const [hostedDescription, setHostedDescription] = useState(`Get expert advice from ${workerName}`);
  const [brandColor, setBrandColor] = useState("#06b6d4");

  const { data: worker, refetch } = trpc.worker.getById.useQuery({ workerId });
  
  const publishMutation = trpc.worker.publish.useMutation({
    onSuccess: () => {
      toast.success("Worker published successfully!");
      setStep("complete");
      refetch();
      onPublished?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish worker");
    },
  });

  const isLocked = readinessScore < 70;
  const isPublished = worker?.deploymentType && worker.deploymentType !== "none";

  const handlePublish = () => {
    if (!selectedType) return;
    
    publishMutation.mutate({
      workerId,
      deploymentType: selectedType,
      // Enterprise settings
      widgetPrimaryColor: widgetColor,
      widgetPosition,
      widgetWelcomeMessage: welcomeMessage,
      // Consumer settings
      hostedSlug,
      hostedTitle,
      hostedDescription,
      hostedBrandColor: brandColor,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    console.log("setTimeout 15");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateWidgetCode = () => {
    const key = worker?.widgetKey || "demo-key";
    return `<!-- Qiko Chat Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['QikoWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','qiko','https://widget.qiko.ai/v1/loader.js'));
  qiko('init', '${key}');
</script>`;
  };

  const getHostedUrl = () => {
    const slug = worker?.hostedSlug || hostedSlug;
    return `https://chat.qiko.ai/${slug}`;
  };

  // Already published view
  if (isPublished && step === "select") {
    return (
      <div className="p-6 space-y-6 overflow-auto h-full">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publish Worker</h1>
          <p className="text-muted-foreground">
            Your worker is live and ready to serve customers
          </p>
        </div>

        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-400">Worker Published</h3>
                <p className="text-sm text-muted-foreground">
                  Deployed as {worker?.deploymentType === "enterprise" ? "Enterprise Widget" : "Consumer Hosted Page"}
                </p>
              </div>
              <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                Live
              </Badge>
            </div>
          </CardContent>
        </Card>

        {worker?.deploymentType === "enterprise" && (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="w-5 h-5 text-cyan-400" />
                Widget Embed Code
              </CardTitle>
              <CardDescription>
                Add this code to your website's HTML, just before the closing &lt;/body&gt; tag
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 overflow-x-auto">
                  <code>{generateWidgetCode()}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(generateWidgetCode())}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setStep("customize")}>
                <Settings className="w-4 h-4 mr-2" />
                Customize Widget
              </Button>
            </CardContent>
          </Card>
        )}

        {worker?.deploymentType === "consumer" && (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-400" />
                Hosted Chat Page
              </CardTitle>
              <CardDescription>
                Share this link with your customers to start conversations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={getHostedUrl()}
                  readOnly
                  className="bg-slate-900 border-slate-700"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(getHostedUrl())}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(getHostedUrl(), "_blank")}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setStep("customize")}>
                <Settings className="w-4 h-4 mr-2" />
                Customize Page
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Locked view
  if (isLocked) {
    return (
      <div className="p-6 space-y-6 overflow-auto h-full">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publish Worker</h1>
          <p className="text-muted-foreground">
            Make your digital worker available to customers
          </p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Publishing Locked</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Your worker needs at least 70% readiness before publishing. 
              Current readiness: <span className="text-cyan-400 font-semibold">{readinessScore}%</span>
            </p>
            <div className="w-full max-w-xs mx-auto bg-slate-700/50 rounded-full h-3 mb-4">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                style={{ width: `${readinessScore}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Add more training data to unlock publishing
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Selection step
  if (step === "select") {
    return (
      <div className="p-6 space-y-6 overflow-auto h-full">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publish Worker</h1>
          <p className="text-muted-foreground">
            Choose how you want to deploy your digital worker
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Enterprise Option */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className={`cursor-pointer transition-all h-full ${
                selectedType === "enterprise" 
                  ? "bg-cyan-500/10 border-cyan-500/50 ring-2 ring-cyan-500/30" 
                  : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
              }`}
              onClick={() => setSelectedType("enterprise")}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedType === "enterprise" ? "bg-cyan-500/20" : "bg-slate-700/50"
                  }`}>
                    <Building2 className={`w-6 h-6 ${
                      selectedType === "enterprise" ? "text-cyan-400" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">Enterprise</h3>
                      <Badge variant="outline" className="text-xs">Widget</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Embed a chat widget on your existing website. Perfect for businesses 
                      with established web presence.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Embeddable JavaScript widget
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Customizable colors & position
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Works on any website
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Consumer Option */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className={`cursor-pointer transition-all h-full ${
                selectedType === "consumer" 
                  ? "bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/30" 
                  : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600"
              }`}
              onClick={() => setSelectedType("consumer")}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedType === "consumer" ? "bg-purple-500/20" : "bg-slate-700/50"
                  }`}>
                    <User className={`w-6 h-6 ${
                      selectedType === "consumer" ? "text-purple-400" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">Consumer</h3>
                      <Badge variant="outline" className="text-xs">Hosted Page</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get a dedicated chat page hosted by Qiko. Perfect for individuals 
                      and those without a website.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Shareable link (chat.qiko.ai/you)
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Custom branding & description
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-400" />
                        No website required
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="flex justify-end">
          <Button
            disabled={!selectedType}
            onClick={() => setStep("customize")}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Customize step
  if (step === "customize") {
    return (
      <div className="p-6 space-y-6 overflow-auto h-full">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Customize {selectedType === "enterprise" ? "Widget" : "Hosted Page"}
          </h1>
          <p className="text-muted-foreground">
            Personalize how your worker appears to customers
          </p>
        </div>

        <AnimatePresence mode="wait">
          {selectedType === "enterprise" ? (
            <motion.div
              key="enterprise"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5 text-cyan-400" />
                    Widget Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={widgetColor}
                          onChange={(e) => setWidgetColor(e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={widgetColor}
                          onChange={(e) => setWidgetColor(e.target.value)}
                          className="bg-slate-900 border-slate-700"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={widgetPosition === "bottom-right" ? "default" : "outline"}
                          onClick={() => setWidgetPosition("bottom-right")}
                          className="flex-1"
                        >
                          Bottom Right
                        </Button>
                        <Button
                          variant={widgetPosition === "bottom-left" ? "default" : "outline"}
                          onClick={() => setWidgetPosition("bottom-left")}
                          className="flex-1"
                        >
                          Bottom Left
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Welcome Message</Label>
                    <Textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="Hi! How can I help you today?"
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Widget Preview */}
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative bg-slate-900 rounded-lg h-48 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
                    <div 
                      className={`absolute ${widgetPosition === "bottom-right" ? "right-4" : "left-4"} bottom-4`}
                    >
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                        style={{ backgroundColor: widgetColor }}
                      >
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="consumer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-400" />
                    Page Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Page URL</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">chat.qiko.ai/</span>
                      <Input
                        value={hostedSlug}
                        onChange={(e) => setHostedSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                        placeholder="your-name"
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Page Title</Label>
                    <Input
                      value={hostedTitle}
                      onChange={(e) => setHostedTitle(e.target.value)}
                      placeholder="Chat with Expert"
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={hostedDescription}
                      onChange={(e) => setHostedDescription(e.target.value)}
                      placeholder="Get expert advice on..."
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Brand Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="bg-slate-900 border-slate-700"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hosted Page Preview */}
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-900 rounded-lg p-6 text-center">
                    <div 
                      className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{ backgroundColor: brandColor }}
                    >
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{hostedTitle || "Chat with Expert"}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{hostedDescription || "Get expert advice"}</p>
                    <div className="text-xs text-muted-foreground">
                      chat.qiko.ai/{hostedSlug || "your-name"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep("select")}>
            Back
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishMutation.isPending}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
          >
            {publishMutation.isPending ? (
              <>Publishing...</>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Publish Worker
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Complete step
  if (step === "complete") {
    return (
      <div className="p-6 space-y-6 overflow-auto h-full">
        <div className="text-center py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 mx-auto mb-6 flex items-center justify-center"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">Worker Published!</h1>
          <p className="text-muted-foreground mb-6">
            Your digital worker is now live and ready to serve customers
          </p>
          
          {selectedType === "enterprise" && (
            <Card className="bg-slate-800/50 border-slate-700/50 text-left max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="w-5 h-5 text-cyan-400" />
                  Add to Your Website
                </CardTitle>
                <CardDescription>
                  Copy this code and paste it before the closing &lt;/body&gt; tag
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-slate-900 rounded-lg p-4 text-sm text-slate-300 overflow-x-auto">
                    <code>{generateWidgetCode()}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(generateWidgetCode())}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedType === "consumer" && (
            <Card className="bg-slate-800/50 border-slate-700/50 text-left max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  Your Chat Page is Live
                </CardTitle>
                <CardDescription>
                  Share this link with your customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    value={getHostedUrl()}
                    readOnly
                    className="bg-slate-900 border-slate-700"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(getHostedUrl())}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={() => window.open(getHostedUrl(), "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            variant="outline"
            className="mt-6"
            onClick={() => setStep("select")}
          >
            Back to Settings
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
