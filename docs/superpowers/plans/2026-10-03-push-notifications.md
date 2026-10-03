# Push-Benachrichtigungen (Fütterungs-Erinnerung) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Haushaltsmitglieder bekommen eine Web-Push-Benachrichtigung, wenn bis zu einer festen Uhrzeit noch nicht gefüttert wurde.

**Architecture:** Supabase `pg_cron` ruft alle 5 Minuten per `pg_net` eine neue Vercel-Serverless-Function (`api/send-reminders.ts`) auf. Die Funktion prüft fällige Haushalte (Zeitfenster erreicht, heute noch nicht gefüttert, noch nicht verschickt) und sendet Push über `web-push` an alle registrierten Geräte. Der Client registriert sich über `pushManager.subscribe()` und speichert die Subscription in Supabase; der Service Worker zeigt eingehende Push-Nachrichten an.

**Tech Stack:** React/Vite/TypeScript (bestehend), Supabase (Postgres + `pg_cron` + `pg_net`), Vercel Serverless Functions (Node, `@vercel/node`), `web-push` (neu), Vitest (bestehend).

**Spec:** `docs/superpowers/specs/2026-10-03-push-notifications-design.md`

## Global Constraints

- Nur Futter-Erinnerungen in v1 (keine Spielzeit/Habits).
- Feste Zeiten pro Haushalt, keine individuellen Zeiten pro Katze.
- Feste Zeitzone Europe/Berlin (keine Mehrzeitzonen-Unterstützung).
- Keine neue CLI nötig: Migration per Supabase-SQL-Editor, Server-Code per normalem Git-Push zu Vercel.
- Neue Dependencies (bereits im Spec mit dem Nutzer abgestimmt): `web-push` (prod), `@types/web-push`, `@types/node`, `@vercel/node` (dev).
- Alle bestehenden Checks bleiben grün: `npm run check:task` (Types, Lint, Tests+Coverage).

## Review Focus

- Mehrere Erinnerungszeiten pro Haushalt: Zeitfenster-Zuordnung muss pro Eintrag einzeln und korrekt an der Fenstergrenze (genau auf der Minute, kurz davor, kurz danach) matchen.
- Haushalt hat heute schon gefüttert: Erinnerung darf trotz erreichter Uhrzeit nicht verschickt werden.
- Derselbe Zeitslot wurde schon einmal verschickt (z. B. durch überlappende Cron-Läufe): kein zweiter Versand.
- Haushalt hat Erinnerungen aktiviert, aber noch niemand hat sein Gerät registriert: Funktion darf nicht fehlschlagen, sendet einfach an niemanden.
- Eine einzelne abgelaufene Subscription (HTTP 410) darf den Versand an die übrigen Geräte desselben Haushalts nicht blockieren.

---

### Task 1: Migration — Datenmodell für Push-Benachrichtigungen

**Files:**
- Create: `supabase/migrations/008_push_notifications.sql`

**Interfaces:**
- Produces: Tabellen `push_subscriptions`, `household_reminder_settings`, `reminder_sends`; `pg_cron`-Job `mycatz-send-reminders`.

- [ ] **Step 1: Migration-Datei anlegen**

