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
- [ ] `lucide-react` ist in `package.json` als Dependency gelistet
- [ ] `tokens.css` enthält die Verlaufshintergrund-Variable und Glass-Werte (Blur, Rand, Schatten) laut Spec
- [ ] `src/components/shared/GlassCard.tsx` existiert, rendert einen Container mit dem `.glass`-Preset, akzeptiert `className`/`children` wie ein normaler Wrapper
- [ ] Body-Hintergrund (`global.css`) nutzt den neuen Verlauf statt `var(--bg-page)`

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Types/Lint: `npm run check:fast`
- [ ] Manual check: `GlassCard` kurz in `Home.tsx` probeweise um ein bestehendes Element gelegt, im Browser sichtbar (Blur erkennbar), danach wieder entfernt oder direkt für Task 3 stehen gelassen

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
- [ ] `resolveHabitIcon(name: string)` gibt für alle 14 Default-Habits aus der Spec-Tabelle das korrekte Lucide-Icon zurück
- [ ] Unbekannter Name (z. B. benutzerdefinierter Habit) liefert das Fallback-Icon (`CircleHelp`), keine Exception
- [ ] Matching ist whitespace-/case-tolerant (trim + lowercase-Vergleich)

**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Types/Lint: `npm run check:fast`

**Dependencies:** Task 1 (lucide-react muss installiert sein)

**Files likely touched:**
- `src/lib/habitIcons.ts` (neu)
- `src/lib/habitIcons.test.ts` (neu)

**Estimated scope:** S

---

## Checkpoint: Fundament

- [ ] `npm run check:task` läuft grün durch
- [ ] `GlassCard` ist im Browser einmal sichtbar verifiziert (kein `backdrop-filter`-Rendering-Fehler, keine Konsolenfehler)

---

## Phase 2: Home-Dashboard

### Task 3: Shell/Header/BottomNav/DayStrip auf Glass umstellen

**Description:** Die App-weiten Rahmenkomponenten bekommen den neuen Look:
Seitenhintergrund (Verlauf statt Flat), BottomNav und Header als
Glass-Leisten, DayStrip als Glass-Container mit Icons statt reinem Text
wo sinnvoll. Icons für die BottomNav (Home/Stats/Add/Profil/Settings)
werden auf Lucide umgestellt.

**Acceptance criteria:**
- [ ] `Shell.tsx` nutzt den neuen Verlaufshintergrund
- [ ] `BottomNav.tsx` ist eine Glass-Leiste mit Lucide-Icons statt bisherigem Styling
- [ ] `Header.tsx` nutzt Glass-Preset
- [ ] `DayStrip.tsx` nutzt Glass-Preset, aktiver Tag weiterhin klar erkennbar (Apricot-Akzent)
- [ ] Touch-Targets bleiben ≥44×44px (bestehende Regel aus CLAUDE.md)

