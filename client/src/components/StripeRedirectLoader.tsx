import { Loader2, Lock } from "lucide-react";

export default function StripeRedirectLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050810] via-[#0b1220] to-[#050810] flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 blur-2xl opacity-30 bg-cyan-500 rounded-3xl" />

        <div className="relative bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 animate-ping bg-cyan-500 opacity-20 rounded-full" />
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>

          <h2 className="text-xl font-semibold text-white">
            Redirecting to Secure Checkout
          </h2>

          <p className="text-slate-400 text-sm leading-relaxed">
            Please wait while we prepare your secure payment session with Stripe.
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-4 h-4 text-green-400" />
            <span>SSL Secure Connection</span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-cyan-400 animate-[loading_1.2s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
}