```sql
-- Push-Benachrichtigungen für Fütterungs-Erinnerungen. Siehe
-- docs/superpowers/specs/2026-10-03-push-notifications-design.md

-- Eine Zeile pro Browser/Gerät, das Push-Benachrichtigungen erlaubt hat.
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_own_select" ON push_subscriptions
  FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "push_subscriptions_own_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (profile_id = auth.uid() AND household_id = my_household_id());
CREATE POLICY "push_subscriptions_own_update" ON push_subscriptions
  FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "push_subscriptions_own_delete" ON push_subscriptions
  FOR DELETE USING (profile_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;

-- Erinnerungs-Konfiguration pro Haushalt (eine Zeile, vom Owner gepflegt).
CREATE TABLE household_reminder_settings (
  household_id UUID PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  times TIME[] NOT NULL DEFAULT ARRAY['08:00','18:00']::TIME[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE household_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminder_settings_select" ON household_reminder_settings
  FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "reminder_settings_insert" ON household_reminder_settings
  FOR INSERT WITH CHECK (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "reminder_settings_update" ON household_reminder_settings
  FOR UPDATE USING (household_id = my_household_id() AND my_role() = 'owner');

GRANT SELECT, INSERT, UPDATE ON household_reminder_settings TO authenticated;

-- Verhindert Doppel-Versand innerhalb desselben Zeitslots/Tages. Wird ausschließlich
-- vom Server (Service-Role-Key) beschrieben/gelesen, daher kein RLS nötig — die Tabelle
-- ist für normale Nutzer:innen über die Anon-/Auth-Rolle nicht erreichbar, da keine
-- GRANT-Zeile für 'authenticated' existiert.
CREATE TABLE reminder_sends (
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (household_id, date, time_slot)
);

-- pg_cron + pg_net aktivieren und Job registrieren (alle 5 Minuten).
-- WICHTIG: <VERCEL_DOMAIN> und <CRON_SECRET> vor dem Ausführen durch die echten
-- Werte ersetzen (siehe Task 8, Abschnitt "Manuelle Schritte für den Nutzer").
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'mycatz-send-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<VERCEL_DOMAIN>/api/send-reminders',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Datei auf Vollständigkeit prüfen**

Keine automatisierte Prüfung möglich (Migrationen laufen in diesem Projekt
nicht gegen eine lokale Datenbank). Kontrolllesen: jede Tabelle hat RLS wo
nötig, `my_household_id()`/`my_role()` werden genauso verwendet wie in
`supabase/migrations/004_multi_user.sql` und `007_photos_storage.sql`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_push_notifications.sql
git commit -m "Migration: Datenmodell für Push-Benachrichtigungen"
```

---

### Task 2: Reminder-Zeitfenster-Logik (reine Funktionen, TDD)

**Files:**
- Create: `tsconfig.api.json`
- Modify: `tsconfig.json`
- Create: `api/_lib/reminderLogic.ts`
- Create: `api/_lib/reminderLogic.test.ts`

**Interfaces:**
- Produces: `berlinHoursMinutes(date: Date): { hours: number; minutes: number }`, `berlinDateString(date: Date): string`, `parseTimeToMinutes(time: string): number`, `getDueTimes(times: string[], now: Date, windowMinutes?: number): string[]`, `shouldSendReminder(options: { alreadyFedToday: boolean; alreadySentSlot: boolean }): boolean` — alle aus `api/_lib/reminderLogic.ts`, werden in Task 8 von `api/send-reminders.ts` konsumiert.

- [ ] **Step 1: `tsconfig.api.json` anlegen**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["api"]
}
```

- [ ] **Step 2: Root-`tsconfig.json` um die neue Referenz ergänzen**

In `tsconfig.json` (aktueller Inhalt):

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Ändern zu:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.api.json" }
  ]
}
```

- [ ] **Step 3: Fehlschlagenden Test schreiben**

`api/_lib/reminderLogic.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { berlinDateString, getDueTimes, shouldSendReminder } from './reminderLogic'

describe('getDueTimes', () => {
  it('returns a time that falls exactly on the current minute', () => {
    const now = new Date('2026-10-03T06:00:00Z') // 08:00 Berlin (CEST, UTC+2)
    expect(getDueTimes(['08:00', '18:00'], now)).toEqual(['08:00'])
  })

  it('returns a time within the window shortly after the exact minute', () => {
    const now = new Date('2026-10-03T06:04:00Z') // 08:04 Berlin
    expect(getDueTimes(['08:00'], now)).toEqual(['08:00'])
  })

  it('does not return a time once the window has passed', () => {
    const now = new Date('2026-10-03T06:05:00Z') // 08:05 Berlin, Fenster ist 5 Min exklusiv
    expect(getDueTimes(['08:00'], now)).toEqual([])
  })

  it('does not return a time that has not arrived yet', () => {
    const now = new Date('2026-10-03T05:59:00Z') // 07:59 Berlin
    expect(getDueTimes(['08:00'], now)).toEqual([])
  })

  it('returns multiple due times when several configured times fall in the window', () => {
    const now = new Date('2026-10-03T06:02:00Z') // 08:02 Berlin
    expect(getDueTimes(['08:00', '08:01', '09:00'], now)).toEqual(['08:00', '08:01'])
  })
})

describe('shouldSendReminder', () => {
  it('sends when neither already fed nor already sent', () => {
    expect(shouldSendReminder({ alreadyFedToday: false, alreadySentSlot: false })).toBe(true)
  })

  it('does not send when already fed today', () => {
    expect(shouldSendReminder({ alreadyFedToday: true, alreadySentSlot: false })).toBe(false)
  })

  it('does not send when this slot was already sent', () => {
    expect(shouldSendReminder({ alreadyFedToday: false, alreadySentSlot: true })).toBe(false)
  })
})

describe('berlinDateString', () => {
  it('formats a UTC date as YYYY-MM-DD in the Europe/Berlin calendar day', () => {
    // 2026-10-03T23:30:00Z ist in Berlin (UTC+2, CEST) bereits 2026-10-04 01:30
    expect(berlinDateString(new Date('2026-10-03T23:30:00Z'))).toBe('2026-10-04')
  })
})
```

