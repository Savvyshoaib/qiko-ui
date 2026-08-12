import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  getIdgSalesNotifications,
  markAllIdgSalesNotificationsRead,
  markIdgSalesNotificationRead,
  registerFcmToken,
  type IdgSalesNotification,
} from "@/lib/idgSalesApi";
import {
  getNotificationPermission,
  requestFcmToken,
  subscribeForegroundMessages,
  type NotificationPermissionState,
} from "@/lib/firebase";
import type { SalesNotification, SalesNotificationType } from "./types";
import {
  IDG_SALES_INBOX_PUSH_EVENT,
  type IdgSalesInboxPushItem,
} from "./inboxPush";

type SalesIntelNotificationContextValue = {
  notifications: SalesNotification[];
  unreadCount: number;
  loading: boolean;
  pushPermission: NotificationPermissionState;
  pushEnabled: boolean;
  enablePush: () => Promise<boolean>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => Promise<void>;
};

const SalesIntelNotificationContext = createContext<SalesIntelNotificationContextValue | null>(
  null
);

const KNOWN_TYPES = new Set<SalesNotificationType>([
  "review_required",
  "sf_sync_success",
  "sf_sync_failed",
  "scan_success",
  "scan_failed",
  "deadline_reminder",
]);

const STORAGE_PREFIX = "idg-sales-user-notifications:";
const MAX_STORED = 100;
const FCM_BROADCAST_CHANNEL = "idg-sales-fcm";
/** Min gap between soft inbox pulls (visibility / manual refresh). FCM covers live updates. */
const INBOX_POLL_MS = 30_000;

type FcmPushPayload = {
  title?: string;
  body?: string;
  data?: Record<string, string>;
};

function storageKey(agentId: string, userId: string): string {
  return `${STORAGE_PREFIX}${agentId}:${userId || "anon"}`;
}

function loadStored(agentId: string, userId: string): SalesNotification[] {
  if (typeof window === "undefined" || !agentId) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(agentId, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as SalesNotification[])
      .map((item, index) => {
        const id =
          item?.id != null && String(item.id).trim() !== "" && String(item.id) !== "null"
            ? String(item.id)
            : `local-${index}-${Date.now()}`;
        return { ...item, id };
      })
      .filter((item) => item && typeof item.title === "string");
  } catch {
    return [];
  }
}

function saveStored(agentId: string, userId: string, items: SalesNotification[]): void {
  if (typeof window === "undefined" || !agentId) return;
  try {
    window.localStorage.setItem(
      storageKey(agentId, userId),
      JSON.stringify(items.slice(0, MAX_STORED))
    );
  } catch {
    // Ignore quota / private mode failures.
  }
}

