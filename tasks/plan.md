# Implementation Plan: Liquid-Glass-Dashboard-Umbau

## Overview

Umbau des MyCatz-Designsystems von Flat-Design auf Apple-Liquid-Glass
(Blur/Transparenz, warmer Verlaufshintergrund, Lucide-Icons statt Emoji)
plus Umbau des Home-Screens zu einem Dashboard-Layout. Details, Farbwerte,
Layout-Regeln und Icon-Mapping-Tabelle stehen in der freigegebenen Spec:
`docs/superpowers/specs/2026-09-21-liquid-glass-dashboard-design.md`.

Rollout screen-by-screen, damit die App nach jedem Schritt lauffähig
bleibt: Tokens/Basiskomponente → Home → Stats → restliche Screens
(Settings, Profile, Onboarding, Overlays) → CLAUDE.md-Migration.

## Architecture Decisions

Siehe Spec-Dokument (Abschnitt "Architecture Decisions" und "Design
System"). Kurzfassung:
- `.glass`-CSS-Utility + `GlassCard`-Komponente als einzige Quelle des
  Glass-Looks
- Fester Verlaufshintergrund als neue Tokens in `tokens.css`
- `lucide-react` (neu, vom Nutzer freigegeben) statt Emoji-Strings, feste
  Mapping-Tabelle in `src/lib/habitIcons.ts`
- Grids nur für Daily-Habit-Kacheln, sonst einspaltig
- Bestehende Interaktionslogik (Habit-Typen, RLS-Rollen, Realtime,
  Gruppenlogik) bleibt unangetastet — nur die visuelle Hülle ändert sich

## Task List

### Phase 1: Fundament

- [x] Task 1: `lucide-react` installieren, Design-Tokens + `.glass`-Utility + `GlassCard`-Komponente anlegen
- [x] Task 2: `habitIcons.ts` Mapping-Modul + Unit-Tests

### Checkpoint: Fundament
- [x] `npm run check:task` grün
- [x] `GlassCard` manuell verifiziert (Blur sichtbar, kein Crash) — über Task 3 im Browser bestätigt

### Phase 2: Home-Dashboard

- [x] Task 3: Shell/Header/BottomNav/DayStrip auf Glass + Verlaufshintergrund umstellen
- [x] Task 4: `HabitItem`/`HabitList` zu ausklappbarer Glass-Liste umgebaut (Interaktionslogik erhalten, Design auf Nutzerwunsch angepasst)
- [x] Task 5: Home-Screen-Layout: Hero-Ring-Card, Wochentrend-Kachel, Multi-Katzen-Kachel

### Checkpoint: Home fertig
- [x] `npm run check:task` grün
- [x] Manueller Durchklick vom Nutzer bestätigt
- [x] **Review mit Nutzer** vor Weiterarbeit an Stats — erledigt

### Phase 3: Stats-Screen

- [x] Task 6: `insights.ts` (Wochen-Insight-Berechnung) + Unit-Tests
- [x] Task 7: Stats-Screen auf Glass/einspaltiges Layout umstellen, Wochen-Insight-Text einbauen
- [x] Task 8: Gesundheits-Heatmap-Komponente + Einbindung in Stats

### Checkpoint: Stats fertig
- [x] `npm run check:task` grün
- [x] Manueller Check vom Nutzer bestätigt

### Phase 4: Restliche Screens

- [x] Task 9: Settings + Profile auf Glass-Look umstellen
- [x] Task 10: Onboarding-Wizard (4 Schritte) auf Glass-Look umstellen
- [x] Task 11: `MonthOverlay`, `BottomSheet`, `FeedingQuickAdd` auf Glass-Look umstellen
- [ ] Task 12: Alte Flat-Tokens aus `tokens.css` entfernen, `CLAUDE.md`-Designsystem-Abschnitt durch Spec-Inhalt ersetzen

### Checkpoint: Fertig
- [ ] `npm run check:task` grün, Bundle-Größe gegen `CONSTRAINTS.md`-Ratchet geprüft
- [ ] Kompletter Durchklick aller Screens auf einem echten Gerät (iOS Safari + Android Chrome)
- [ ] CLAUDE.md aktualisiert und committed

## Risks and Mitigations

Siehe Spec-Dokument, Abschnitt "Risks and Mitigations" — insbesondere
Bundle-Größe (Ratchet), Kontrast auf Glass, `backdrop-filter`-Performance
auf älteren Android-Geräten.

## Open Questions

Keine — durch Brainstorming/Spec-Freigabe geklärt.