- [ ] **Step 4: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run api/_lib/reminderLogic.test.ts`
Expected: FAIL — `reminderLogic.ts` existiert noch nicht ("Failed to resolve import").

- [ ] **Step 5: Minimale Implementierung schreiben**

`api/_lib/reminderLogic.ts`:

```ts
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
```

- [ ] **Step 6: Test ausführen, Erfolg bestätigen**

Run: `npx vitest run api/_lib/reminderLogic.test.ts`
Expected: PASS (9 Tests)

- [ ] **Step 7: Gesamten Check-Lauf bestätigen**

Run: `npm run check:fast`
Expected: Keine neuen Typ-/Lint-Fehler (die zwei bestehenden
`react-refresh/only-export-components`-Warnungen bleiben bestehen, das
ist der bekannte Ist-Zustand).

- [ ] **Step 8: Commit**

```bash
git add tsconfig.json tsconfig.api.json api/_lib/reminderLogic.ts api/_lib/reminderLogic.test.ts
git commit -m "Erinnerungs-Zeitfenster-Logik mit Tests"
```

---

### Task 3: Haushalts-Erinnerungseinstellungen laden

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/useHouseholdData.ts`

**Interfaces:**
- Consumes: nichts Neues.
- Produces: Typ `HouseholdReminderSettings`; `useHouseholdData(...)` liefert zusätzlich `reminderSettings: HouseholdReminderSettings | null`, konsumiert in Task 4 (`AppDataContext`).

- [ ] **Step 1: Typ ergänzen**

In `src/types/index.ts` nach `CatHabitExclusion` (aktuell Zeile 142-146) anfügen:

```ts

export interface HouseholdReminderSettings {
  household_id: string
  enabled: boolean
  times: string[]
  updated_at: string
}
```

- [ ] **Step 2: Fetch in `useHouseholdData.ts` ergänzen**

In `src/hooks/useHouseholdData.ts`:

Import-Zeile (aktuell Zeile 3-11) erweitern:

```ts
import type {
  Cat,
  CatGroup,
  CatHabitExclusion,
  FoodType,
  HabitDefinition,
  Household,
  HouseholdReminderSettings,
  Profile,
} from '../types'
```

Interface `HouseholdData` (aktuell Zeile 17-28) um ein Feld erweitern:

```ts
interface HouseholdData {
  profile: Profile | null
  household: Household | null
  cats: Cat[]
  groups: CatGroupWithMembers[]
  foodTypes: FoodType[]
  habits: HabitDefinition[]
  catHabitExclusions: CatHabitExclusion[]
  reminderSettings: HouseholdReminderSettings | null
  loading: boolean
  error: string | null
  refresh: () => void
}
```

State-Deklaration (nach Zeile 37, `catHabitExclusions`-State) ergänzen:

```ts
  const [reminderSettings, setReminderSettings] = useState<HouseholdReminderSettings | null>(null)
```

Reset-Block bei fehlendem Haushalt (aktuell Zeile 66-73) ergänzen:

```ts
        if (!householdId) {
          setHousehold(null)
          setCats([])
          setGroups([])
          setFoodTypes([])
          setHabits([])
          setCatHabitExclusions([])
          setReminderSettings(null)
          return
        }
```

`Promise.all`-Aufruf (aktuell Zeile 76-98) um eine Abfrage erweitern:

