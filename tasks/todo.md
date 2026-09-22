# Todo: Liquid-Glass-Dashboard-Umbau

Siehe `tasks/plan.md` für Überblick und `docs/superpowers/specs/2026-09-21-liquid-glass-dashboard-design.md`
für alle Design-Details (Farbwerte, Layout-Regeln, Icon-Mapping-Tabelle).

## Phase 1: Fundament

### Task 1: `lucide-react` installieren, Tokens + `.glass`-Utility + `GlassCard`

**Description:** Neue Dependency installieren, neue CSS-Tokens für den
Verlaufshintergrund und das Glass-Preset in `tokens.css`/`global.css`
ergänzen (alte Flat-Tokens bleiben vorerst bestehen, siehe Task 12), und
eine wiederverwendbare `GlassCard`-Komponente als einzige Quelle des
Glass-Looks anlegen.

**Acceptance criteria:**
- [x] `lucide-react` ist in `package.json` als Dependency gelistet
- [x] `tokens.css` enthält die Verlaufshintergrund-Variable und Glass-Werte (Blur, Rand, Schatten) laut Spec
- [x] `src/components/shared/GlassCard.tsx` existiert, rendert einen Container mit dem `.glass`-Preset, akzeptiert `className`/`children` wie ein normaler Wrapper
- [x] Body-Hintergrund (`global.css`) nutzt den neuen Verlauf statt `var(--bg-page)`

**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Types/Lint: `npm run check:fast`
- [x] Manual check: sichtbar über Task 3 (Verlauf + Glass live im Browser bestätigt)

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `src/styles/tokens.css`
- `src/styles/global.css`
- `src/components/shared/GlassCard.tsx` (neu)

**Estimated scope:** S

---

### Task 2: `habitIcons.ts` Mapping-Modul + Tests

**Description:** Lookup-Modul, das einen Habit-Namen auf eine
Lucide-Icon-Komponente abbildet (Tabelle aus der Spec), mit Fallback-Icon
für unbekannte/benutzerdefinierte Habits. Reine Funktion, TDD-geeignet.

**Acceptance criteria:**
- [x] `resolveHabitIcon(name: string)` gibt für alle 14 Default-Habits aus der Spec-Tabelle das korrekte Lucide-Icon zurück
- [x] Unbekannter Name (z. B. benutzerdefinierter Habit) liefert das Fallback-Icon (`CircleHelp`), keine Exception
- [x] Matching ist whitespace-/case-tolerant (trim + lowercase-Vergleich)

**Verification:**
- [x] Tests pass: `npm run test`
- [x] Types/Lint: `npm run check:fast`

**Dependencies:** Task 1 (lucide-react muss installiert sein)

**Files likely touched:**
- `src/lib/habitIcons.ts` (neu)
- `src/lib/habitIcons.test.ts` (neu)

**Estimated scope:** S

---

## Checkpoint: Fundament

- [x] `npm run check:task` läuft grün durch
- [x] `GlassCard` ist im Browser einmal sichtbar verifiziert (kein `backdrop-filter`-Rendering-Fehler, keine Konsolenfehler)

---

## Phase 2: Home-Dashboard

### Task 3: Shell/Header/BottomNav/DayStrip auf Glass umstellen

**Description:** Die App-weiten Rahmenkomponenten bekommen den neuen Look:
Seitenhintergrund (Verlauf statt Flat), BottomNav und Header als
Glass-Leisten, DayStrip als Glass-Container mit Icons statt reinem Text
wo sinnvoll. Icons für die BottomNav (Home/Stats/Add/Profil/Settings)
werden auf Lucide umgestellt.