function mapServerNotification(item: IdgSalesNotification): SalesNotification | null {
  const typeRaw = (item.type ?? "").trim();
  const type = KNOWN_TYPES.has(typeRaw as SalesNotificationType)
    ? (typeRaw as SalesNotificationType)
    : "scan_success";

  const meta = item.metadata ?? {};
  const dueInDaysRaw = meta.dueInDays ?? meta.due_in_days;
  const dueInDays =
    typeof dueInDaysRaw === "number"
      ? dueInDaysRaw
      : dueInDaysRaw != null && dueInDaysRaw !== ""
        ? Number(dueInDaysRaw)
        : undefined;

  const rawId = item.id;
  const id =
    rawId != null && String(rawId).trim() !== "" && String(rawId) !== "null"
      ? String(rawId)
      : `server-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    type,
    notifyType:
      item.notifyType === "others" || item.notifyType === "idg_sales"
        ? item.notifyType
        : "idg_sales",
    title: item.title || "Notification",
    body: item.body || "",
    createdAt: item.createdAt || new Date().toISOString(),
    read: Boolean(item.read),
    meta: {
      opportunityTitle:
        typeof meta.opportunityTitle === "string"
          ? meta.opportunityTitle
          : typeof meta.opportunity_title === "string"
            ? meta.opportunity_title
            : undefined,
      dueInDays: Number.isFinite(dueInDays) ? dueInDays : undefined,
      sourceKey:
        typeof meta.sourceKey === "string"
          ? meta.sourceKey
          : typeof meta.source_key === "string"
            ? meta.source_key
            : undefined,
      found: typeof meta.found === "number" ? meta.found : undefined,
      created: typeof meta.created === "number" ? meta.created : undefined,
      updated: typeof meta.updated === "number" ? meta.updated : undefined,
    },
  };
}

function mapApiItemToNotification(
  item: IdgSalesInboxPushItem,
  agentId: string
): SalesNotification | null {
  const itemAgentId = (item.agentId ?? "").toString().trim();
  if (itemAgentId && agentId && itemAgentId !== agentId) {
    return null;
  }

  const meta = item.metadata ?? {};
  const typeRaw = (item.type ?? "").trim();
  const type = KNOWN_TYPES.has(typeRaw as SalesNotificationType)
    ? (typeRaw as SalesNotificationType)
    : "scan_success";

  const dueInDaysRaw = meta.dueInDays ?? meta.due_in_days;
  const dueInDays =
    typeof dueInDaysRaw === "number"
      ? dueInDaysRaw
      : dueInDaysRaw != null && dueInDaysRaw !== ""
        ? Number(dueInDaysRaw)
        : undefined;

  return {
    id: String(item.id ?? `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    type,
    notifyType:
      item.notifyType === "others" || item.notifyType === "idg_sales"
        ? item.notifyType
        : "idg_sales",
    title: item.title || "Notification",
    body: item.body || "",
    createdAt: item.createdAt || new Date().toISOString(),
    read: false,
    meta: {
      opportunityTitle:
        typeof meta.opportunityTitle === "string"
          ? meta.opportunityTitle
          : typeof meta.opportunity_title === "string"
            ? meta.opportunity_title
            : undefined,
      dueInDays: Number.isFinite(dueInDays) ? dueInDays : undefined,
      sourceKey:
        typeof meta.sourceKey === "string"
          ? meta.sourceKey
          : typeof meta.source_key === "string"
            ? meta.source_key
            : undefined,
      found: typeof meta.found === "number" ? meta.found : undefined,
      created: typeof meta.created === "number" ? meta.created : undefined,
      updated: typeof meta.updated === "number" ? meta.updated : undefined,
    },
  };
}

