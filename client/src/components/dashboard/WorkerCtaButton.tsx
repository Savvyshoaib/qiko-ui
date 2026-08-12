import { Crown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type WorkerCtaButtonProps = {
  workersCount: number;
  subscribed: boolean;
  onCreate: () => void;
  onUpgrade: () => void;
  workerLimit?: number;
  size?: "default" | "sm" | "lg";
  createButtonClassName: string;
  upgradeButtonClassName?: string;
  createIconClassName?: string;
  upgradeIconClassName?: string;
};

export default function WorkerCtaButton({
  workersCount,
  subscribed,
  onCreate,
  onUpgrade,
  workerLimit = 3,
  size = "default",
  createButtonClassName,
  upgradeButtonClassName = "bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl shadow-lg shadow-amber-500/30",
  createIconClassName,
  upgradeIconClassName = "mr-2 h-4 w-4",
}: WorkerCtaButtonProps) {
  const hasReachedWorkerLimit = () => {
    if (!subscribed) return true;
    if (workersCount >= workerLimit) return "CONTACT";
    return false;
  };

  const limitState = hasReachedWorkerLimit();

  if (limitState) {
    return (
      <Button onClick={onUpgrade} size={size} className={upgradeButtonClassName}>
        <Crown className={upgradeIconClassName} />
        {limitState === "CONTACT" ? "Upgrade Now" : "Upgrade Now"}
      </Button>
    );
  }

  return (
    <Button onClick={onCreate} size={size} className={createButtonClassName}>
      <Plus className={createIconClassName ?? `mr-2 ${size === "lg" ? "h-5 w-5" : "h-4 w-4"}`} />
      Create Worker
    </Button>
  );
}
