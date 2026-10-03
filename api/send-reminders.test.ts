import { describe, expect, it, vi } from 'vitest'
import { resolveReminders } from './send-reminders'

function fakeSupabase(overrides: {
  settings?: { household_id: string; enabled: boolean; times: string[] }[]
  cats?: { id: string; household_id: string }[]
  feedingLogs?: { cat_id: string; date: string }[]
  subscriptions?: { id: string; household_id: string; endpoint: string; p256dh: string; auth: string }[]
  claimedSlots?: Set<string>
}) {
  const claimed = overrides.claimedSlots ?? new Set<string>()
  return {
    from(table: string) {
      if (table === 'household_reminder_settings') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: overrides.settings ?? [], error: null }),
          }),
        }
      }
      if (table === 'cats') {
        return {
          select: () => ({
            eq: (_col: string, householdId: string) =>
              Promise.resolve({
                data: (overrides.cats ?? []).filter((c) => c.household_id === householdId),
                error: null,
              }),
          }),
        }
      }
      if (table === 'feeding_logs') {
        return {
          select: () => ({
            eq: (_col: string, date: string) => ({
              in: (_col2: string, catIds: string[]) =>
                Promise.resolve({
                  data: (overrides.feedingLogs ?? []).filter(
                    (f) => f.date === date && catIds.includes(f.cat_id),
                  ),
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'reminder_sends') {
        return {
          upsert: (row: { household_id: string; date: string; time_slot: string }) => ({
            select: () => {
              const key = `${row.household_id}|${row.date}|${row.time_slot}`
              if (claimed.has(key)) return Promise.resolve({ data: [], error: null })
              claimed.add(key)
              return Promise.resolve({ data: [row], error: null })
            },
          }),
        }
      }
      if (table === 'push_subscriptions') {
        return {
          select: () => ({
            eq: (_col: string, householdId: string) =>
              Promise.resolve({
                data: (overrides.subscriptions ?? []).filter((s) => s.household_id === householdId),
                error: null,
              }),
          }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }
      }
      throw new Error(`unerwartete Tabelle in Test: ${table}`)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('resolveReminders', () => {
  it('sends to every subscription of a due, not-yet-fed household', async () => {
    const sendPush = vi.fn().mockResolvedValue(undefined)
    const supabase = fakeSupabase({
      settings: [{ household_id: 'h1', enabled: true, times: ['08:00'] }],
      cats: [{ id: 'c1', household_id: 'h1' }],
      feedingLogs: [],
      subscriptions: [{ id: 's1', household_id: 'h1', endpoint: 'e1', p256dh: 'p', auth: 'a' }],
    })
    const now = new Date('2026-10-03T06:00:00Z') // 08:00 Berlin

    const result = await resolveReminders(supabase, now, sendPush)

    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(result.notified).toBe(1)
  })

  it('does not send when the household already logged feeding today', async () => {
    const sendPush = vi.fn().mockResolvedValue(undefined)
    const supabase = fakeSupabase({
      settings: [{ household_id: 'h1', enabled: true, times: ['08:00'] }],
      cats: [{ id: 'c1', household_id: 'h1' }],
      feedingLogs: [{ cat_id: 'c1', date: '2026-10-03' }],
      subscriptions: [{ id: 's1', household_id: 'h1', endpoint: 'e1', p256dh: 'p', auth: 'a' }],
    })
    const now = new Date('2026-10-03T06:00:00Z')

    const result = await resolveReminders(supabase, now, sendPush)

    expect(sendPush).not.toHaveBeenCalled()
    expect(result.notified).toBe(0)
  })

  it('does not send twice for the same already-claimed slot', async () => {
    const sendPush = vi.fn().mockResolvedValue(undefined)
    const supabase = fakeSupabase({
      settings: [{ household_id: 'h1', enabled: true, times: ['08:00'] }],
      cats: [{ id: 'c1', household_id: 'h1' }],
      feedingLogs: [],
      subscriptions: [{ id: 's1', household_id: 'h1', endpoint: 'e1', p256dh: 'p', auth: 'a' }],
      claimedSlots: new Set(['h1|2026-10-03|08:00']),
    })
    const now = new Date('2026-10-03T06:00:00Z')

    const result = await resolveReminders(supabase, now, sendPush)

    expect(sendPush).not.toHaveBeenCalled()
    expect(result.notified).toBe(0)
  })

  it('completes without error when an enabled household has no subscriptions yet', async () => {
    const sendPush = vi.fn().mockResolvedValue(undefined)
    const supabase = fakeSupabase({
      settings: [{ household_id: 'h1', enabled: true, times: ['08:00'] }],
      cats: [{ id: 'c1', household_id: 'h1' }],
      feedingLogs: [],
      subscriptions: [],
    })
    const now = new Date('2026-10-03T06:00:00Z')

    const result = await resolveReminders(supabase, now, sendPush)

    expect(sendPush).not.toHaveBeenCalled()
    expect(result.notified).toBe(0)
  })

  it('removes an expired subscription on HTTP 410 but still notifies the others', async () => {
    const sendPush = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }))
      .mockResolvedValueOnce(undefined)
    const supabase = fakeSupabase({
      settings: [{ household_id: 'h1', enabled: true, times: ['08:00'] }],
      cats: [{ id: 'c1', household_id: 'h1' }],
      feedingLogs: [],
      subscriptions: [
        { id: 's1', household_id: 'h1', endpoint: 'e1', p256dh: 'p', auth: 'a' },
        { id: 's2', household_id: 'h1', endpoint: 'e2', p256dh: 'p', auth: 'a' },
      ],
    })
    const now = new Date('2026-10-03T06:00:00Z')

    const result = await resolveReminders(supabase, now, sendPush)

    expect(sendPush).toHaveBeenCalledTimes(2)
    expect(result.notified).toBe(1)
  })
})
