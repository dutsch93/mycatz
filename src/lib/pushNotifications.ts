// Web-Push-Helfer fürs Gerät/den Browser. Enthält keine Supabase-Aufrufe — das
// Speichern/Löschen der Subscription übernimmt AppDataContext
// (registerPushSubscription/removePushSubscription), s.
// docs/superpowers/specs/2026-10-03-push-notifications-design.md

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Wandelt den URL-sicheren Base64-VAPID-Public-Key in das Byte-Array um, das
// PushManager.subscribe() als applicationServerKey erwartet.
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

// Fragt die Benachrichtigungs-Erlaubnis an und abonniert Push. Wirft, wenn die
// Erlaubnis verweigert wird oder Push nicht unterstützt ist — der Aufrufer
// (Settings.tsx) fängt das ab und zeigt eine Fehlermeldung.
export async function subscribeBrowser(
  vapidPublicKey: string,
): Promise<{ endpoint: string; p256dh: string; auth: string }> {
  if (!isPushSupported()) {
    throw new Error('Push-Benachrichtigungen werden auf diesem Gerät/Browser nicht unterstützt.')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Benachrichtigungen wurden nicht erlaubt.')
  }
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Push-Subscription ist unvollständig.')
  }
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }
}

export async function unsubscribeBrowser(): Promise<void> {
  const subscription = await getCurrentSubscription()
  if (subscription) await subscription.unsubscribe()
}
