-- Habits "entfernen" = archivieren.
-- Ein echtes DELETE auf habit_definitions scheitert, sobald es Einträge in habit_logs
-- gibt (Fremdschlüssel ohne ON DELETE). Statt die Tagebuch-Historie mitzulöschen,
-- wird der Habit nur ausgeblendet. Die App filtert archived = true heraus.
-- Das Archivieren läuft über die bestehende UPDATE-Policy (nur Owner).

ALTER TABLE habit_definitions
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
