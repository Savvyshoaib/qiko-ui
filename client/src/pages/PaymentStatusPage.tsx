"use client";

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, LogIn, XCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/_core/hooks/useAuth";

/** Public payment result page (no login required). */
export default function PaymentStatusPage() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const isSuccess = location === "/payment/success";
  const selectedPlan = localStorage.getItem("selectedPlan")
    ? `${localStorage.getItem("selectedPlan")} plan`
    : "";

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          className="relative w-full max-w-md"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f172a]/95 to-[#0f172a]/80 p-8 lg:p-10 text-center shadow-xl shadow-emerald-500/5">
            <motion.div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            >
              <Check className="h-10 w-10 text-white stroke-[2.5]" />
            </motion.div>

            <div className="flex items-center justify-center gap-1.5 text-emerald-400/90 mb-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Payment successful</span>
            </div>

            <h1
              className="text-2xl lg:text-3xl font-bold text-white mb-2"
              style={{
                fontFamily: "Satoshi, sans-serif",
                background: "linear-gradient(135deg, #ffffff 0%, #6ee7b7 50%, #22d3ee 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Thank you for your payment
            </h1>

            <p className="text-slate-400 text-sm lg:text-base max-w-sm mx-auto mb-8">
              {selectedPlan
                ? `Your ${selectedPlan} is confirmed. Sign in to access your workspace.`
                : "Your payment was received. Sign in to continue."}
            </p>

            <div className="flex flex-col gap-3">
              {isAuthenticated ? (
                <Button
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                  onClick={() => setLocation("/app")}
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
                    onClick={() => setLocation("/login")}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign in
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/5"
                    onClick={() => setLocation("/signup")}
                  >
                    Create an account
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-6">
      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f172a]/95 to-[#0f172a]/80 p-8 lg:p-10 text-center shadow-xl shadow-rose-500/5">
          <motion.div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-600 shadow-lg shadow-rose-500/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          >
            <XCircle className="h-10 w-10 text-white stroke-[2.5]" />
          </motion.div>

          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Payment not completed</h1>
          <p className="text-slate-400 text-sm lg:text-base max-w-sm mx-auto mb-8">
            Your payment was canceled or did not go through. You can try again after signing in.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              className="bg-gradient-to-r from-rose-500 to-amber-600 text-white"
              onClick={() => setLocation(isAuthenticated ? "/app/pricing" : "/login")}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {isAuthenticated ? "Try again" : "Sign in to retry"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