```ts
        const [
          householdRes,
          catsRes,
          groupsRes,
          membersRes,
          foodRes,
          habitsRes,
          exclusionsRes,
          reminderSettingsRes,
        ] = await Promise.all([
          supabase.from('households').select('*').eq('id', householdId).single(),
          supabase
            .from('cats')
            .select('*')
            .eq('household_id', householdId)
            .eq('archived', false)
            .order('created_at'),
          supabase.from('cat_groups').select('*').eq('household_id', householdId),
          supabase.from('cat_group_members').select('group_id, cat_id'),
          supabase
            .from('food_types')
            .select('*')
            .eq('household_id', householdId)
            .order('sort_order'),
          supabase
            .from('habit_definitions')
            .select('*')
            .eq('household_id', householdId)
            .order('sort_order'),
          supabase.from('cat_habit_exclusions').select('*'),
          supabase
            .from('household_reminder_settings')
            .select('*')
            .eq('household_id', householdId)
            .maybeSingle(),
        ])
```

Fehlerprüfung (aktuell Zeile 100-107) ergänzen — `maybeSingle()` liefert
bei fehlender Zeile `data: null, error: null` (kein Fehler), daher reicht
dieselbe Prüfung wie bei den anderen Abfragen:

```ts
        if (cancelled) return
        if (householdRes.error) throw householdRes.error
        if (catsRes.error) throw catsRes.error
        if (groupsRes.error) throw groupsRes.error
        if (membersRes.error) throw membersRes.error
        if (foodRes.error) throw foodRes.error
        if (habitsRes.error) throw habitsRes.error
        if (exclusionsRes.error) throw exclusionsRes.error
        if (reminderSettingsRes.error) throw reminderSettingsRes.error
```

Nach dem bestehenden `setCatHabitExclusions(...)`-Aufruf (aktuell Zeile
122) ergänzen:

```ts
        setCatHabitExclusions(exclusionsRes.data as CatHabitExclusion[])
        setReminderSettings(reminderSettingsRes.data as HouseholdReminderSettings | null)
```

Return-Objekt (aktuell Zeile 136-147) ergänzen:

```ts
  return {
    profile,
    household,
    cats,
    groups,
    foodTypes,
    habits,
    catHabitExclusions,
    reminderSettings,
    loading,
    error,
    refresh,
  }
```

- [ ] **Step 3: Typecheck**

Run: `npm run check:fast`
Expected: Keine neuen Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/hooks/useHouseholdData.ts
git commit -m "Haushalts-Erinnerungseinstellungen laden"
```

---

### Task 4: `AppDataContext` — Erinnerungs-Einstellungen & Push-Subscription-Verwaltung

**Files:**
- Modify: `src/context/AppDataContext.tsx`

**Interfaces:**
- Consumes: `HouseholdReminderSettings` aus `src/types/index.ts` (Task 3); `householdData.reminderSettings` (Task 3).
- Produces: `updateReminderSettings(enabled: boolean, times: string[]): Promise<void>`, `registerPushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<void>`, `removePushSubscription(endpoint: string): Promise<void>` — konsumiert in Task 7 (`Settings.tsx`).

- [ ] **Step 1: Funktionen implementieren**

In `src/context/AppDataContext.tsx` nach der bestehenden Funktion
`uploadGroupPhoto` (aktuell Zeile 308-310, vor dem Kommentar
"iOS-Shortcut-Fallback") einfügen:

```ts
  async function updateReminderSettings(enabled: boolean, times: string[]) {
    const householdId = householdData.household?.id
    if (!householdId) return
    const { error } = await supabase
      .from('household_reminder_settings')
      .upsert({ household_id: householdId, enabled, times }, { onConflict: 'household_id' })
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function registerPushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
    const householdId = householdData.household?.id
    const profileId = householdData.profile?.id
    if (!householdId || !profileId) return
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        profile_id: profileId,
        household_id: householdId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
      { onConflict: 'endpoint' },
    )
    if (error) throw new Error(error.message)
  }

  async function removePushSubscription(endpoint: string) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    if (error) throw new Error(error.message)
  }
```

- [ ] **Step 2: Typen im `AppDataValue`-Interface ergänzen**

In `src/context/AppDataContext.tsx`, Interface `AppDataValue`, nach der
Zeile `uploadGroupPhoto: (id: string, file: File) => Promise<void>`
(aktuell Zeile 59) einfügen:

```ts
  uploadGroupPhoto: (id: string, file: File) => Promise<void>
  updateReminderSettings: (enabled: boolean, times: string[]) => Promise<void>
  registerPushSubscription: (sub: { endpoint: string; p256dh: string; auth: string }) => Promise<void>
  removePushSubscription: (endpoint: string) => Promise<void>
