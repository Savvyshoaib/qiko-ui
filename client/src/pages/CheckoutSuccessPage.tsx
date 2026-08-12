"use client";

import { useLocation } from "wouter";
import GlobalLayout from "@/components/GlobalLayout";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowRight, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";

export default function CheckoutSuccessPage() {
  const [, setLocation] = useLocation();

  return (
    <GlobalLayout activeSection="pricing">
      <div className="min-h-full flex items-center justify-center p-6 lg:p-8 overflow-y-auto">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f172a]/95 to-[#0f172a]/80 p-8 lg:p-10 text-center shadow-xl shadow-emerald-500/5">
            {/* Decorative glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-emerald-500/20 blur-2xl" />

            <motion.div
              className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            >
              <Check className="h-10 w-10 text-white stroke-[2.5]" />
            </motion.div>

            <motion.div
              className="relative flex items-center justify-center gap-1.5 text-emerald-400/90 mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Payment successful</span>
            </motion.div>

            <motion.h1
              className="relative text-2xl lg:text-3xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontFamily: "Satoshi, sans-serif",
                background: "linear-gradient(135deg, #ffffff 0%, #6ee7b7 50%, #22d3ee 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Thank you for subscribing
            </motion.h1>

            <motion.p
              className="relative text-slate-400 text-sm lg:text-base max-w-sm mx-auto mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Your subscription is now active. You have full access to your plan features.
            </motion.p>

            <motion.div
              className="relative flex flex-col sm:flex-row gap-3 justify-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25"
                onClick={() => setLocation("/app")}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5"
                onClick={() => setLocation("/app/pricing")}
              >
                View plan
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </GlobalLayout>
  );
}
