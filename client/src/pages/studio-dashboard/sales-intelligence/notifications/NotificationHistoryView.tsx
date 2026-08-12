import { useMemo, useState } from "react";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { SalesIntelEmptyState } from "../SalesIntelEmptyState";
import {
  SALES_INTEL_INFO_STRIP,
  SALES_INTEL_PANEL_SOFT,
  SALES_INTEL_SECTION_TITLE,
} from "../salesIntelUi";
import { NotificationItem, notificationTypeMeta } from "./NotificationItem";
import { useCaseIdForNotificationType } from "./notificationNavigation";
import { useSalesIntelNotifications } from "./NotificationProvider";
import type { NotificationFilter, SalesNotification } from "./types";

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];

export function NotificationHistoryView({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate?: (useCaseId: string, notification: SalesNotification) => void;
}) {
  const { notifications, unreadCount, markRead, markAllRead } = useSalesIntelNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const entries = useMemo(() => {
    if (filter === "unread") return notifications.filter((item) => !item.read);
    if (filter === "read") return notifications.filter((item) => item.read);
    return notifications;
  }, [filter, notifications]);

  const handleSelect = (notification: SalesNotification) => {
    markRead(notification.id);
    const useCaseId = useCaseIdForNotificationType(notification.type);
    onNavigate?.(useCaseId, notification);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 transition-colors hover:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to workspace
      </button>

      <div className={SALES_INTEL_INFO_STRIP}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3 sm:gap-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
              <Bell className="size-4 text-indigo-300" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                className="text-[13px] font-semibold tracking-tight text-white sm:text-sm"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Notification history
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                Full audit of Sales Intelligence alerts — reviews, Salesforce sync, scans, and
                deadlines. Preview data only.
              </p>
            </div>
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-white/15 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:bg-white/[0.04]"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter notifications">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/30"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">
          Showing {entries.length} · {unreadCount} unread
        </p>
      </div>

      {entries.length === 0 ? (
        <SalesIntelEmptyState
          icon={Bell}
          title={filter === "all" ? "No notifications" : `No ${filter} notifications`}
          description={
            filter === "all"
              ? "When opportunities need review or sync events occur, they will appear here."
              : "Try another filter to see more of your notification history."
          }
        />
      ) : (
        <>
          <div className={`overflow-hidden md:hidden ${SALES_INTEL_PANEL_SOFT}`}>
            <ul className="divide-y divide-white/[0.04]">
              {entries.map((notification, index) => (
                <li key={notification.id || `notification-mobile-${index}`}>
                  <NotificationItem
                    notification={notification}
                    onSelect={handleSelect}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className={`hidden overflow-x-auto md:block ${SALES_INTEL_PANEL_SOFT}`}>
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Notification
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    When
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((notification, index) => {
                  const meta = notificationTypeMeta(notification.type);
                  const Icon = meta.icon;
                  return (
                    <tr
                      key={notification.id || `notification-row-${index}`}
                      className={`cursor-pointer border-b border-white/[0.03] hover:bg-white/[0.02] ${
                        notification.read ? "" : "bg-white/[0.02]"
                      }`}
                      onClick={() => handleSelect(notification)}
                    >
                      <td className="px-4 py-3">
                        {notification.read ? (
                          <span className="text-[11px] text-slate-500">Read</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-300">
                            <span className="size-1.5 rounded-full bg-indigo-400" />
                            Unread
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ${meta.tone}`}
                        >
                          <Icon className="size-3" strokeWidth={1.75} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <p
                          className={`text-[12px] font-medium ${
                            notification.read ? "text-slate-300" : "text-white"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                          {notification.body}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-500">
                        {new Date(notification.createdAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className={`${SALES_INTEL_SECTION_TITLE} px-0.5`}>Newest first · mock inbox</p>
        </>
      )}
    </div>
  );
}
