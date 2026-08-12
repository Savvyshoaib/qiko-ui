import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

type StartCallButtonProps = {
  onClick: () => void;
};

export default function StartCallButton({ onClick }: StartCallButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="h-9 px-3 rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-100 transition-all gap-2 shadow-sm shadow-cyan-500/10"
      aria-label="Start a voice call"
    >
      <Phone className="w-4 h-4" />
      <span className="hidden sm:inline">Start Call</span>
      <span className="sm:hidden">Call</span>
    </Button>
  );
}
