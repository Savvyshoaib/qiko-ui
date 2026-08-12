import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CloudUpload,
  Radar,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesNotification, SalesNotificationType } from "./types";

const TYPE_META: Record<
  SalesNotificationType,
  { icon: LucideIcon; tone: string; label: string }
> = {
  review_required: {
    icon: ClipboardCheck,
    tone: "border-indigo-500/25 bg-indigo-500/10 text-indigo-300",
    label: "Review required",
  },
  sf_sync_success: {
    icon: CheckCircle2,
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    label: "Salesforce Sync Successful",
  },
  sf_sync_failed: {
    icon: XCircle,
    tone: "border-red-500/25 bg-red-500/10 text-red-300",
    label: "Salesforce Sync Failed",
  },
  scan_success: {
    icon: CheckCircle2,
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    label: "Scan success",
  },
  scan_failed: {
    icon: Radar,
    tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    label: "Scan Failed",
  },
  deadline_reminder: {
    icon: Clock,
    tone: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    label: "Deadline reminder",
  },
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function notificationTypeMeta(type: SalesNotificationType) {
  return TYPE_META[type];
}

export function NotificationItem({
  notification,
  compact = false,
  onSelect,
}: {
  notification: SalesNotification;
  compact?: boolean;
  onSelect?: (notification: SalesNotification) => void;
}) {
  const meta = TYPE_META[notification.type];
  const Icon = meta.icon;
  const StatusIcon =
    notification.type === "sf_sync_failed" || notification.type === "scan_failed"
      ? AlertTriangle
      : notification.type === "sf_sync_success" || notification.type === "scan_success"
        ? CloudUpload
        : null;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(notification)}
      className={cn(
        "flex w-full gap-3 text-left transition-colors",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
        notification.read
          ? "hover:bg-white/[0.02]"
          : "bg-white/[0.03] hover:bg-white/[0.05]"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border",
          meta.tone
        )}
      >
        <Icon className="size-3.5" strokeWidth={1.75} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p
                className={cn(
                  "text-[12px] font-semibold leading-snug",
                  notification.read ? "text-slate-300" : "text-white"
                )}
              >
                {notification.title}
              </p>
              {!notification.read ? (
                <span
                  className="mt-0.5 size-1.5 shrink-0 rounded-full bg-indigo-400"
                  aria-label="Unread"
                />
              ) : null}
            </div>
            <p
              className={cn(
                "mt-0.5 text-[11px] leading-relaxed",
                compact ? "line-clamp-2" : "line-clamp-3",
                notification.read ? "text-slate-500" : "text-slate-400"
              )}
            >
              {notification.body}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <time
                className="text-[10px] text-slate-600"
                dateTime={notification.createdAt}
              >
                {relativeTime(notification.createdAt)}
              </time>
              <span className="text-[10px] text-slate-600">·</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                {StatusIcon ? <StatusIcon className="size-3 opacity-70" /> : null}
                {meta.label}
                {notification.meta?.dueInDays != null
                  ? ` · ${notification.meta.dueInDays}d`
                  : null}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