```

(Die erste Zeile ersetzt die bestehende Zeile 59 1:1, die beiden neuen
Zeilen kommen direkt danach.)

- [ ] **Step 3: Funktionen im Provider-`value` ergänzen**

Im `<AppDataContext.Provider value={{...}}>`-Objekt (aktuell Zeile
386-387) ergänzen:

```ts
        uploadCatPhoto,
        uploadGroupPhoto,
        updateReminderSettings,
        registerPushSubscription,
        removePushSubscription,
        setCatHabitEnabled,
```

- [ ] **Step 4: Typecheck**

Run: `npm run check:fast`
Expected: Keine neuen Fehler.

- [ ] **Step 5: Commit**

```bash
git add src/context/AppDataContext.tsx
git commit -m "AppDataContext: Erinnerungseinstellungen und Push-Subscriptions"
```

---

### Task 5: Browser-Push-Helfer (`src/lib/pushNotifications.ts`, TDD für die reinen Teile)

**Files:**
- Create: `src/lib/pushNotifications.ts`
- Create: `src/lib/pushNotifications.test.ts`

**Interfaces:**
- Produces: `isPushSupported(): boolean`, `urlBase64ToUint8Array(base64: string): Uint8Array`, `getCurrentSubscription(): Promise<PushSubscription | null>`, `subscribeBrowser(vapidPublicKey: string): Promise<{ endpoint: string; p256dh: string; auth: string }>`, `unsubscribeBrowser(): Promise<void>` — konsumiert in Task 7 (`Settings.tsx`).

- [ ] **Step 1: Fehlschlagende Tests für die reinen Funktionen schreiben**

`src/lib/pushNotifications.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPushSupported, urlBase64ToUint8Array } from './pushNotifications'

describe('isPushSupported', () => {
  afterEach(() => {
    // @ts-expect-error — Testdoubles wieder entfernen
    delete window.PushManager
    // @ts-expect-error — Testdoubles wieder entfernen
    delete window.Notification
    // jsdom kennt navigator.serviceWorker von Haus aus nicht — Testdouble entfernen,
    // falls im jeweiligen Test gesetzt.
    // @ts-expect-error — Testdouble wieder entfernen
    delete navigator.serviceWorker
  })

  it('returns false when PushManager/Notification/serviceWorker are not present (e.g. iOS Safari < 16.4)', () => {
    expect(isPushSupported()).toBe(false)
  })

  it('returns true when serviceWorker, PushManager and Notification all exist', () => {
    // jsdom implementiert serviceWorker nicht selbst — per defineProperty nachbauen,
    // da navigator ein Read-only-Objekt ohne direkten Property-Assign ist.
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    // @ts-expect-error — Testdouble
    window.PushManager = vi.fn()
    // @ts-expect-error — Testdouble
    window.Notification = vi.fn()
    expect(isPushSupported()).toBe(true)
  })
})

describe('urlBase64ToUint8Array', () => {
  it('round-trips bytes through URL-safe base64 encoding and decoding', () => {
    const bytes = [0, 1, 2, 255, 128, 16]
    const standard = btoa(String.fromCharCode(...bytes))
    const urlSafe = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(Array.from(urlBase64ToUint8Array(urlSafe))).toEqual(bytes)
  })

  it('converts URL-safe characters (- and _) back to standard base64 correctly', () => {
    const bytes = [251, 239, 190] // ergibt Standard-Base64 mit + und /
    const standard = btoa(String.fromCharCode(...bytes))
    expect(standard).toMatch(/[+/]/)
    const urlSafe = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(Array.from(urlBase64ToUint8Array(urlSafe))).toEqual(bytes)
  })
})
```

- [ ] **Step 2: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run src/lib/pushNotifications.test.ts`
Expected: FAIL — `./pushNotifications` existiert noch nicht.

- [ ] **Step 3: Implementierung schreiben**

`src/lib/pushNotifications.ts`:

```ts
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
```

- [ ] **Step 4: Test ausführen, Erfolg bestätigen**

Run: `npx vitest run src/lib/pushNotifications.test.ts`
Expected: PASS (4 Tests)

- [ ] **Step 5: Gesamten Check-Lauf bestätigen**

