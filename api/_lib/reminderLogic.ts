// Reine, getestete Logik für die Fütterungs-Erinnerung. Keine Supabase-/Netzwerk-Aufrufe
// hier — die ruft api/send-reminders.ts auf und kombiniert die Ergebnisse mit diesen
// Funktionen. Siehe docs/superpowers/specs/2026-10-03-push-notifications-design.md

export function berlinHoursMinutes(date: Date): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const hours = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24
  const minutes = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return { hours, minutes }
}

export function berlinDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(date)
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// Liefert alle konfigurierten Zeiten, die gerade "fällig" sind: die aktuelle Zeit liegt
// auf oder bis zu windowMinutes nach der konfigurierten Zeit (nie davor, nie danach).
export function getDueTimes(times: string[], now: Date, windowMinutes = 5): string[] {
  const { hours, minutes } = berlinHoursMinutes(now)
  const nowMinutes = hours * 60 + minutes
  return times.filter((time) => {
    const diff = nowMinutes - parseTimeToMinutes(time)
    return diff >= 0 && diff < windowMinutes
  })
}

export function shouldSendReminder(options: {
  alreadyFedToday: boolean
  alreadySentSlot: boolean
}): boolean {
  return !options.alreadyFedToday && !options.alreadySentSlot
}
