import { supabase } from "@/integrations/supabase/client";

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("Push notifications not supported");
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export function isPushSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

export function getPushPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function showLocalNotification(title: string, body: string, tag?: string) {
  if (Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker?.ready;
  if (registration) {
    registration.showNotification(title, {
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: tag || "checkmate-notification",
    } as NotificationOptions);
  }
}