Run: `npm run check:fast`
Expected: Keine neuen Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/lib/pushNotifications.ts src/lib/pushNotifications.test.ts
git commit -m "Browser-Push-Helfer mit Tests"
```

---

### Task 6: Service Worker — Push-Nachrichten anzeigen

**Files:**
- Modify: `public/sw.js`

**Interfaces:**
- Consumes: nichts aus dem App-Code (reiner Service-Worker-Kontext).
- Produces: zeigt Browser-Notifications für eingehende Push-Nachrichten; kein TS-Interface (separates Laufzeit-Skript, nicht Teil des `tsc -b`-Projekts, wie der Rest von `public/`).

- [ ] **Step 1: `push`- und `notificationclick`-Handler ergänzen**

Am Ende von `public/sw.js` (nach dem bestehenden `fetch`-Listener)
anfügen:

```js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'MyCatz', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
```

- [ ] **Step 2: Manueller Test (kein automatisierter Test möglich — Service Worker laufen nicht in Vitest/jsdom)**

Nach dem Deploy: In Chrome DevTools → Application → Service Workers →
"Push"-Button nutzen (sendet eine Test-Push-Nachricht ohne echten
Server), prüfen, dass eine Benachrichtigung mit dem Fallback-Titel
"MyCatz" erscheint und ein Klick darauf das Fenster öffnet/fokussiert.

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "Service Worker: Push-Benachrichtigungen anzeigen"
```

---

### Task 7: Settings-UI — Erinnerungen

**Files:**
- Modify: `src/screens/Settings.tsx`

**Interfaces:**
- Consumes: `reminderSettings`, `updateReminderSettings`, `registerPushSubscription`, `removePushSubscription` aus `useAppData()` (Task 3+4); `isPushSupported`, `getCurrentSubscription`, `subscribeBrowser`, `unsubscribeBrowser` aus `../lib/pushNotifications` (Task 5).
- Produces: nichts, das andere Tasks konsumieren (Blatt-UI).

- [ ] **Step 1: Imports ergänzen**

In `src/screens/Settings.tsx`, Zeile 1-6 ersetzen durch:

```tsx
import { useEffect, useState } from 'react'
import { X, Nfc, Bell } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { buildNfcShortcutUrl, isWebNfcSupported, scanNfcTag } from '../lib/nfc'
import {
  getCurrentSubscription,
  isPushSupported,
  subscribeBrowser,
  unsubscribeBrowser,
} from '../lib/pushNotifications'
import { supabase } from '../lib/supabase'
import type { FoodCategory, HabitCategory, HabitType } from '../types'
```

- [ ] **Step 2: Werte aus `useAppData()` ergänzen**

Im bestehenden Destructuring-Block von `useAppData()` (aktuell Zeile
31-50):

```tsx
  const {
    household,
    isOwner,
    habits,
    addHabit,
    deleteHabit,
    foodTypes,
    addFoodType,
    updateFoodTypePortion,
    deleteFoodType,
    nfcTags,
    addTag,
    deleteTag,
    invites,
    guestLinks,
    createInvite,
    cancelInvite,
    createGuestLink,
    revokeGuestLink,
  } = useAppData()
```

ersetzen durch:

```tsx
  const {
    household,
    isOwner,
    habits,
    addHabit,
    deleteHabit,
    foodTypes,
    addFoodType,
    updateFoodTypePortion,
    deleteFoodType,
    nfcTags,
    addTag,
    deleteTag,
    invites,
    guestLinks,
    createInvite,
    cancelInvite,
    createGuestLink,
    revokeGuestLink,
    reminderSettings,
    updateReminderSettings,
    registerPushSubscription,
    removePushSubscription,
  } = useAppData()
```

- [ ] **Step 3: Lokalen State und Handler ergänzen**

Nach der bestehenden Zeile `const [guestLinkLabel, setGuestLinkLabel] = useState('')`
(aktuell Zeile 69) einfügen:

```tsx
  const [deviceSubscribed, setDeviceSubscribed] = useState(false)
  const [devicePushBusy, setDevicePushBusy] = useState(false)
  const [reminderTimesInput, setReminderTimesInput] = useState(
    (reminderSettings?.times ?? ['08:00', '18:00']).join(', '),
  )
  const [reminderEnabledInput, setReminderEnabledInput] = useState(reminderSettings?.enabled ?? false)

  useEffect(() => {
    let cancelled = false
    getCurrentSubscription().then((sub) => {
      if (!cancelled) setDeviceSubscribed(sub !== null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setReminderTimesInput((reminderSettings?.times ?? ['08:00', '18:00']).join(', '))
    setReminderEnabledInput(reminderSettings?.enabled ?? false)
  }, [reminderSettings])

  async function handleToggleDevicePush() {
    setErrorMsg(null)
    setDevicePushBusy(true)
    try {
      if (deviceSubscribed) {
        const sub = await getCurrentSubscription()
        await unsubscribeBrowser()
        if (sub) await removePushSubscription(sub.endpoint)
        setDeviceSubscribed(false)
      } else {
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string
        const sub = await subscribeBrowser(vapidPublicKey)
        await registerPushSubscription(sub)
        setDeviceSubscribed(true)
      }
    } catch (err) {
      setErrorMsg(friendlyError(err))
    } finally {
      setDevicePushBusy(false)
    }
  }

  async function handleSaveReminderSettings() {
    setErrorMsg(null)
    const times = reminderTimesInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    try {
      await updateReminderSettings(reminderEnabledInput, times)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }
```

- [ ] **Step 4: UI-Abschnitt einfügen**

In `src/screens/Settings.tsx` nach dem bestehenden "Haushalt"-Abschnitt
(aktuell Zeile 233-238, endet mit `</section>}` vor der Zeile
`<section className="flex flex-col gap-3">` für "Habits verwalten")
einfügen:

```tsx
      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
          Erinnerungen
        </h3>

        <div className="glass flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <Bell size={18} strokeWidth={1.75} className="text-text-secondary" />
            <span className="text-text-primary">Push auf diesem Gerät</span>
          </div>
          {isPushSupported() ? (
            <button
              type="button"
              onClick={handleToggleDevicePush}
              disabled={devicePushBusy}
              className={`min-h-[40px] px-4 rounded-control disabled:opacity-60 ${
                deviceSubscribed
                  ? 'bg-input text-text-primary'
                  : 'bg-apricot text-text-on-color'
              }`}
            >
              {deviceSubscribed ? 'Deaktivieren' : 'Aktivieren'}
            </button>
          ) : (
            <span className="text-[13px] text-text-secondary">Nicht unterstützt</span>
          )}
        </div>

        {isOwner && (
          <div className="glass p-3 flex flex-col gap-3">
            <label className="flex items-center justify-between min-h-[40px]">
              <span className="text-text-primary">Haushalts-Erinnerung aktiv</span>
              <input
                type="checkbox"
                checked={reminderEnabledInput}
                onChange={(e) => setReminderEnabledInput(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <input
              type="text"
              value={reminderTimesInput}
              onChange={(e) => setReminderTimesInput(e.target.value)}
              placeholder="Uhrzeiten, mit Komma getrennt (z. B. 08:00, 18:00)"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            <button
              type="button"
              onClick={handleSaveReminderSettings}
              className="min-h-[44px] rounded-control bg-apricot text-text-on-color"
            >
              Erinnerungen speichern
            </button>
          </div>
        )}
      </section>

```

- [ ] **Step 5: Typecheck**

Run: `npm run check:fast`
Expected: Keine neuen Fehler.

- [ ] **Step 6: Manueller Test**

`npm run dev`, Settings-Screen öffnen, "Aktivieren" klicken (Browser
fragt nach Erlaubnis), Status wechselt zu "Deaktivieren". Als Owner
Uhrzeiten ändern und speichern, Seite neu laden, Werte bleiben erhalten.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Settings.tsx
git commit -m "Settings: Erinnerungen-Abschnitt (Push-Gerät + Haushaltszeiten)"
```

---

### Task 8: Vercel-Funktion `api/send-reminders.ts`

**Files:**
- Modify: `tsconfig.api.json`
- Modify: `package.json` (über `npm install`, s. Step 1)
- Create: `api/send-reminders.ts`
- Create: `api/send-reminders.test.ts`

**Interfaces:**
- Consumes: `getDueTimes`, `shouldSendReminder`, `berlinDateString` aus `./_lib/reminderLogic` (Task 2).
- Produces: HTTP-Endpoint `POST /api/send-reminders` (von `pg_net` aus Task 1 aufgerufen).

- [ ] **Step 1: Dependencies installieren**

```bash
npm install web-push
npm install -D @types/web-push @types/node @vercel/node
```

- [ ] **Step 2: `tsconfig.api.json` um Node-Typen erweitern**

In `tsconfig.api.json` (aus Task 2) die `compilerOptions` um `"types"`
ergänzen:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["api"]
}
```

