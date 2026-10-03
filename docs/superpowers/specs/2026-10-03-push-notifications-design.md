# Design: Push-Benachrichtigungen (Fütterungs-Erinnerung)

Status: Entwurf zur Nutzerfreigabe
Datum: 2026-10-03

## Overview

MyCatz bekommt Web-Push-Erinnerungen: Wenn an einem Tag bis zu einer
festgelegten Uhrzeit noch keine Fütterung für den Haushalt geloggt wurde,
bekommen alle Haushaltsmitglieder, die Push auf ihrem Gerät aktiviert
haben, eine Benachrichtigung. Das ist die wichtigste fehlende Funktion
für den täglichen Nutzen der App (siehe Gespräch vom 2026-10-03).

**Bewusst außerhalb des Scopes (YAGNI für v1):**
- Erinnerungen für Spielzeit oder Habits (nur Futter, s.u.)
- Individuelle Zeiten pro Katze/Habit (nur feste Zeiten pro Haushalt)
- Mehrzeitzonen-Unterstützung (feste Annahme: Europe/Berlin)
- In-App-Hinweisbanner für Nutzer:innen ohne Home-Screen-Installation
  (die App ist laut `CLAUDE.md` ohnehin für Home-Screen-Nutzung
  konzipiert; iOS-Push funktioniert nur im installierten PWA-Modus ab
  iOS 16.4 — das ist eine akzeptierte Voraussetzung, keine Lücke, die
  dieses Feature schließen muss)

## Architecture Decisions

- **Trigger via Supabase `pg_cron` + `pg_net`, nicht Vercel Cron.** Vercel
  Hobby-Plan erlaubt Cron-Jobs nur 1×/Tag — bei zwei Erinnerungszeiten
  (morgens/abends) reicht das nicht. `pg_cron` läuft minutengenau und
  kostenlos auf jedem Supabase-Tier. Der Cron-Job ruft per `pg_net` eine
  Vercel-Serverless-Function auf, die die eigentliche Versandlogik und
  den `web-push`-Versand übernimmt (Node/TS statt Deno-Edge-Function —
  passt zum Rest des Stacks, keine neue Laufzeit zu lernen).
- **Alles bleibt im etablierten Zwei-Wege-Deploy-Muster.** Migration als
  SQL zum Einfügen ins Supabase-Dashboard (wie bisher 7×), Server-Code
  als normaler Git-Push zu Vercel. Keine neue CLI (kein `supabase`-CLI,
  kein manuelles Edge-Function-Deployment) nötig.
- **Wer empfängt, wird rein über Subscription-Existenz gesteuert**, nicht
  über eine separate Opt-in-Tabelle. `household_reminder_settings` legt
  nur fest, *ob* und *wann* der Haushalt überhaupt erinnert wird; *wer*
  benachrichtigt wird, ergibt sich daraus, wer eine aktive
  `push_subscriptions`-Zeile hat (= hat auf seinem Gerät zugestimmt).
  Eine Person kann jederzeit selbst de-/abonnieren, ohne dass der Owner
  etwas ändern muss.
- **`reminder_sends` als Versand-Protokoll mit Unique-Constraint** statt
  reiner Zeitprüfung. Der Cron-Job läuft alle 5 Minuten; ohne Protokoll
  könnte ein Haushalt im selben Zeitfenster mehrfach benachrichtigt
  werden (z. B. bei überlappenden Funktionsaufrufen). `INSERT ... ON
  CONFLICT DO NOTHING` auf `(household_id, date, time_slot)` macht das
  "Beanspruchen" eines Zeitslots atomar.
- **Prüfung "schon gefüttert?" nutzt die bestehende `feeding_logs`-Tabelle
  direkt** (kein neues Aggregat), analog zu `foodCurrentG` im
  Home-Screen: Gibt es für irgendeine Katze des Haushalts einen
  `feeding_logs`-Eintrag mit `date = heute`, gilt der Haushalt als
  "gefüttert" und die Erinnerung entfällt für diesen Tag (nicht nur für
  den einzelnen Slot).
- **VAPID-Schlüsselpaar**: Public Key als `VITE_VAPID_PUBLIC_KEY` (Client,
  unkritisch), Private Key als `VAPID_PRIVATE_KEY` auf Vercel (Server-only,
  kein `VITE_`-Prefix). Der Nutzer muss das Schlüsselpaar einmalig
  generieren (`web-push generate-vapid-keys` oder gleichwertig) und in
  Vercel/`.env.local` eintragen — wird im Implementierungsplan als
  manueller Schritt markiert.

## Datenmodell (Migration `008_push_notifications.sql`)