**Acceptance criteria:**
- [x] `Shell.tsx` nutzt den neuen Verlaufshintergrund
- [x] `BottomNav.tsx` ist eine Glass-Leiste mit Lucide-Icons statt bisherigem Styling
- [x] `Header.tsx` nutzt Glass-Preset
- [x] `DayStrip.tsx` nutzt Glass-Preset, aktiver Tag weiterhin klar erkennbar (Apricot-Akzent)
- [x] Touch-Targets bleiben ≥44×44px (bestehende Regel aus CLAUDE.md)

**Verification:**
- [x] Types/Lint: `npm run check:fast`
- [x] Manual check: vom Nutzer im Browser bestätigt ("sieht gut aus")

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/layout/Shell.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/Header.tsx`
- `src/components/calendar/DayStrip.tsx`

**Estimated scope:** M

---

### Task 4: `HabitItem`/`HabitList` zu ausklappbarer Glass-Liste umbauen

**Description:** Abweichend vom ursprünglichen Kachel-Grid-Mockup (Nutzer-Feedback:
"eher eine Listenansicht, aber ausklappbar"): Habits bleiben eine
einspaltige Liste in einer `GlassCard`, jede Zeile zeigt Icon + Name +
rechtsbündig den aktuellen Wert. Tap auf die Zeile klappt sie auf und
zeigt die passenden Controls (Ja/Nein-Buttons, Zahl-Eingabe, Dropdown)
plus Notizfeld. `HabitItem` nutzt `habitIcons.ts` statt `habit.emoji`.

**Acceptance criteria:**
- [x] Habits werden als einspaltige Liste in einer `GlassCard` gerendert (Icon + Name + Wert rechts)
- [x] Zeile ist ausklappbar (Tap togglet `open`), Chevron-Icon zeigt Zustand an
- [x] `boolean`-Typ: aufgeklappt zeigt Ja/Nein-Buttons, Zustand farblich erkennbar (Sage/Muted-Red)
- [x] `count`-Typ: aufgeklappt zeigt Zahl-Eingabe + "Speichern" + "Keine" (ersetzt altes 👎), aktuelle Zahl in der Kopfzeile sichtbar
- [x] `select`-Typ: aufgeklappt zeigt Dropdown, gewählte Option in der Kopfzeile sichtbar
- [x] Notizfeld immer im aufgeklappten Bereich verfügbar (Speichern/Lesen von `note`), Stift-Icon in der Kopfzeile zeigt an, ob eine Notiz existiert
- [x] `mixed`-Zustand (Gruppen-Habit mit unterschiedlichen Werten pro Katze) bleibt sichtbar ("(gemischt)"-Label)

**Verification:**
- [x] Tests pass: `npm run test` (bestehende Tests unverändert grün, `habitIcons` bereits getestet)
- [x] Types/Lint: `npm run check:fast`
- [x] Manual check: vom Nutzer im Browser bestätigt ("perfekt")

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `src/components/habits/HabitItem.tsx`
- `src/components/habits/HabitList.tsx`

**Estimated scope:** L (kritischste Task — bestehende Interaktionslogik muss 1:1 erhalten bleiben, nur Darstellung ändert sich)

**⚠️ Achtung:** Das ist die Task mit dem höchsten Regressions-Risiko der ganzen Umbau-Phase (siehe Risk-Tabelle in der Spec). Vor dem Umbau kurz den aktuellen Funktionsumfang aller 3 Habit-Typen manuell nachvollziehen, danach 1:1 gegenprüfen.

---

### Task 5: Home-Screen-Layout: Hero-Ring-Card, Wochentrend-Kachel, Multi-Katzen-Kachel

**Description:** `Home.tsx` bekommt das finale Dashboard-Layout laut
Spec/Mockup: `FitnessRings` in einer Glass-Hero-Card, neue Wochentrend-
Kachel (Sparkline der letzten 7 Tage `feeding_logs`) und neue
Multi-Katzen-Kachel (nur sichtbar bei >1 Katze im Haushalt, Mini-Ring pro
Katze, Tap wechselt aktive Katze/Gruppe über den bestehenden
Auswahl-Mechanismus).

**Acceptance criteria:**
- [x] `FitnessRings` steckt in einer `GlassCard`, Ring-Logik/-Werte unverändert
- [x] Neue Wochentrend-Kachel zeigt Sparkline aus den letzten 7 Tagen Futter-Logs der aktuell ausgewählten Katze/Gruppe, volle Breite
- [x] Neue Multi-Katzen-Kachel: pro Katze im Haushalt ein Mini-Ring + Prozentwert, volle Breite, nur gerendert wenn `cats.length > 1`
- [x] Tap auf eine Katze in der Multi-Katzen-Kachel wechselt die aktive Auswahl (nutzt denselben Mechanismus wie `Profile.tsx`)
- [x] Bestehende Elemente (NFC-Scan-Button, Tages-Log-Liste mit Lösch-Buttons, "Zurück zu Heute"-Badge, Gruppen-Tipp-Text) bleiben funktional erhalten, nur im neuen Look

**Verification:**
- [x] Tests pass: `npm run test`
- [x] Types/Lint: `npm run check:fast`
- [x] Manual check: vom Nutzer im Browser bestätigt ("passt")

**Dependencies:** Task 3, Task 4

**Files likely touched:**
- `src/screens/Home.tsx`
- `src/components/rings/FitnessRings.tsx`
- `src/components/shared/WeekTrendTile.tsx` (neu)
- `src/components/shared/MultiCatTile.tsx` (neu)

**Estimated scope:** M

---

## Checkpoint: Home fertig

- [x] `npm run check:task` läuft grün durch
- [x] Manueller Durchklick vom Nutzer bestätigt
- [x] **Review mit Nutzer** — bestätigt ("passt, mach weiter")

---

## Phase 3: Stats-Screen

### Task 6: `insights.ts` Wochen-Insight-Berechnung + Tests

**Description:** Reine Berechnungsfunktion nach dem Muster von
`streaks.ts`: vergleicht Summe `play_logs.duration_min` der aktuellen
7-Tage-Periode mit der vorherigen 7-Tage-Periode, gibt Prozent-Delta
zurück oder `null` bei fehlenden Vorwochen-Daten (kein Divide-by-Zero-Text).

**Acceptance criteria:**
- [x] Funktion gibt korrektes Prozent-Delta für einen Beispieldatensatz zurück (Anstieg, Rückgang, gleich)
- [x] Vorwoche = 0 Minuten → Rückgabe `null` statt `Infinity`/`NaN`
- [x] Beide Wochen = 0 Minuten → Rückgabe `null` (keine sinnvolle Aussage möglich)

**Verification:**
- [x] Tests pass: `npm run test`
- [x] Types/Lint: `npm run check:fast`

**Dependencies:** None (parallel zu Phase 2 startbar, aber sinnvollerweise nach Checkpoint "Home fertig")

**Files likely touched:**
- `src/lib/insights.ts` (neu)
- `src/lib/insights.test.ts` (neu)

**Estimated scope:** S

---

### Task 7: Stats-Screen auf Glass/einspaltiges Layout + Insight-Text

**Description:** Bestehende Stats-Inhalte (Charts, Streaks, Gewicht,
Events) bekommen Glass-Cards und einspaltiges Layout. Neuer Insight-Text
oberhalb der Charts, gespeist aus `insights.ts` + den bereits von
`useStats` geladenen Play-Logs.

**Acceptance criteria:**
- [x] Alle bestehenden Stats-Kacheln (Futter-/Spielzeit-Charts, Streak-Liste, Gewichtsverlauf, Gesundheits-Events) nutzen `GlassCard`
- [x] Layout ist einspaltig (keine Nebeneinander-Anordnung außer bestehende Tab-Leiste Woche/Monat/Jahr)
- [x] Insight-Text erscheint oberhalb der Charts, wenn `insights.ts` einen Wert liefert
- [x] Insight-Text ist ausgeblendet (kein Platzhalter-Text), wenn `insights.ts` `null` liefert

**Verification:**
- [x] Tests pass: `npm run test`
- [x] Types/Lint: `npm run check:fast`
- [x] Manual check: vom Nutzer im Browser bestätigt ("passt")

**Dependencies:** Task 6, Checkpoint "Home fertig"

**Files likely touched:**
- `src/screens/Stats.tsx`
- `src/hooks/useStats.ts`

**Estimated scope:** M

---

### Task 8: Gesundheits-Heatmap-Komponente + Einbindung

**Description:** Kompaktes Mini-Kalendergitter (kein Vollbild-Overlay wie
`MonthOverlay`) mit Punktdichte pro Tag, basierend auf `habit_logs` mit
`category = 'health'`. Ergänzt die bestehende Text-Liste der
Gesundheits-Events im Stats-Screen.

**Acceptance criteria:**
- [x] Neue Komponente zeigt ein kompaktes Raster (7 Spalten, bis zu 35 Tage) mit Sättigungs-Kodierung nach Anzahl Health-Events an dem Tag
- [x] Tage ohne Health-Events sind neutral (`--bg-input`) dargestellt, keine Fehlinterpretation als "0 = negativ"
- [x] In den Stats-Screen eingebunden, ersetzt die bestehende Event-Liste nicht, sondern ergänzt sie

**Verification:**
- [x] Tests pass: `npm run test`
- [x] Types/Lint: `npm run check:fast`
- [x] Manual check: vom Nutzer im Browser bestätigt ("passt")

**Dependencies:** Task 7

**Files likely touched:**
- `src/components/shared/HealthHeatmap.tsx` (neu)
- `src/screens/Stats.tsx`

**Estimated scope:** M

---

## Checkpoint: Stats fertig

- [x] `npm run check:task` läuft grün durch
- [x] Manueller Check vom Nutzer bestätigt ("passt")

---

## Phase 4: Restliche Screens

### Task 9: Settings + Profile auf Glass-Look umstellen

**Description:** Rollenabhängige UI (Owner/Member/Guest), Mitglieder-
Einladung, Gast-Link-Verwaltung, NFC-Tag-Verwaltung, Katzen-/Gruppen-Auswahl
bekommen den Glass-Look. Keine funktionale Änderung an RLS-Gating oder
Formularen.

**Acceptance criteria:**
- [x] `Settings.tsx` nutzt den `.glass`-Look für alle Abschnitte, Owner-only-Gating unverändert
- [x] `Profile.tsx` nutzt `GlassCard`, Katzen-/Gruppen-Umschaltung funktioniert unverändert
- [x] Icons (✕, 📶, 👥, ✓) auf Lucide umgestellt wo bisher Emoji verwendet wurde

**Verification:**
- [x] Types/Lint: `npm run check:fast`
- [x] Manual check: vom Nutzer im Browser bestätigt ("sieht gut aus")

**Dependencies:** Checkpoint "Stats fertig"

**Files likely touched:**
- `src/screens/Settings.tsx`
- `src/screens/Profile.tsx`

**Estimated scope:** M

---

### Task 10: Onboarding-Wizard auf Glass-Look umstellen

**Description:** Alle 4 Schritte (`StepHousehold`, `StepCats`, `StepFood`,
`StepHabits`) plus `OnboardingWizard`-Rahmen (Fortschrittsbalken) bekommen
den neuen Look. Formularlogik unverändert.

**Acceptance criteria:**
- [ ] Fortschrittsbalken/Dots im Glass-Stil
- [ ] Alle 4 Schritt-Formulare nutzen `GlassCard` für Eingabebereiche
- [ ] "Weiter"/"Zurück"-Navigation funktioniert unverändert

**Verification:**
- [ ] Types/Lint: `npm run check:fast`
- [ ] Manual check: Kompletten Onboarding-Flow mit einem neuen Test-Account einmal durchklicken (Haushalt → Katze → Futter → Habits → Fertig)

**Dependencies:** Task 9

**Files likely touched:**
- `src/screens/onboarding/OnboardingWizard.tsx`
- `src/screens/onboarding/StepHousehold.tsx`
- `src/screens/onboarding/StepCats.tsx`
- `src/screens/onboarding/StepFood.tsx`
- `src/screens/onboarding/StepHabits.tsx`

**Estimated scope:** M

---

### Task 11: `MonthOverlay`, `BottomSheet`, `FeedingQuickAdd` auf Glass-Look umstellen

**Description:** Verbleibende Overlay-/Sheet-Komponenten. Bei
`MonthOverlay` bleiben die Ampel-Dots als Farbcodierung erhalten (Icons
sind hier nicht sinnvoll).

**Acceptance criteria:**
- [ ] `MonthOverlay` nutzt Glass-Hintergrund für das Overlay-Panel, Ampel-Dot-Logik unverändert
- [ ] `BottomSheet` nutzt Glass-Look als Basis für Quick-Add und Habit-Detail-Eingaben (falls in Task 4 auf Bottom-Sheet umgestellt)
- [ ] `FeedingQuickAdd` (Fütterung/Spielzeit/Gewicht/Notiz) nutzt Glass-Look, Chip-Grid der Futterarten bleibt funktional

**Verification:**
- [ ] Types/Lint: `npm run check:fast`
- [ ] Manual check: Monatskalender öffnen und einen Tag auswählen, Quick-Add für alle 4 Typen (Fütterung/Spielzeit/Gewicht/Notiz) durchspielen

**Dependencies:** Task 10

**Files likely touched:**
- `src/components/calendar/MonthOverlay.tsx`
- `src/components/shared/BottomSheet.tsx`
- `src/components/feeding/FeedingQuickAdd.tsx`

**Estimated scope:** M

---

### Task 12: Alte Flat-Tokens entfernen, CLAUDE.md-Migration

**Description:** Aufräumen: nicht mehr referenzierte alte Flat-Design-
Tokens aus `tokens.css` entfernen, Designsystem-Abschnitt in `CLAUDE.md`
durch den Inhalt der Spec ersetzen (siehe Spec-Abschnitt "Migration von
CLAUDE.md").

**Acceptance criteria:**
- [ ] `grep` nach den alten Token-Namen (`--bg-card` als Flat-Wert, `--border-default` falls ersetzt) findet keine Verwendung mehr im Quellcode außerhalb der Tokens-Datei selbst
- [ ] `CLAUDE.md`-Abschnitt "Designsystem" beschreibt den tatsächlichen Ist-Zustand (Verlauf, Glass, Lucide-Icons)
- [ ] Bundle-Größe (gzip, `dist/assets/*.js`) wurde gemessen und mit dem `CONSTRAINTS.md`-Ratchet-Wert (~241 kB) verglichen; Ratchet-Zeile aktualisiert falls gestiegen

**Verification:**
- [ ] `npm run check:task` läuft grün durch
- [ ] Build succeeds: `npm run build`, Bundle-Größe geprüft

**Dependencies:** Task 11

**Files likely touched:**
- `src/styles/tokens.css`
- `CLAUDE.md`
- `CONSTRAINTS.md`

**Estimated scope:** S

---

## Checkpoint: Fertig

- [ ] `npm run check:task` grün, Bundle-Größe gegen Ratchet geprüft (aktualisiert falls nötig)
- [ ] Kompletter Durchklick aller Screens auf einem echten Gerät (iOS Safari + Android Chrome), inkl. PWA-Installation weiterhin funktionsfähig
- [ ] `CLAUDE.md` aktualisiert und committed
- [ ] Deployment auf Vercel geprüft (automatischer Deploy bei Push auf `main`, Live-URL zeigt neues Design)
