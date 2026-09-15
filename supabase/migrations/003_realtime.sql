-- Realtime-Updates für die Log-Tabellen aktivieren (Cross-Device-Sync, siehe CLAUDE.md "Realtime")
ALTER PUBLICATION supabase_realtime ADD TABLE feeding_logs, play_logs, habit_logs, notes;
