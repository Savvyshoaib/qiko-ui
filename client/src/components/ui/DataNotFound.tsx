import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataNotFoundProps {
  message: ReactNode;
  className?: string;
}

export default function DataNotFound({ message, className }: DataNotFoundProps) {
  return (
    <div
      className={cn(
        "text-center py-16 px-4 rounded-2xl border border-dashed border-white/10 w-full h-full flex flex-col items-center justify-center gap-3",
        className
      )}
      style={{ background: "rgba(99, 102, 241, 0.05)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(34, 211, 238, 0.2))",
          boxShadow: "0 0 40px rgba(99, 102, 241, 0.25)",
        }}
      >
        <AlertCircle className="h-8 w-8 text-[#22D3EE]" />
      </div>
      <div className="text-base font-semibold text-white">{message}</div>
    </div>
  );
}

