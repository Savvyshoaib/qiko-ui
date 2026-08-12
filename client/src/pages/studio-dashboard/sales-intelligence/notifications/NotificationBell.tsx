import { useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationPanel } from "./NotificationPanel";
import { useSalesIntelNotifications } from "./NotificationProvider";
import type { SalesNotification } from "./types";

export function NotificationBell({
  onViewAll,
  onNavigate,
}: {
  onViewAll: () => void;
  onNavigate?: (useCaseId: string, notification: SalesNotification) => void;
}) {
  const { unreadCount } = useSalesIntelNotifications();
  const [open, setOpen] = useState(false);
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Notifications"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
          }
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#080c14]">
              {badgeLabel}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <NotificationPanel
          onViewAll={onViewAll}
          onClose={() => setOpen(false)}
          onNavigate={onNavigate}
        />
      </PopoverContent>
    </Popover>
  );
}