**Verification:**
- [ ] Types/Lint: `npm run check:fast`
- [ ] Manual check: Navigation zwischen allen Bottom-Nav-Tabs funktioniert, aktiver Tab visuell erkennbar, Kalender-Tag-Auswahl funktioniert weiterhin

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/layout/Shell.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/Header.tsx`
- `src/components/calendar/DayStrip.tsx`

**Estimated scope:** M

---

### Task 4: `HabitItem`/`HabitList` zu Icon-Grid-Kacheln umbauen

**Description:** Größter Verhaltens-kritischer Schritt: Die Habit-Liste
wird zu einem 3-Spalten-Kachel-Grid (laut Spec-Mockup) umgebaut. **Die
bestehende Interaktionslogik darf sich nicht ändern** — nur die
Präsentation: Tap auf Kachel = wie bisheriger 👍-Tap bei boolean, öffnet
weiterhin Zahl-Input bei `count`, Dropdown bleibt bei `select`, Notizfeld
bleibt über eigenes Icon erreichbar. `HabitItem` nutzt `habitIcons.ts`
statt `habit.emoji`.

**Acceptance criteria:**
- [ ] Habits werden als 3-Spalten-Grid quadratischer Kacheln gerendert (Icon + Name), Rest der Liste bleibt einspaltig darunter/darüber wie im Rest der App
- [ ] Erledigt-Zustand (boolean `true`) visuell erkennbar über Kachel-Hintergrund/Icon-Farbe (Sage), nicht mehr über separate 👍/👎-Buttons nebeneinander
- [ ] `count`-Typ: Tap öffnet weiterhin die Zahl-Eingabe, Anzeige der aktuellen Zahl auf der Kachel
- [ ] `select`-Typ: Auswahl weiterhin möglich (z. B. über Bottom-Sheet oder Inline-Dropdown bei Tap), gewählte Option auf der Kachel sichtbar
- [ ] Notizfeld weiterhin pro Habit erreichbar und funktionsfähig (Speichern/Lesen von `note`)
- [ ] "nein"-Fall (boolean `false`) weiterhin auswählbar (z. B. long-press oder zweiter Tap-Zustand — konkrete Interaktion in dieser Task festlegen und dokumentieren)
- [ ] `mixed`-Zustand (Gruppen-Habit mit unterschiedlichen Werten pro Katze) bleibt visuell unterscheidbar

**Verification:**
- [ ] Tests pass: `npm run test` (bestehende Tests dürfen nicht brechen, `habitIcons` bereits getestet)
- [ ] Types/Lint: `npm run check:fast`
- [ ] Manual check: Jeden der 3 Habit-Typen einmal komplett durchspielen (loggen, ändern, Notiz hinzufügen, bei count den Wert ändern, bei boolean auf "nein" wechseln), Realtime-Update auf zweitem Gerät/Tab weiterhin sichtbar

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
- [ ] `FitnessRings` steckt in einer `GlassCard`, Ring-Logik/-Werte unverändert
- [ ] Neue Wochentrend-Kachel zeigt Sparkline aus den letzten 7 Tagen Futter-Logs der aktuell ausgewählten Katze/Gruppe, volle Breite
- [ ] Neue Multi-Katzen-Kachel: pro Katze im Haushalt ein Mini-Ring + Prozentwert, volle Breite, nur gerendert wenn `cats.length > 1`
- [ ] Tap auf eine Katze in der Multi-Katzen-Kachel wechselt die aktive Auswahl (nutzt denselben Mechanismus wie `Profile.tsx`)
- [ ] Bestehende Elemente (NFC-Scan-Button, Tages-Log-Liste mit Lösch-Buttons, "Zurück zu Heute"-Badge, Gruppen-Tipp-Text) bleiben funktional erhalten, nur im neuen Look

**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Types/Lint: `npm run check:fast`
- [ ] Manual check: Katze wechseln über neue Kachel funktioniert, Sparkline zeigt plausible Werte, NFC-Button weiterhin sichtbar (auf Android/Web-NFC-fähigem Gerät oder simuliert), Log-Einträge weiterhin lösch- bzw. für Gäste nicht löschbar (Rollen-Check bleibt bestehen)

**Dependencies:** Task 3, Task 4

**Files likely touched:**
- `src/screens/Home.tsx`
- `src/components/rings/FitnessRings.tsx`
- `src/components/shared/WeekTrendTile.tsx` (neu)
- `src/components/shared/MultiCatTile.tsx` (neu)

**Estimated scope:** M

---

## Checkpoint: Home fertig

- [ ] `npm run check:task` läuft grün durch
- [ ] Manueller Durchklick: Habit loggen (alle 3 Typen inkl. Notiz), Kalender-Strip-Auswahl, Monatsoverlay öffnen/schließen, NFC-Button (falls testbar), Quick-Add-Button — alles funktioniert wie vor dem Umbau
- [ ] **Review mit Nutzer**, bevor Stats-Screen angefasst wird

---

## Phase 3: Stats-Screen

### Task 6: `insights.ts` Wochen-Insight-Berechnung + Tests

**Description:** Reine Berechnungsfunktion nach dem Muster von
`streaks.ts`: vergleicht Summe `play_logs.duration_min` der aktuellen
7-Tage-Periode mit der vorherigen 7-Tage-Periode, gibt Prozent-Delta
zurück oder `null` bei fehlenden Vorwochen-Daten (kein Divide-by-Zero-Text).

**Acceptance criteria:**
- [ ] Funktion gibt korrektes Prozent-Delta für einen Beispieldatensatz zurück (Anstieg, Rückgang, gleich)
- [ ] Vorwoche = 0 Minuten → Rückgabe `null` statt `Infinity`/`NaN`
- [ ] Beide Wochen = 0 Minuten → Rückgabe `null` (keine sinnvolle Aussage möglich)

**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Types/Lint: `npm run check:fast`

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
- [ ] Alle bestehenden Stats-Kacheln (Futter-/Spielzeit-Charts, Streak-Liste, Gewichtsverlauf, Gesundheits-Events) nutzen `GlassCard`
- [ ] Layout ist einspaltig (keine Nebeneinander-Anordnung außer ggf. schon bestehende Tab-Leiste Woche/Monat/Jahr)
- [ ] Insight-Text erscheint oberhalb der Charts, wenn `insights.ts` einen Wert liefert
- [ ] Insight-Text ist ausgeblendet (kein Platzhalter-Text), wenn `insights.ts` `null` liefert

**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Types/Lint: `npm run check:fast`
- [ ] Manual check: Alle drei Zeiträume (Woche/Monat/Jahr) durchklicken, Insight-Text bei einem frischen Testhaushalt (keine Vorwochendaten) korrekt unsichtbar

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
- [ ] Neue Komponente zeigt ein kompaktes Monatsraster mit visueller Dichte-Kodierung (z. B. Punktgröße/Sättigung nach Anzahl Health-Events an dem Tag)
- [ ] Tage ohne Health-Events sind neutral/leer dargestellt, keine Fehlinterpretation als "0 = negativ"
- [ ] In den Stats-Screen eingebunden, ersetzt die bestehende Event-Liste nicht, sondern ergänzt sie

**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Types/Lint: `npm run check:fast`
- [ ] Manual check: Monat mit und ohne Health-Events durchklicken, Darstellung bleibt lesbar bei vielen Events an einem Tag

**Dependencies:** Task 7

**Files likely touched:**
- `src/components/shared/HealthHeatmap.tsx` (neu)
- `src/screens/Stats.tsx`

**Estimated scope:** M

---

## Checkpoint: Stats fertig

- [ ] `npm run check:task` läuft grün durch
- [ ] Manueller Check aller drei Zeiträume, Insight-Text-Verhalten bei leeren/vorhandenen Vorwochendaten, Heatmap-Darstellung

---

## Phase 4: Restliche Screens

### Task 9: Settings + Profile auf Glass-Look umstellen

**Description:** Rollenabhängige UI (Owner/Member/Guest), Mitglieder-
Einladung, Gast-Link-Verwaltung, NFC-Tag-Verwaltung, Katzen-/Gruppen-Auswahl
bekommen den Glass-Look. Keine funktionale Änderung an RLS-Gating oder
Formularen.

**Acceptance criteria:**
- [ ] `Settings.tsx` nutzt `GlassCard` für alle Abschnitte, Owner-only-Gating unverändert
- [ ] `Profile.tsx` nutzt `GlassCard`, Katzen-/Gruppen-Umschaltung funktioniert unverändert
- [ ] Icons (z. B. für Abmelden, Einladung kopieren) auf Lucide umgestellt wo bisher Emoji verwendet wurde

**Verification:**
- [ ] Types/Lint: `npm run check:fast`
- [ ] Manual check: Als Owner und (falls testbar) als Guest/Member einloggen, Sichtbarkeit der jeweiligen Abschnitte bleibt korrekt wie vor dem Umbau

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