- [ ] **Step 3: Fehlschlagenden Test für die Versand-Entscheidung schreiben**

`api/send-reminders.test.ts` testet die Kernlogik der Funktion
(welche Haushalte werden benachrichtigt) mit einem Fake-Supabase-Client
und einer Fake-`sendPush`-Funktion, ohne echtes Netzwerk:

```ts
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
```

- [ ] **Step 4: Test ausführen, Fehlschlag bestätigen**

Run: `npx vitest run api/send-reminders.test.ts`
Expected: FAIL — `./send-reminders` exportiert noch kein `resolveReminders`.

- [ ] **Step 5: Implementierung schreiben**

`api/send-reminders.ts`:

```ts
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
```

- [ ] **Step 6: Test ausführen, Erfolg bestätigen**

Run: `npx vitest run api/send-reminders.test.ts`
Expected: PASS (5 Tests)

- [ ] **Step 7: Gesamten Check-Lauf bestätigen**

Run: `npm run check:task`
Expected: Alle Tests grün, keine neuen Typ-/Lint-Fehler, Coverage sinkt
nicht unter den in `CONSTRAINTS.md` festgehaltenen Stand (neue reine
Logik ist jetzt sogar getestet, sollte den Wert eher leicht anheben).

- [ ] **Step 8: `CONSTRAINTS.md` Bundle-Ratchet prüfen**

`api/` wird von Vite nicht ins Client-Bundle gebündelt (Vercel baut
Serverless Functions separat), daher keine Änderung an der
Bundle-Größen-Zeile in `CONSTRAINTS.md` erwartet. Zur Sicherheit:

Run: `npm run build`
Erwartet: Gzip-Größe unverändert gegenüber dem zuletzt in
`CONSTRAINTS.md` festgehaltenen Wert (~254 kB). Falls doch gestiegen,
`CONSTRAINTS.md` analog zu den bisherigen Einträgen aktualisieren.

- [ ] **Step 9: Commit**

```bash
git add tsconfig.api.json api/send-reminders.ts api/send-reminders.test.ts package.json package-lock.json
git commit -m "Vercel-Funktion: Fütterungs-Erinnerungen versenden"
```

- [ ] **Step 10: Manuelle Schritte für den Nutzer dokumentieren**

Diese Schritte kann der Agent nicht selbst ausführen (Secrets, externes
Dashboard) — nach Abschluss des Plans dem Nutzer mitteilen:

1. VAPID-Schlüsselpaar generieren: `npx web-push generate-vapid-keys`.
2. In Vercel-Projekteinstellungen (Environment Variables) eintragen:
   `VITE_VAPID_PUBLIC_KEY` (Public Key, auch in `.env.local` lokal),
   `VAPID_PRIVATE_KEY` (Private Key, **nur** Vercel, nicht `VITE_`-
   Prefix), `VAPID_SUBJECT` (z. B. `mailto:deine@email.de`),
   `SUPABASE_SERVICE_ROLE_KEY` (aus Supabase-Projekteinstellungen →
   API, **niemals** mit `VITE_`-Prefix), `CRON_SECRET` (selbst
   gewählter Zufallswert, z. B. `openssl rand -hex 32`).
3. In `supabase/migrations/008_push_notifications.sql` vor dem
   Ausführen `<VERCEL_DOMAIN>` durch die echte Vercel-Domain und
   `<CRON_SECRET>` durch denselben Wert wie in Schritt 2 ersetzen.
4. Nach dem Deploy: Migration im Supabase-SQL-Editor ausführen (wie
   bisher).
5. In den App-Settings das eigene Gerät für Push aktivieren und als
   Owner die Haushalts-Erinnerung einschalten.

---

## Abschluss

Nach Task 8 ist das Feature vollständig implementiert und automatisiert
getestet (Zeitfenster-Logik, Versand-Entscheidung). Der tatsächliche
Push-Empfang auf einem echten Gerät bleibt ein manueller Test (s. Task
6, Step 2), da Service Worker und Push-Zustellung nicht sinnvoll in CI
simulierbar sind.
