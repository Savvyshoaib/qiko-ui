import { useEffect, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import { useCaseIdForNotificationType } from "./notificationNavigation";
import { useSalesIntelNotifications } from "./NotificationProvider";
import type { SalesNotification } from "./types";

const RECENT_LIMIT = 8;
const PUSH_BANNER_DISMISS_KEY = "idg-sales-push-banner-dismissed";

export function NotificationPanel({
  onViewAll,
  onClose,
  onNavigate,
}: {
  onViewAll: () => void;
  onClose: () => void;
  onNavigate?: (useCaseId: string, notification: SalesNotification) => void;
}) {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    pushPermission,
    pushEnabled,
    enablePush,
  } = useSalesIntelNotifications();
  const [pushBannerDismissed, setPushBannerDismissed] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    setPushBannerDismissed(sessionStorage.getItem(PUSH_BANNER_DISMISS_KEY) === "1");
  }, []);

  const recent = notifications.slice(0, RECENT_LIMIT);
  // Auto browser prompt runs on login; banner is only a fallback if still not enabled.
  const showEnablePush =
    !pushEnabled && pushPermission !== "unsupported" && !pushBannerDismissed;
  const headerSubtitle =
    unreadCount > 0
      ? `${unreadCount} unread`
      : recent.length > 0
        ? `${recent.length} recent`
        : "No alerts yet";

  const dismissPushBanner = () => {
    setPushBannerDismissed(true);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(PUSH_BANNER_DISMISS_KEY, "1");
    }
  };

  const handleSelect = (notification: SalesNotification) => {
    markRead(notification.id);
    const useCaseId = useCaseIdForNotificationType(notification.type);
    onNavigate?.(useCaseId, notification);
    onClose();
  };

  return (
    <div className="flex max-h-[min(28rem,70vh)] w-[min(22.5rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#121421] text-slate-200 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight text-white">Notifications</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{headerSubtitle}</p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => markAllRead()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-semibold text-indigo-200 hover:border-indigo-500/30 hover:bg-indigo-500/10"
          >
            <CheckCheck className="size-3" />
            Mark all read
          </button>
        ) : null}
      </div>

      {showEnablePush ? (
        <div className="border-b border-white/[0.08] bg-indigo-500/[0.06] px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-[10px] leading-snug text-slate-400">
              {pushPermission === "denied"
                ? "Push blocked in browser settings."
                : "Turn on live browser alerts."}
            </p>
            <button
              type="button"
              onClick={dismissPushBanner}
              aria-label="Dismiss push prompt"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              void enablePush();
            }}
            className="mt-2 w-full rounded-md border border-indigo-500/35 bg-indigo-500/15 px-3 py-2 text-[11px] font-semibold text-indigo-100 hover:bg-indigo-500/25"
          >
            Enable
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <Bell className="size-4 text-slate-500" />
            </div>
            <p className="text-[12px] font-semibold text-slate-300">No notifications yet</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Review, sync, and deadline alerts will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {recent.map((notification, index) => (
              <li key={notification.id || `notification-${index}`}>
                <NotificationItem
                  notification={notification}
                  compact
                  onSelect={handleSelect}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-white/[0.08] p-2.5">
        <button
          type="button"
          onClick={() => {
            onViewAll();
            onClose();
          }}
          className="w-full rounded-lg px-3 py-2 text-center text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/10"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