function mapFcmToNotification(payload: FcmPushPayload, agentId: string): SalesNotification | null {
  const data = payload.data ?? {};
  const payloadAgentId = (data.agentId ?? "").trim();
  // Drop only when both sides have an agent id and they disagree.
  if (payloadAgentId && agentId && payloadAgentId !== agentId) {
    console.log("[NotificationProvider] FCM dropped: agentId mismatch", {
      payloadAgentId,
      agentId,
    });
    return null;
  }

  const typeRaw = (data.type ?? "").trim();
  const type = KNOWN_TYPES.has(typeRaw as SalesNotificationType)
    ? (typeRaw as SalesNotificationType)
    : "scan_success";

  const idRaw = (data.notificationId ?? data.notification_id ?? "").trim();
  const id =
    idRaw && idRaw !== "null" && idRaw !== "undefined"
      ? idRaw
      : `fcm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const dueInDaysRaw = data.dueInDays ?? data.due_in_days;
  const dueInDays = dueInDaysRaw != null && dueInDaysRaw !== "" ? Number(dueInDaysRaw) : undefined;

  return {
    id,
    type,
    notifyType:
      data.notifyType === "others" || data.notifyType === "idg_sales"
        ? data.notifyType
        : "idg_sales",
    title: payload.title || data.title || "Notification",
    body: payload.body || data.body || "",
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
    read: false,
    meta: {
      opportunityTitle: data.opportunityTitle || data.opportunity_title || undefined,
      dueInDays: Number.isFinite(dueInDays) ? dueInDays : undefined,
      sourceKey: data.sourceKey || data.source_key || undefined,
      found: data.found != null && data.found !== "" ? Number(data.found) : undefined,
      created: data.created != null && data.created !== "" ? Number(data.created) : undefined,
      updated: data.updated != null && data.updated !== "" ? Number(data.updated) : undefined,
    },
  };
}

function showBrowserNotification(
  title: string,
  body: string,
  data?: Record<string, string>
): void {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const options: NotificationOptions = {
    body,
    data,
    icon: "/qiko-icon.png",
  };

  // Prefer the service worker so it matches real push (system tray / OS toast).
  if (navigator.serviceWorker?.ready) {
    void navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {
        try {
          new Notification(title, options);
        } catch {
          // ignore
        }
      });
    return;
  }

  try {
    new Notification(title, options);
  } catch {
    // ignore
  }
}

function notifyForType(
  type: SalesNotificationType,
  title: string,
  body: string,
  data?: Record<string, string>
): void {
  showBrowserNotification(title, body, { type, ...data });
}

export function SalesIntelNotificationProvider({
  agentId,
  userId,
  children,
}: {
  agentId: string;
  userId?: string | number | null;
  children: ReactNode;
}) {
  const trimmedAgentId = agentId.trim();
  const userKey = userId != null && String(userId).trim() !== "" ? String(userId).trim() : "";
  const [notifications, setNotifications] = useState<SalesNotification[]>(() =>
    loadStored(trimmedAgentId, userKey)
  );
  const [loading, setLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );
  const [pushEnabled, setPushEnabled] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const hydratedKeyRef = useRef<string>("");
  const fetchInFlightRef = useRef(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  useEffect(() => {
    const stored = loadStored(trimmedAgentId, userKey);
    setNotifications(stored);
    knownIdsRef.current = new Set(stored.map((item) => item.id));
  }, [trimmedAgentId, userKey]);

  useEffect(() => {
    if (!trimmedAgentId) return;
    saveStored(trimmedAgentId, userKey, notifications);
  }, [notifications, trimmedAgentId, userKey]);

  const mergeFromServer = useCallback(
    (items: IdgSalesNotification[], options?: { toastNew?: boolean }) => {
      const mapped = items
        .map(mapServerNotification)
        .filter((item): item is SalesNotification => item !== null);

      if (mapped.length === 0) return;

      const fresh = mapped.filter((item) => !knownIdsRef.current.has(item.id));
      mapped.forEach((item) => knownIdsRef.current.add(item.id));

      setNotifications((prev) => {
        const byId = new Map(prev.map((item) => [item.id, item]));
        for (const item of mapped) {
          const existing = byId.get(item.id);
          if (existing) {
            byId.set(item.id, {
              ...existing,
              ...item,
              read: existing.read || item.read,
            });
          } else {
            byId.set(item.id, item);
          }
        }
        return Array.from(byId.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_STORED);
      });

      if (options?.toastNew) {
        fresh
          .filter((item) => !item.read)
          .forEach((item) => notifyForType(item.type, item.title, item.body));
      }
    },
    []
  );

  // Hydrate once on mount; soft-refresh when the tab becomes visible (throttled).
  // Live updates come from FCM when configured.
  useEffect(() => {
    if (!trimmedAgentId) return;

    const sessionKey = `${trimmedAgentId}:${userKey}`;
    let cancelled = false;
    let lastPullAt = 0;

    const pullInbox = async (toastNew: boolean) => {
      if (cancelled || fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;
      if (!toastNew) setLoading(true);

      try {
        const result = await getIdgSalesNotifications(trimmedAgentId, { limit: 50 });
        if (cancelled) return;
        mergeFromServer(result.notifications ?? [], { toastNew });
        hydratedKeyRef.current = sessionKey;
        lastPullAt = Date.now();
      } catch (err) {
        console.log("[NotificationProvider] pullInbox failed", err);
      } finally {
        fetchInFlightRef.current = false;
        if (!cancelled && !toastNew) setLoading(false);
      }
    };

    void pullInbox(false);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastPullAt < INBOX_POLL_MS) return;
      void pullInbox(true);
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mergeFromServer, trimmedAgentId, userKey]);

  const ingestPush = useCallback(
    (payload: FcmPushPayload, options?: { silentToast?: boolean }) => {
      console.log("[NotificationProvider] ingestPush triggered", { payload, options });
      if (!trimmedAgentId) return;

      const mapped = mapFcmToNotification(payload, trimmedAgentId);
      if (!mapped) return;

      knownIdsRef.current.add(mapped.id);
      setNotifications((prev) => {
        if (prev.some((item) => item.id === mapped.id)) {
          return prev;
        }
        return [mapped, ...prev].slice(0, MAX_STORED);
      });

      if (!options?.silentToast) {
        notifyForType(mapped.type, mapped.title, mapped.body, payload.data);
      }
    },
    [trimmedAgentId]
  );

  const ingestApiItems = useCallback(
    (items: IdgSalesInboxPushItem[], options?: { silentToast?: boolean }) => {
      console.log("[NotificationProvider] ingestApiItems triggered", { items, options });
      if (!trimmedAgentId || items.length === 0) return;

      const mappedItems = items
        .map((item) => mapApiItemToNotification(item, trimmedAgentId))
        .filter((item): item is SalesNotification => item !== null);

      if (mappedItems.length === 0) return;

      mappedItems.forEach((item) => knownIdsRef.current.add(item.id));
      setNotifications((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const fresh = mappedItems.filter((item) => !existing.has(item.id));
        if (fresh.length === 0) return prev;
        return [...fresh, ...prev].slice(0, MAX_STORED);
      });

      if (!options?.silentToast) {
        mappedItems.forEach((item) => notifyForType(item.type, item.title, item.body));
      }
    },
    [trimmedAgentId]
  );

  useEffect(() => {
    if (!trimmedAgentId) return;

    console.log("[NotificationProvider] FCM setup effect triggered", { agentId: trimmedAgentId });

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      setPushPermission(getNotificationPermission());
      // Silent only — do not prompt on page load (browsers often auto-deny).
      const token = await requestFcmToken({ interactive: false });
      console.log("[NotificationProvider] requestFcmToken result", {
        interactive: false,
        token: token ? `${token.slice(0, 12)}…` : null,
        permission: getNotificationPermission(),
      });
      if (cancelled) return;

      setPushPermission(getNotificationPermission());
      if (token) {
        try {
          await registerFcmToken({
            token,
            platform: "web",
            agent_unique_id: trimmedAgentId,
          });
          console.log("[NotificationProvider] registerFcmToken success");
          setPushEnabled(true);
        } catch (err) {
          console.log("[NotificationProvider] registerFcmToken failed", err);
          setPushEnabled(false);
        }
      } else {
        setPushEnabled(false);
      }

      if (cancelled) return;
      unsubscribe = await subscribeForegroundMessages((payload) => {
        console.log("[NotificationProvider] foreground FCM message received", payload);
        ingestPush(payload);
      });
      console.log("[NotificationProvider] subscribed to foreground messages", {
        hasListener: Boolean(unsubscribe),
      });
    })();

    const onSwMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; payload?: FcmPushPayload } | null;
      console.log("[NotificationProvider] serviceWorker message", data);
      if (!data || data.type !== "idg-sales-fcm" || !data.payload) return;
      ingestPush(data.payload, { silentToast: true });
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    let broadcast: BroadcastChannel | null = null;
    try {
      broadcast = new BroadcastChannel(FCM_BROADCAST_CHANNEL);
      broadcast.onmessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; payload?: FcmPushPayload } | null;
        console.log("[NotificationProvider] BroadcastChannel FCM", data);
        if (!data || data.type !== "idg-sales-fcm" || !data.payload) return;
        ingestPush(data.payload, { silentToast: true });
      };
    } catch (err) {
      console.log("[NotificationProvider] BroadcastChannel unavailable", err);
    }

    const onInboxPush = (event: Event) => {
      const detail = (event as CustomEvent<{ items?: IdgSalesInboxPushItem[] }>).detail;
      console.log("[NotificationProvider] inbox push event", detail);
      ingestApiItems(Array.isArray(detail?.items) ? detail.items : []);
    };
    window.addEventListener(IDG_SALES_INBOX_PUSH_EVENT, onInboxPush);

    return () => {
      console.log("[NotificationProvider] FCM setup cleanup");
      cancelled = true;
      unsubscribe?.();
      broadcast?.close();
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
      window.removeEventListener(IDG_SALES_INBOX_PUSH_EVENT, onInboxPush);
    };
  }, [ingestApiItems, ingestPush, trimmedAgentId]);

  const enablePush = useCallback(async () => {
    setPushPermission(getNotificationPermission());
    const token = await requestFcmToken({ interactive: true });
    const permission = getNotificationPermission();
    setPushPermission(permission);

    if (!token || !trimmedAgentId) {
      setPushEnabled(false);
      if (permission === "denied") {
        toast.message("Notifications blocked", {
          description:
            "Click the lock icon in the address bar → Site settings → Notifications → Allow, then try Enable push again.",
        });
      } else if (permission === "default") {
        toast.message("Permission required", {
          description: "Allow notifications when the browser asks.",
        });
      }
      return false;
    }

    try {
      await registerFcmToken({
        token,
        platform: "web",
        agent_unique_id: trimmedAgentId,
      });
      setPushEnabled(true);
      toast.success("Push notifications enabled");
      return true;
    } catch (err) {
      console.log("[NotificationProvider] registerFcmToken failed", err);
      setPushEnabled(false);
      toast.error("Could not register push token");
      return false;
    }
  }, [trimmedAgentId]);

  const markRead = useCallback(
    (id: string) => {
      console.log("[NotificationProvider] markRead triggered", id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      if (!trimmedAgentId) return;
      void markIdgSalesNotificationRead(trimmedAgentId, id).catch(() => undefined);
    },
    [trimmedAgentId]
  );

  const markAllRead = useCallback(() => {
    console.log("[NotificationProvider] markAllRead triggered");
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    if (!trimmedAgentId) return;
    void markAllIdgSalesNotificationsRead(trimmedAgentId).catch(() => undefined);
  }, [trimmedAgentId]);

  const refresh = useCallback(async () => {
    if (!trimmedAgentId || fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    try {
      const result = await getIdgSalesNotifications(trimmedAgentId, { limit: 50 });
      mergeFromServer(result.notifications ?? [], { toastNew: false });
    } catch {
      // Soft poll will retry.
    } finally {
      fetchInFlightRef.current = false;
    }
  }, [mergeFromServer, trimmedAgentId]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      pushPermission,
      pushEnabled,
      enablePush,
      markRead,
      markAllRead,
      refresh,
    }),
    [
      notifications,
      unreadCount,
      loading,
      pushPermission,
      pushEnabled,
      enablePush,
      markRead,
      markAllRead,
      refresh,
    ]
  );

  return (
    <SalesIntelNotificationContext.Provider value={value}>
      {children}
    </SalesIntelNotificationContext.Provider>
  );
}

export function useSalesIntelNotifications(): SalesIntelNotificationContextValue {
  const context = useContext(SalesIntelNotificationContext);
  if (!context) {
    throw new Error(
      "useSalesIntelNotifications must be used within SalesIntelNotificationProvider"
    );
  }
  return context;
}
