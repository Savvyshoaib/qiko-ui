import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageCopyButtonProps {
  isCopied: boolean;
  onCopy: () => void;
  className?: string;
}

export default function MessageCopyButton({
  isCopied,
  onCopy,
  className,
}: MessageCopyButtonProps) {
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label="Copy message"
      className={cn(
        "absolute -top-2 right-0 p-1 rounded-md bg-background/80 border border-border text-muted-foreground opacity-20 transition-opacity hover:text-foreground hover:opacity-100",
        className
      )}
    >
      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
