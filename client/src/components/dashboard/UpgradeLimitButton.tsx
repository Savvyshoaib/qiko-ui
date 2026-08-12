import { Crown } from "lucide-react";

type UpgradeLimitButtonProps = {
  onClick: () => void;
  mounted?: boolean;
};

export default function UpgradeLimitButton({
  onClick,
  mounted = true,
}: UpgradeLimitButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:border-amber-400/60 hover:bg-amber-500/10 transition-all group"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1.2s",
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center transition-colors">
          <Crown className="w-4 h-4 text-amber-400" />
        </div>
        <span className="text-sm text-amber-300 group-hover:text-amber-200 transition-colors">
          Upgrade Now
        </span>
      </div>
    </button>
  );
}
