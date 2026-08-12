import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
  type Unsubscribe,
} from "firebase/messaging";
import { isMockDataEnabled } from "@/data/isMockEnabled";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

export type NotificationPermissionState = NotificationPermission | "unsupported";

export type RequestFcmTokenOptions = {
  /**
   * When true, may call Notification.requestPermission() (must run from a user gesture).
   * When false, only registers if permission is already "granted".
   */
  interactive?: boolean;
};

function readFirebaseConfig(): FirebaseWebConfig | null {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() ?? "";
  const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim() ?? "";
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() ?? "";
  const storageBucket =
    (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined)?.trim() ?? "";
  const messagingSenderId =
    (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined)?.trim() ?? "";
  const appId = (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim() ?? "";
  const measurementId =
    (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined)?.trim() || undefined;

  if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
    console.warn("[firebase] Missing VITE_FIREBASE_* config; FCM disabled.");
    return null;
  }

  if (apiKey === "AAAA" || appId === "PPP") {
    console.warn("[firebase] Placeholder Firebase config detected; FCM disabled.");
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
  };
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function getFirebaseApp(): FirebaseApp | null {
  if (app) return app;
  const config = readFirebaseConfig();
  if (!config) return null;
  app = initializeApp(config);
  return app;
}

async function ensureMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return null;
  if (swRegistration) return swRegistration;
  try {
    swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (error) {
    console.warn("[firebase] service worker register failed:", error);
    return null;
  }
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messaging) return messaging;
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn("[firebase] Messaging not supported in this browser.");
    return null;
  }
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  await ensureMessagingServiceWorker();
  messaging = getMessaging(firebaseApp);
  return messaging;
}

/**
 * Obtain an FCM registration token.
 * - interactive=false (default): only if Notification.permission is already "granted"
 * - interactive=true: may prompt; call from a click handler
 */
export async function requestFcmToken(
  options: RequestFcmTokenOptions = {}
): Promise<string | null> {
  if (isMockDataEnabled()) {
    return null;
  }
  const interactive = options.interactive === true;
  const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim();
  if (!vapidKey) {
    console.warn(
      "[firebase] VITE_FIREBASE_VAPID_KEY is empty. Set Web Push certificates key in Firebase Console."
    );
    return null;
  }

  if (typeof Notification === "undefined") return null;

  let permission = Notification.permission;

  if (permission === "denied") {
    // Browser will not show the prompt again until the user resets site settings.
    if (interactive) {
      console.warn(
        "[firebase] Notifications blocked for this site. Enable them in the browser address-bar site settings, then click Enable push again."
      );
    }
    return null;
  }

  if (permission === "default") {
    if (!interactive) {
      return null;
    }
    // Browser-native permission dialog (Allow / Block in the address bar).
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    console.warn("[firebase] Notification permission not granted:", permission);
    return null;
  }

  const msg = await getFirebaseMessaging();
  if (!msg) return null;
  const registration = await ensureMessagingServiceWorker();

  try {
    const token = await getToken(msg, {
      vapidKey,
      ...(registration ? { serviceWorkerRegistration: registration } : {}),
    });
    console.log("[firebase] getToken success:", token ? `${token.slice(0, 12)}…` : null);
    return token || null;
  } catch (error) {
    console.warn("[firebase] getToken failed:", error);
    return null;
  }
}

export async function subscribeForegroundMessages(
  handler: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): Promise<Unsubscribe | null> {
  await ensureMessagingServiceWorker();
  const msg = await getFirebaseMessaging();
  if (!msg) return null;

  return onMessage(msg, (payload) => {
    console.log("[firebase] onMessage:", payload);
    const data = (payload.data ?? {}) as Record<string, string>;
    // Backend sends data-only FCM — title/body live in data, not notification.
    handler({
      title: payload.notification?.title || data.title,
      body: payload.notification?.body || data.body,
      data,
    });
  });
}
