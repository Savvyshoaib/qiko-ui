import { ReactNode, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wrench,
  Sparkles
} from "lucide-react";
// import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSubscription } from "@/store/slices/authSlice";
import { clearUserContext, fetchUserContext } from "@/store/slices/userContextSlice";
import { getCurrentSubscription, getSubscriptionPlans, createSubscriptionCheckout } from "@/lib/avatarApi";
import { isMockDataEnabled } from "@/data/isMockEnabled";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StripeRedirectLoader from "@/components/StripeRedirectLoader";
import GlobalLayoutLoadingSkeleton from "@/components/GlobalLayoutLoadingSkeleton";
// Custom Qiko auth - no longer using Manus OAuth

interface GlobalLayoutProps {
  children: ReactNode;
  activeSection?: "dashboard" | "workers" | "pricing" | "settings" | "studio";
}

const NAV_ITEMS = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, path: "/app" },
  { id: "workers" as const, label: "Workers", icon: Users, path: "/app/workers" },
  { id: "pricing" as const, label: "Pricing", icon: CreditCard, path: "/app/pricing" },
  { id: "settings" as const, label: "Settings", icon: Settings, path: "/app/settings" },
];

const SIDEBAR_STORAGE_KEY = "qiko-sidebar-expanded";
const APP_MODE_STORAGE_KEY = "qiko-app-mode";
const PENDING_CHECKOUT_PLAN_KEY = "qiko_pending_checkout_plan";

type PendingCheckoutPlan = "gpt_wrapper" | "custom_model" | "premium";

function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }
}

