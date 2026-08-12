import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-lg qiko-gradient animate-pulse-glow flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-background" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6">
        <img 
          src="/qiko-logo.png" 
          alt="Qiko" 
          className="h-7 w-auto"
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-12">
        {/* Left - Hero Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:w-1/2 max-w-xl mb-12 lg:mb-0 lg:pr-12"
        >
          <div className="qiko-section-label">QIKO CREATOR</div>
          
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Turn your expertise into a </span>
            <span className="qiko-gradient-text">revenue-generating LLM.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            Create your own AI-powered digital worker that captures your knowledge, 
            speaks in your voice, and works 24/7 to help your clients.
          </p>
          
          <div className="space-y-3 mb-8">
            {[
              "Describe your expertise in plain English",
              "Upload your documents and knowledge",
              "Let Qiko handle the AI infrastructure",
            ].map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex gap-8 text-sm">
            <div>
              <div className="text-2xl font-bold qiko-gradient-text">1 day</div>
              <div className="text-muted-foreground">Time to first model</div>
            </div>
            <div>
              <div className="text-2xl font-bold qiko-gradient-text">Sub-second</div>
              <div className="text-muted-foreground">Response time</div>
            </div>
            <div>
              <div className="text-2xl font-bold qiko-gradient-text">Per agency</div>
              <div className="text-muted-foreground">Revenue model</div>
            </div>
          </div>
        </motion.div>

        {/* Right - Auth Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:w-1/2 max-w-md w-full"
        >
          <div className="qiko-card p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-xl qiko-gradient flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                <Sparkles className="w-8 h-8 text-background" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Start as a Creator
              </h2>
              <p className="text-muted-foreground">
                Sign in to create and manage your digital workers
              </p>
            </div>

            <Button 
              size="lg" 
              className="qiko-btn-primary w-full h-14 text-lg font-medium justify-center"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Continue with Manus
              <ArrowRight className="w-5 h-5" />
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-6">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <span>No credit card required</span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