```sql
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
CREATE POLICY "push_subscriptions_own_delete" ON push_subscriptions
  FOR DELETE USING (profile_id = auth.uid());

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
CREATE POLICY "reminder_settings_upsert" ON household_reminder_settings
  FOR INSERT WITH CHECK (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "reminder_settings_update" ON household_reminder_settings
  FOR UPDATE USING (household_id = my_household_id() AND my_role() = 'owner');

-- Verhindert Doppel-Versand innerhalb desselben Zeitslots/Tages.
CREATE TABLE reminder_sends (
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (household_id, date, time_slot)
);
-- Kein RLS nötig: wird ausschließlich vom Server (Service-Role-Key) beschrieben/gelesen.

-- pg_cron + pg_net aktivieren und Job registrieren (alle 5 Minuten).
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

`<VERCEL_DOMAIN>` und `<CRON_SECRET>` werden beim Umsetzen durch die
echten Werte ersetzt (Secret wird vom Nutzer generiert, s. u.).

## Client

### `src/lib/pushNotifications.ts` (neu)

```ts
export async function isPushSupported(): boolean
export async function getSubscriptionState(): Promise<'unsupported'|'denied'|'subscribed'|'unsubscribed'>
export async function subscribeToPush(profileId: string, householdId: string): Promise<void>
export async function unsubscribeFromPush(): Promise<void>
```

- `subscribeToPush` fragt `Notification.requestPermission()` an, holt
  `navigator.serviceWorker.ready`, ruft `pushManager.subscribe({
  userVisibleOnly: true, applicationServerKey: <public key> })` auf und
  speichert `endpoint`/`p256dh`/`auth` per Upsert (Konflikt auf
  `endpoint`) in `push_subscriptions`.
- `unsubscribeFromPush` ruft `subscription.unsubscribe()` im Browser und
  löscht die zugehörige Zeile serverseitig.

### Service Worker (`public/sw.js`, ergänzt)

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
  event.waitUntil(clients.openWindow('/'))
})
```

### Settings-UI (neuer Abschnitt in `Settings.tsx`)

- **Für alle Mitglieder:** Umschalter "Push-Benachrichtigungen auf diesem
  Gerät" (ruft `subscribeToPush`/`unsubscribeFromPush`), zeigt den
  aktuellen Browser-Status (nicht unterstützt / blockiert / aktiv / aus).
- **Nur für Owner:** An/Aus für den Haushalt + Eingabefelder für die
  Erinnerungszeiten (Liste, mind. 1 Uhrzeit). Neue Context-Funktion
  `updateReminderSettings(enabled, times)` in `AppDataContext`.

## Server: `api/send-reminders.ts` (neu, Vercel Serverless Function)

```
1. Header `x-cron-secret` gegen Env-Var `CRON_SECRET` prüfen, sonst 401.
2. Supabase-Client mit Service-Role-Key (Env-Var `SUPABASE_SERVICE_ROLE_KEY`,
   umgeht RLS) aufbauen.
3. Aktuelle Zeit in Europe/Berlin auf 5-Minuten-Fenster runden.
4. household_reminder_settings laden, wo enabled = true und `times`
   einen Wert im aktuellen Fenster enthält (reine Logik dafür in
   api/_lib/reminderLogic.ts ausgelagert und unit-getestet).
5. Für jeden fälligen Haushalt:
   a. reminder_sends INSERT ... ON CONFLICT DO NOTHING für
      (household_id, heute, slot) — bei Konflikt (schon verschickt):
      überspringen.
   b. feeding_logs prüfen (irgendeine Katze des Haushalts, date = heute)
      — falls vorhanden: überspringen (schon gefüttert).
   c. push_subscriptions des Haushalts laden, für jede per `web-push`
      senden ("Hat {Katzennamen} heute schon Futter bekommen?").
   d. Bei Sendefehler mit Status 410 (Gone): Subscription-Zeile löschen.
6. 200 mit kurzer Zusammenfassung (Anzahl benachrichtigter Haushalte)
   zurückgeben.
```

Neue Dependency: `web-push` (npm, nur in `api/`, landet nicht im
Client-Bundle).

## Fehlerbehandlung

| Fall | Verhalten |
|---|---|
| Falsches/fehlendes `x-cron-secret` | 401, kein Datenbankzugriff |
| Haushalt hat bereits gefüttert | Slot wird als "verschickt" markiert (verhindert erneute Prüfung), aber keine Push gesendet |
| Subscription abgelaufen (410) | Zeile wird gelöscht, andere Empfänger:innen werden trotzdem beliefert |
| `web-push`-Versand schlägt anders fehl | Fehler wird geloggt (Vercel Function Logs), restliche Haushalte werden trotzdem abgearbeitet |
| Keine fälligen Haushalte | 200, leere Zusammenfassung |

## Testing

- **Unit-Tests** (Vitest) für `api/_lib/reminderLogic.ts`: Zeitfenster-
  Zuordnung (exakter Treffer, kurz davor/danach, mehrere Zeiten pro
  Haushalt, kein Treffer).
- **Manueller Test** für den tatsächlichen Versand (Push lässt sich in CI
  nicht sinnvoll automatisieren): lokal `curl` mit korrektem
  `x-cron-secret` gegen die deployte Function, mit einem Test-Haushalt
  ohne heutigen Futter-Log, Browser-Push-Empfang prüfen.
- Bestehende Suite (`npm run check:task`) bleibt grün; keine Änderung an
  bestehender Logik außerhalb der neuen Dateien.

## Migrationshinweis für Nutzer:in (manuelle Schritte)

1. VAPID-Schlüsselpaar generieren (wird im Implementierungsplan konkret
   angeleitet) und als Env-Vars eintragen (`VITE_VAPID_PUBLIC_KEY` lokal
   + Vercel, `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` nur auf Vercel).
2. Zufälligen `CRON_SECRET`-Wert festlegen, auf Vercel eintragen und in
   die Migrations-SQL einsetzen.
3. Migration `008_push_notifications.sql` im Supabase SQL-Editor
   ausführen (wie bisher).
4. Nach Deploy: eigenes Gerät in den Settings für Push anmelden, Owner
   aktiviert Haushalts-Erinnerungen.
