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
-- vom Server (Service-Role-Key, umgeht RLS grundsätzlich) beschrieben/gelesen.
-- RLS trotzdem aktiviert und bewusst ohne Policies gelassen: das ist die von Supabase
-- empfohlene deny-by-default-Haltung (kein stilles Freischalten durch einen späteren,
-- unbedacht breiten GRANT in einer zukünftigen Migration), nicht nur das Fehlen eines
-- GRANTs auf 'authenticated'.
CREATE TABLE reminder_sends (
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_slot TIME NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (household_id, date, time_slot)
);

ALTER TABLE reminder_sends ENABLE ROW LEVEL SECURITY;

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
