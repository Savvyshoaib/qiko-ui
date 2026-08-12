import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, MessageSquare, Globe, Shield, Clock, LogIn } from "lucide-react";
// Custom Qiko auth - no longer using Manus OAuth
import { useAuth } from "@/_core/hooks/useAuth";

// Typing animation examples
const typingExamples = [
  "I am a golf travel specialist...",
  "I am a real estate advisor...",
  "I am a financial consultant...",
  "I am a fitness coach...",
  "I am a legal expert...",
  "I am a marketing strategist...",
];

// Testimonials data
const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Golf Travel Specialist",
    location: "Dubai",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    rating: 5,
    quote: "I trained my AI on 15 years of golf course knowledge. Now it handles 80% of client inquiries while I focus on VIP bookings.",
  },
  {
    name: "James Chen",
    role: "Real Estate Advisor",
    location: "Singapore",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    rating: 5,
    quote: "My AI knows every property in my portfolio. Clients get instant, accurate answers 24/7. It's like having a clone of myself.",
  },
  {
    name: "Emma Rodriguez",
    role: "Financial Consultant",
    location: "London",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    rating: 5,
    quote: "The custom model doesn't hallucinate. It only knows what I've taught it. That's critical for financial advice.",
  },
];

// Use cases
const useCases = [
  {
    icon: MessageSquare,
    title: "Answer Questions",
    description: "Handle client inquiries automatically, even the tricky ones",
    color: "#6366F1",
  },
  {
    icon: Globe,
    title: "Never Miss a Lead",
    description: "Respond to prospects at 3am without lifting a finger",
    color: "#22D3EE",
  },
  {
    icon: Shield,
    title: "Sound Like You",
    description: "Your tone, your expertise, your way of explaining things",
    color: "#A855F7",
  },
  {
    icon: Clock,
    title: "Save Hours Daily",
    description: "Stop repeating yourself—let AI handle the routine stuff",
    color: "#EC4899",
  },
];

// Custom hook for typing animation
function useTypingAnimation(texts: string[], typingSpeed = 80, deletingSpeed = 40, pauseDuration = 2000) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[currentIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, currentIndex, isDeleting, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return displayText;
}