export default function GlobalLayout({ children, activeSection }: GlobalLayoutProps) {
  const dispatch = useAppDispatch();
  const [location, setLocation] = useLocation();
  const [appMode, setAppMode] = useState<"creator" | "studio">(() => {
    const saved = safeGetLocalStorage(APP_MODE_STORAGE_KEY);
    if (saved === "creator" || saved === "studio") return saved;
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/app/studio")) return "studio";
    return "creator";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [checkoutRedirecting, setCheckoutRedirecting] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    // Load saved preference from localStorage
    const saved = safeGetLocalStorage(SIDEBAR_STORAGE_KEY);
    return saved !== null ? saved === "true" : true; // Default to expanded
  });
  const isLoggingOutRef = useRef(false);

  // REST Auth Hook
  const { loading, isAuthenticated, logout } = useAuth({
    redirectOnUnauthenticated: false,
  });
  const canAccessStudioToggle = useAppSelector(
    (state) => Boolean((state.studioUser.data as any)?.data?.studio?.can_access)
  );


  // Fetch subscription + user context when authenticated on /app layout
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(clearUserContext());
      return;
    }
    let cancelled = false;
    getCurrentSubscription()
      .then((sub) => {
        if (!cancelled) dispatch(setSubscription(sub));
      })
      .catch(() => {
        if (cancelled) return;
        // In mock mode never clear an unlocked subscription on a transient parse miss.
        if (isMockDataEnabled()) {
          dispatch(
            setSubscription({
              subscribed: true,
              subscription: {
                plan_name: "Studio Pro",
                status: "active",
                worker_limit: 25,
              },
            } as any)
          );
          return;
        }
        dispatch(setSubscription(null));
      });

    void dispatch(fetchUserContext());

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, dispatch]);

  // After signup from onboarding with a plan selected: redirect to Stripe checkout when landing on app
  useEffect(() => {

    if (!isAuthenticated) return;
    if (isMockDataEnabled()) {
      // Never auto-redirect to Stripe while testing with mock data.
      try {
        sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    let pendingPlan: string | null = null;
    try {
      pendingPlan = sessionStorage.getItem(PENDING_CHECKOUT_PLAN_KEY);
    } catch {
      return;
    }
    if (!pendingPlan) return;
    setCheckoutRedirecting(true);
    const plan = pendingPlan as PendingCheckoutPlan;
    const planIndex = plan === "gpt_wrapper" ? 0 : plan === "custom_model" ? 0 : plan === "premium" ? 2 : -1;
    
    // console.log(planIndex);

    // return 
    if (planIndex < 0) {
      try {
        sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
      } catch {
        /* ignore */
      }
      setCheckoutRedirecting(false);
      return;
    }
    let cancelled = false;
    try {
      sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
    } catch {
      /* ignore */
    }
    getSubscriptionPlans()
      .then((plans) => {
        if (cancelled) return;
        const list = Array.isArray(plans) ? plans : [];
        const selected = list[planIndex];

        // console.log(selected, list[planIndex]);
        // return 
        
        if (!selected?.price_id) {
          setCheckoutRedirecting(false);
          toast.error("Could not start checkout. Please choose a plan from Pricing.");
          return;
        }
        return createSubscriptionCheckout(selected.price_id);
      })
      .then((checkoutUrl) => {
        if (cancelled || !checkoutUrl) {
          if (!cancelled) setCheckoutRedirecting(false);
          return;
        }
        window.location.href = checkoutUrl;
      })
      .catch((err) => {
        if (!cancelled) {
          setCheckoutRedirecting(false);
          toast.error(err instanceof Error ? err.message : "Checkout failed. You can try from Pricing.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const logoutMutation = async () => {
    await logout();
  };

  // Redirect to login if not authenticated (skip when logging out - we go to landing instead)
  useEffect(() => {
    if (isLoggingOutRef.current || loading || isAuthenticated) return;
    setLocation("/login");
  }, [loading, isAuthenticated, setLocation]);


  // Save sidebar state to localStorage
  useEffect(() => {
    safeSetLocalStorage(SIDEBAR_STORAGE_KEY, String(sidebarExpanded));
  }, [sidebarExpanded]);

  // Keep mode in sync with route + persist user preference.
  useEffect(() => {
    const nextMode = location.startsWith("/app/studio") ? "studio" : "creator";
    setAppMode(nextMode);
    safeSetLocalStorage(APP_MODE_STORAGE_KEY, nextMode);
  }, [location]);

  const getNextModePath = () => (appMode === "creator" ? "/app/studio" : "/app/workers");

  const handleModeToggle = () => {
    const newMode = appMode === "creator" ? "studio" : "creator";
    setAppMode(newMode);
    safeSetLocalStorage(APP_MODE_STORAGE_KEY, newMode);
    setLocation(getNextModePath());
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    isLoggingOutRef.current = true;
    await logoutMutation();
    setShowLogoutConfirm(false);
    window.location.href = "/";
  };

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const openNavPath = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  const openNavPathInNewTab = (path: string) => {
    window.open(path, "_blank", "noopener,noreferrer");
  };

  // Show loading state while checking authentication
  if (loading) {
    return <GlobalLayoutLoadingSkeleton />;
  }

  // Don't render if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (checkoutRedirecting) {
  // if (true) {
      return <StripeRedirectLoader />;
  }

  return (
    <div className="min-h-screen bg-[#050810] flex">
      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="bg-[#0a0f1a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You will need to sign in again to access your dashboard and AI workers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogoutConfirm}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border border-red-500/30"
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Global Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarExpanded ? 200 : 72,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`
          fixed inset-y-0 left-0 z-50
          bg-[#040b1c] border-r border-white/10 flex flex-col shadow-[0_0_40px_rgba(3,8,20,0.8)]
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo & Toggle */}
        <div className="relative h-16 flex items-center justify-center px-4 border-b border-white/5">
          <div 
            className="flex items-center justify-center cursor-pointer overflow-hidden"
            onClick={() => setLocation("/")}
          >
            {sidebarExpanded ? (
              <img
              src="/qiko-logo.png"
              alt="Qiko"
              className="h-8 w-auto"
              style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' }}
            />
            ): <img
            src="/qiko-icon.png"
            alt="Qiko"
            className="h-5 w-auto"
            style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' }}
          /> }
          </div>
          
          {/* Toggle button - desktop only, sits outside border line */}
          <button
            onClick={toggleSidebar}
            className={`hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 items-center justify-center w-7 h-7 rounded-full border border-white/10 bg-[#111827] hover:bg-[#1f2937] text-slate-300 hover:text-white transition-all shadow-md ${sidebarExpanded ? 'mr-5' : ''}`}
          >
            {sidebarExpanded ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Mode Toggle */}
        {canAccessStudioToggle && (
          <div className="px-3 py-3 border-b border-white/10">
            <button
              onClick={(event) => {
                if (event.ctrlKey || event.metaKey) {
                  window.open(getNextModePath(), "_blank", "noopener,noreferrer");
                  return;
                }
                handleModeToggle();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  window.open(getNextModePath(), "_blank", "noopener,noreferrer");
                }
              }}
              className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all bg-white/[0.02] hover:bg-white/[0.05] ${!sidebarExpanded ? 'justify-center' : ''}`}
              title={!sidebarExpanded ? (appMode === 'creator' ? 'Switch to Studio' : 'Switch to Creator') : undefined}
            >
              {appMode === 'creator' ? (
                <>
                  <Wrench className="w-4 h-4 text-[#22D3EE] flex-shrink-0" />
                  {sidebarExpanded && (
                    <span className="text-slate-300">Creator <span className="text-slate-500">- Studio</span></span>
                  )}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#22D3EE] flex-shrink-0" />
                  {sidebarExpanded && (
                    <span className="text-slate-300">Studio <span className="text-slate-500">- Creator</span></span>
                  )}
                </>
              )}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 min-h-0 py-4">
          <ul className="space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={(event) => {
                      if (event.ctrlKey || event.metaKey) {
                        openNavPathInNewTab(item.path);
                        return;
                      }
                      openNavPath(item.path);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        openNavPathInNewTab(item.path);
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 py-3 px-3 rounded-xl
                      transition-all duration-200 group relative
                      ${isActive 
                        ? 'bg-gradient-to-br from-[#6366F1]/20 to-[#22D3EE]/20 text-white border border-white/10' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }
                      ${!sidebarExpanded ? 'justify-center' : ''}
                    `}
                    title={!sidebarExpanded ? item.label : undefined}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                        style={{ background: 'linear-gradient(180deg, #6366F1, #22D3EE)' }}
                      />
                    )}
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#22D3EE]' : ''}`} />
                    <AnimatePresence>
                      {sidebarExpanded && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm font-medium whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    
                    {/* Tooltip for collapsed state */}
                    {!sidebarExpanded && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1f2e] rounded-md text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg border border-white/10">
                        {item.label}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User/Logout */}
        <div className="sticky bottom-0 p-3 border-t border-white/10 bg-[#040b1c]">
          <button
            onClick={handleLogoutClick}
            className={`
              w-full flex items-center gap-3 py-3 px-3 rounded-xl 
              text-slate-400 hover:text-white hover:bg-white/5 transition-all group relative
              ${!sidebarExpanded ? 'justify-center' : ''}
            `}
            title={!sidebarExpanded ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
            
            {/* Tooltip for collapsed state */}
            {!sidebarExpanded && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1f2e] rounded-md text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg border border-white/10">
                Logout
              </div>
            )}
          </button>
        </div>

        {/* Mobile close button */}
        <button 
          className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-white"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </motion.aside>

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col min-h-screen transition-[margin-left] duration-300 ease-in-out ${
          sidebarExpanded ? "lg:ml-[200px]" : "lg:ml-[72px]"
        }`}
      >
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#050810]/95 backdrop-blur border-b border-white/5">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span
              className="text-lg font-bold text-white"
              style={{ fontFamily: 'Satoshi, sans-serif' }}
            >
              Qiko
            </span>
            <div className="w-9" />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
            top: '-10%',
            left: '30%',
            filter: 'blur(100px)',
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)',
            bottom: '10%',
            right: '10%',
            filter: 'blur(100px)',
          }}
        />
      </div>
    </div>
  );
}
