import { apiClient } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator && Boolean((window.navigator as any).standalone)) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getVapidPublicKey(): Promise<string> {
  // Check env first
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;

  try {
    const res = await apiClient.get<{ publicKey: string }>("/push/vapid-key");
    return res.data.publicKey || "";
  } catch {
    return "";
  }
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        try {
          registration = await navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
        } catch (e) {
          console.warn("Could not register SW directly:", e);
        }
      }
    }

    if (registration) {
      return registration;
    }

    // Fallback to ready with a 4-second safety timeout
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
    return await Promise.race([readyPromise, timeoutPromise]);
  } catch (err) {
    console.warn("Error getting service worker registration:", err);
    return null;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  status: "granted" | "denied" | "unsupported" | "ios_home_screen_required";
  subscription?: PushSubscription;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: false, status: "unsupported", error: "Push notifications are not supported on this browser." };
  }


  // iOS requires adding to Home Screen first to enable Web Push
  if (isIosDevice() && !isStandalonePwa()) {
    return {
      success: false,
      status: "ios_home_screen_required",
      error: "On iPhone & iPad, Web Push notifications require adding Our Space to your Home Screen first.",
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, status: "denied", error: "Notification permission was denied." };
    }

    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      return { success: false, status: "unsupported", error: "VAPID key is not configured." };
    }

    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      return { success: false, status: "unsupported", error: "Service Worker could not be activated." };
    }
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      throw new Error("Invalid push subscription structure returned by browser.");
    }

    await apiClient.post("/push/subscribe", {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
    });

    return { success: true, status: "granted", subscription };
  } catch (err: any) {
    return {
      success: false,
      status: "denied",
      error: err?.message || "Failed to subscribe to push notifications.",
    };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await apiClient.post("/push/unsubscribe", { endpoint });
    }
    return true;
  } catch {
    return false;
  }
}