export default function Landing() {
  const [, navigate] = useLocation();
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  
  const animatedPlaceholder = useTypingAnimation(typingExamples);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/app");
    } else {
      navigate("/onboarding");
    }
  };

  const handleSignIn = () => {
    navigate("/login");
  };

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !loading) {
      // User is logged in, they can still view landing but buttons will go to app
    }
  }, [isAuthenticated, loading]);

  return (
    <div className="min-h-screen bg-[#050810] text-white overflow-x-hidden relative">
      {/* Animated gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Large floating orbs with neon glow */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
            top: '-10%',
            left: '20%',
            filter: 'blur(80px)',
            animation: 'float1 12s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)',
            top: '30%',
            right: '10%',
            filter: 'blur(80px)',
            animation: 'float2 10s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #A855F7 0%, transparent 70%)',
            bottom: '10%',
            left: '30%',
            filter: 'blur(80px)',
            animation: 'float3 14s ease-in-out infinite',
          }}
        />
        {/* Grid overlay for depth */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050810]/60 backdrop-blur-xl border-b border-white/5">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <img
              src="/qiko-logo.png"
              alt="Qiko"
              className="h-8 w-auto"
              style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' }}
            />
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                onClick={() => navigate("/app")}
                className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white font-medium px-5 py-2 rounded-full shadow-lg shadow-[#6366F1]/25 transition-all hover:shadow-[#6366F1]/40"
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={handleSignIn}
                  className="text-slate-300 hover:text-white hover:bg-white/10 font-medium px-4 py-2 rounded-full transition-all"
                >
                  Sign in
                </Button>
                <Button
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white font-medium px-5 py-2 rounded-full shadow-lg shadow-[#6366F1]/25 transition-all hover:shadow-[#6366F1]/40"
                >
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="container relative z-10 max-w-4xl mx-auto text-center">
          {/* Glowing badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/30 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse shadow-lg shadow-[#22D3EE]/50" />
            <span className="text-sm text-[#22D3EE] font-medium">Now in Beta • Join 500+ creators</span>
          </div>

          <h1 
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            style={{ 
              fontFamily: 'Satoshi, sans-serif',
              background: 'linear-gradient(135deg, #ffffff 0%, #6366F1 50%, #22D3EE 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 80px rgba(99, 102, 241, 0.5)',
            }}
          >
            Build Your AI Expert
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Train a custom AI on your expertise. Answer clients <span className="text-[#22D3EE]">24/7</span> with your knowledge, your tone, your way.
          </p>

          {/* Input card with neon border */}
          <div 
            className="relative max-w-xl mx-auto mb-8 group"
          >
            {/* Animated border glow */}
            <div 
              className="absolute -inset-[1px] rounded-2xl opacity-75 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #22D3EE, #A855F7, #6366F1)',
                backgroundSize: '300% 300%',
                animation: 'gradient-shift 4s ease infinite',
              }}
            />
            <div className="relative bg-[#0a0f1a] rounded-2xl p-6">
              <div className="relative mb-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="w-full bg-transparent text-white text-lg outline-none"
                  placeholder=""
                />
                {!inputValue && !isFocused && (
                  <div className="absolute top-0 left-0 pointer-events-none text-lg text-slate-400">
                    {animatedPlaceholder}
                    <span className="inline-block w-0.5 h-5 bg-[#6366F1] ml-0.5 animate-pulse shadow-lg shadow-[#6366F1]/50" />
                  </div>
                )}
                {!inputValue && isFocused && (
                  <div className="absolute top-0 left-0 pointer-events-none text-lg text-slate-500">
                    Type your profession...
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button className="p-2 rounded-full bg-white/5 hover:bg-[#6366F1]/20 transition-colors border border-white/10 hover:border-[#6366F1]/50">
                    <span className="text-slate-400">+</span>
                  </button>
                </div>
                <Button
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-[#6366F1] to-[#22D3EE] text-white font-semibold px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg shadow-[#6366F1]/30 hover:shadow-[#6366F1]/50"
                >
                  Start Building
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* <p className="text-sm text-slate-500">
            No credit card required to start • <span className="text-[#22D3EE]">Free trial available</span>
          </p> */}
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="py-16 px-4 relative z-10">
        <div className="container max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="group relative bg-[#0a0f1a]/80 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-transparent transition-all cursor-pointer overflow-hidden"
              >
                {/* Hover glow effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `radial-gradient(circle at center, ${useCase.color}15 0%, transparent 70%)`,
                  }}
                />
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 relative"
                  style={{
                    background: `${useCase.color}20`,
                    boxShadow: `0 0 20px ${useCase.color}30`,
                  }}
                >
                  <useCase.icon className="w-5 h-5" style={{ color: useCase.color }} />
                </div>
                <h3 className="font-semibold text-white mb-1 relative">{useCase.title}</h3>
                <p className="text-sm text-slate-400 relative">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* <section className="py-16 px-4 relative z-10">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#6366F1] text-sm font-semibold tracking-widest uppercase mb-4 block">Testimonials</span>
            <h2 
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            >
              People Are Already Building
            </h2>
            <p className="text-slate-400 text-lg">
              Join experts who've turned their knowledge into AI
            </p>
          </div>

          <div className="space-y-4">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="group relative bg-gradient-to-r from-[#0a0f1a] to-[#0a0f1a]/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-[#6366F1]/30 transition-all flex flex-col md:flex-row gap-6 items-start overflow-hidden"
              >
                
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, transparent 50%)',
                  }}
                />
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-24 h-32 md:w-32 md:h-40 object-cover rounded-xl flex-shrink-0 relative"
                  style={{
                    boxShadow: '0 0 30px rgba(99, 102, 241, 0.2)',
                  }}
                />
                <div className="flex-1 relative">
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star 
                        key={i} 
                        className="w-5 h-5 fill-[#FBBF24] text-[#FBBF24]"
                        style={{ filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))' }}
                      />
                    ))}
                  </div>
                  <p className="text-lg md:text-xl text-white mb-4 leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-slate-400 text-sm">
                      {testimonial.role} | <span className="text-[#22D3EE]">{testimonial.location}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}


      {!isAuthenticated && (
        <section className="py-24 px-4 relative z-10">
          <div className="container max-w-2xl mx-auto text-center">
            {/* Glow behind CTA */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full opacity-30 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            <h2 
              className="text-3xl md:text-5xl font-bold mb-6 relative"
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            >
              Ready to Build Your <span className="text-[#22D3EE]">AI Expert</span>?
            </h2>
            <p className="text-slate-400 mb-8 text-lg relative">
              Start with GPT-5 or train your own custom model. You decide.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="relative bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#22D3EE] text-white font-semibold px-10 py-6 rounded-full text-lg shadow-2xl shadow-[#6366F1]/40 hover:shadow-[#6366F1]/60"
              style={{
                backgroundSize: '200% 200%',
                animation: 'gradient-shift 3s ease infinite',
              }}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            {/* <p className="text-slate-500 text-sm mt-8 relative">
              Privacy Policy · Terms · Restore
            </p> */}
          </div>
        </section>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 20px) scale(1.1); }
          66% { transform: translate(30px, -40px) scale(0.9); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, -30px) scale(1.05); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
