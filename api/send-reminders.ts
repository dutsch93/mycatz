import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { berlinDateString, getDueTimes, shouldSendReminder } from './_lib/reminderLogic'

type SendPushFn = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
) => Promise<void>

// Kernlogik, getrennt vom HTTP-Handler, damit sie ohne echtes Netzwerk testbar ist
// (siehe api/send-reminders.test.ts). `supabase` ist bewusst nicht als SupabaseClient
// typisiert, sondern strukturell kompatibel gehalten, damit der Test ein leichtgewichtiges
// Fake übergeben kann.
export async function resolveReminders(
  supabase: SupabaseClient,
  now: Date,
  sendPush: SendPushFn,
): Promise<{ notified: number }> {
  const today = berlinDateString(now)
  let notified = 0

  const { data: settings, error: settingsError } = await supabase
    .from('household_reminder_settings')
    .select('household_id, enabled, times')
    .eq('enabled', true)
  if (settingsError) throw new Error(settingsError.message)

  for (const setting of (settings ?? []) as {
    household_id: string
    enabled: boolean
    times: string[]
  }[]) {
    const dueTimes = getDueTimes(setting.times, now)
    if (dueTimes.length === 0) continue

    for (const slot of dueTimes) {
      const { data: claimed, error: claimError } = await supabase
        .from('reminder_sends')
        .upsert(
          { household_id: setting.household_id, date: today, time_slot: slot },
          { onConflict: 'household_id,date,time_slot', ignoreDuplicates: true },
        )
        .select()
      if (claimError) continue
      const alreadySentSlot = (claimed?.length ?? 0) === 0
      if (alreadySentSlot) continue

      const { data: cats } = await supabase
        .from('cats')
        .select('id')
        .eq('household_id', setting.household_id)
      const catIds = (cats ?? []).map((c: { id: string }) => c.id)

      const { data: feedingToday } = await supabase
        .from('feeding_logs')
        .select('id')
        .eq('date', today)
        .in('cat_id', catIds)

      if (!shouldSendReminder({ alreadyFedToday: (feedingToday?.length ?? 0) > 0, alreadySentSlot })) {
        continue
      }

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('household_id', setting.household_id)

      for (const sub of (subscriptions ?? []) as {
        id: string
        endpoint: string
        p256dh: string
        auth: string
      }[]) {
        try {
          await sendPush(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: 'MyCatz', body: 'Wurde heute schon gefüttert?' }),
          )
          notified++
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }
    }
  }

  return { notified }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  )

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VITE_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  )

  try {
    const result = await resolveReminders(supabase, new Date(), (subscription, payload) =>
      webpush.sendNotification(subscription, payload).then(() => undefined),
    )
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'unknown error' })
  }
}
