import { useEffect } from "react";
import { registerFcmToken } from "@/lib/idgSalesApi";
import { getNotificationPermission, requestFcmToken } from "@/lib/firebase";

/**
 * Same path as the notifications "Enable" button: interactive FCM token request
 * (calls Notification.requestPermission when still undecided).
 */
export async function promptAndRegisterPushOnAppVisit(): Promise<boolean> {
  const token = await requestFcmToken({ interactive: true });
  if (!token) return false;
  try {
    await registerFcmToken({ token, platform: "web" });
    return true;
  } catch {
    return false;
  }
}

export async function registerPushIfGranted(): Promise<boolean> {
  if (getNotificationPermission() !== "granted") return false;
  const token = await requestFcmToken({ interactive: false });
  if (!token) return false;
  try {
    await registerFcmToken({ token, platform: "web" });
    return true;
  } catch {
    return false;
  }
}

/**
 * On /app: ask via the browser permission dialog using the same mechanism as Enable.
 * Chrome only shows Allow/Block from a user gesture, so the first click/key on /app
 * triggers the prompt (page-load alone becomes Quiet UI / "Notifications blocked").
 */
export function usePushPermissionPromptOnApp(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;

    const permission = getNotificationPermission();
    if (permission === "unsupported") return;
    if (permission === "granted") {
      void registerPushIfGranted();
      return;
    }
    // denied: still arm gesture — Chrome Quiet UI "Allow for this site" needs a click
    // the same way the notifications Enable button does.

    let handled = false;

    const askLikeEnableButton = () => {
      if (handled) return;
      handled = true;
      window.removeEventListener("pointerdown", askLikeEnableButton, true);
      window.removeEventListener("keydown", askLikeEnableButton, true);
      void promptAndRegisterPushOnAppVisit();
    };

    // First interaction on /app === same gesture path as clicking Enable.
    window.addEventListener("pointerdown", askLikeEnableButton, true);
    window.addEventListener("keydown", askLikeEnableButton, true);

    return () => {
      window.removeEventListener("pointerdown", askLikeEnableButton, true);
      window.removeEventListener("keydown", askLikeEnableButton, true);
    };
  }, [active]);
}
