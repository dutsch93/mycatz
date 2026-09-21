# Design: Liquid-Glass-Dashboard für MyCatz

Status: Entwurf zur Nutzerfreigabe
Datum: 2026-09-21

## Overview

MyCatz bekommt ein neues visuelles Grundgerüst im Stil von Apples Liquid Glass
(Blur, Transparenz, durchgängig auf allen Flächen) statt des bisherigen
flachen, schattenlosen Designs. Der Home-Screen wird zu einem echten
Dashboard mit kompakteren, kachelartigen Bausteinen statt der bisherigen
langen vertikalen Liste. Emojis werden durchgängig durch ein Icon-Set
(Lucide, Outline-Stil) ersetzt. Das ist ein Ersatz für weite Teile des in
`CLAUDE.md` dokumentierten Designsystems, kein additiver Layer.

Dieses Dokument ersetzt den relevanten Abschnitt "Designsystem" in
`CLAUDE.md`, sobald der Umbau abgeschlossen ist (siehe Migrationshinweis
am Ende).

## Architecture Decisions

- **Glass als Utility-Klasse, nicht pro Komponente neu erfunden.** Ein
  einziges `.glass`-CSS-Preset (bzw. eine `<GlassCard>`-Komponente) kapselt
  `backdrop-filter`, Rand, Schatten-Werte. Jede Card/Kachel/Nav-Leiste nutzt
  dieselbe Basis, damit Look konsistent bleibt und sich zentral nachjustieren
  lässt.
- **Farbverlauf statt Flatcolor als Seitenhintergrund**, weil Glass-Blur auf
  einem nahezu weißen Hintergrund (`#FAFAF8`) unsichtbar ist. Der Hintergrund
  bekommt einen festen, warmen Radial-Verlauf (Apricot/Sage-Töne), keinen
  dynamischen/zufälligen — Konsistenz über Screens hinweg ist wichtiger als
  Abwechslung.
- **Icons: `lucide-react` statt Emoji-Strings.** Neue Abhängigkeit (klein,
  tree-shakeable, MIT-lizenziert). Emoji-Werte in `habit_definitions.emoji`
  bleiben in der DB unverändert (Bestandsdaten, auch für eventuelle
  Fallbacks/Notifications); im UI wird per fester Mapping-Tabelle
  Habit-Name/Kategorie → Lucide-Icon aufgelöst (siehe unten), nicht das
  DB-Feld direkt gerendert.
- **Layout-Regel:** Grids nur für die Daily-Habit-Kacheln (3 Spalten).
  Alle anderen Dashboard-Bausteine (Trend, Multi-Katzen-Übersicht,
  Stats-Kacheln) sind einspaltig/volle Breite, untereinander gestapelt.
  Grund: bessere Lesbarkeit auf 390px-Breite, weniger visuelles Gedränge.
- **Rollout screen-by-screen:** Erst Tokens + `GlassCard`-Basiskomponente,
  dann Home, dann Stats, dann Settings/Profile/Onboarding/Overlays. Die App
  bleibt nach jedem Schritt lauffähig und testbar (kein Big-Bang-Rewrite).
- **Kein Care-Score, kein Score-Trend, keine Streak-Kachel-Neugestaltung**
  in diesem Umbau — bewusst nicht gebaut (YAGNI), da vom Nutzer explizit
  aus dem Scope genommen. Die bestehenden Futter-/Spiel-Ringe bleiben in
  ihrer jetzigen Form/Logik, bekommen nur den neuen visuellen Rahmen.

## Design System (ersetzt Abschnitt in CLAUDE.md)

### Hintergrund

```css
--bg-page-gradient:
  radial-gradient(circle at 15% 10%, rgba(232,168,124,0.55), transparent 45%),
  radial-gradient(circle at 85% 20%, rgba(133,183,157,0.45), transparent 50%),
  radial-gradient(circle at 30% 90%, rgba(212,165,116,0.35), transparent 50%),
  linear-gradient(160deg, #FFF7EE 0%, #FBEFE3 40%, #F3E9DD 100%);
```
Fixer Verlauf, kein `background-attachment: fixed`-Parallax (Performance auf
älteren Mobilgeräten).

### Glass-Preset

```css
.glass {
  background: rgba(255,255,255,0.42);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.65);
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(120,90,60,0.10), inset 0 1px 0 rgba(255,255,255,0.5);
}
```
Ersetzt die bisherige "Keine Schatten — Flat Design"-Regel. Radius wächst
von 12px auf 24px (weicher, iOS-typischer).

### Icons

`lucide-react`, Strichstärke 1.8–2, `stroke: var(--text-primary)` bzw.
gedämpfter Ton für Sekundär-Icons. Aktive/erledigte Zustände färben das
Icon statt es zu tauschen (z. B. erledigtes Habit: Icon-Farbe → Sage).

### Farbpalette

Bleibt inhaltlich wie in `CLAUDE.md` (Apricot/Sage/Warm-Brown/Muted-Red als
funktionale Akzente), nur der Seitenhintergrund und die Card-Flächen ändern
sich wie oben beschrieben.

### Habit-Icon-Mapping (fest im Code, kein Einstellungs-UI)

| Habit (Default-Set) | Kategorie | Lucide-Icon |
|---|---|---|
| Gekuschelt | daily | `Heart` |
| Gebürstet | daily | `Paintbrush` |
| Katzenklo gereinigt | daily | `Trash2` |
| Krallen geschnitten | daily | `Scissors` |
| Medikament gegeben | health | `Pill` |
| Trinkmenge | daily | `Droplet` |
| Stimmung | daily | `Smile` |
| Erbrochen | health | `TriangleAlert` |
| Durchfall | health | `Droplets` |
| Niesen | health | `Wind` |
| Haarballen | health | `CircleDashed` |
| Markiert / Angepinkelt | behavior | `MapPin` |
| Tierarztbesuch | health | `Stethoscope` |
| Ungewöhnl. Verhalten | behavior | `TriangleAlert` |
| *(Fallback: benutzerdefinierte Habits ohne Mapping-Eintrag)* | — | `CircleHelp` |

Zuordnung erfolgt über den `name`-String (exakter Match, normalisiert
lowercase/trim). Neues Lookup-Modul `src/lib/habitIcons.ts`.

## Komponenten & Screens

### Neue/geänderte gemeinsame Bausteine

- `src/components/shared/GlassCard.tsx` (neu) — Wrapper-Komponente für das
  `.glass`-Preset, ersetzt schrittweise die bisherigen einfachen `<div
  className="card">`-Stellen.
- `src/lib/habitIcons.ts` (neu) — Mapping-Tabelle + Fallback-Resolver.
- `src/styles/tokens.css` — neue Tokens für Verlauf, Glass-Radius,
  Blur-Werte; alte Flat-Tokens (`--bg-card`, `--border-default` als
  Vollfarbe) bleiben für Übergangszeit bestehen, bis alle Screens migriert
  sind, und werden danach entfernt.

### Home → Dashboard (`src/screens/Home.tsx`)

- Bestehender Kalender-Strip: Glass-Leiste statt Flat.
- Bestehende `FitnessRings`-Komponente: unverändert in der Logik, nur
  umschließende Card wird Glass; Ring-Zentrum bekommt leichten
  Glass-Blur-Kern (siehe Mockup).
- `HabitList`/`HabitItem`: neues Grid-Layout (3 Spalten, quadratische
  Kacheln, Icon + Name), erledigt-Zustand über Hintergrundfarbe/Icon-Farbe
  statt der bisherigen 👍/👎-Buttons nebeneinander. **Wichtig:** Die
  bestehende Interaktionslogik (Tap für boolean, Zahl-Input bei count,
  Dropdown bei select, Notizfeld) bleibt vollständig erhalten — nur die
  Kachel ersetzt die bisherige Listenzeile als Trigger; Detail-Eingabe
  (Zahl/Select/Notiz) öffnet weiterhin die bestehenden Interaktionselemente
  (z. B. als Bottom-Sheet statt Inline-Erweiterung, siehe Testing-Abschnitt).
- Neue Wochentrend-Kachel (volle Breite): Mini-Sparkline aus den
  vorhandenen `feeding_logs` der letzten 7 Tage (kein neuer Hook nötig,
  `useStats`-artige Aggregation wiederverwendbar/extrahierbar).
- Neue Multi-Katzen-Kachel (volle Breite, nur sichtbar wenn >1 Katze im
  Haushalt): Mini-Ring pro Katze + Prozentwert, Tap wechselt aktive
  Katze/Gruppe (nutzt bestehenden Auswahl-Mechanismus aus `Profile.tsx`).

### Stats-Screen (`src/screens/Stats.tsx`)

- Bestehende Charts (Recharts BarChart/LineChart), Streak-Liste,
  Gewichtsverlauf, Gesundheits-Events bleiben inhaltlich unverändert,
  Cards werden auf Glass umgestellt, Layout wird einspaltig (aktuell schon
  größtenteils so).
- **Neu: Wochen-Insight-Text** — ein Satz oberhalb der Charts, z. B.
  "Diese Woche {X}% mehr/weniger gespielt als letzte Woche." Berechnung:
  Summe `play_logs.duration_min` aktuelle 7-Tage-Periode vs. vorherige
  7-Tage-Periode, Prozent-Delta. Bei fehlenden Vorwochen-Daten (Neuanlage)
  wird der Insight-Text ausgeblendet statt einer falschen Aussage.
- **Neu: Gesundheits-Heatmap** — Mini-Kalendergitter (ähnlich
  `MonthOverlay`, aber kompakt, nicht als Overlay) mit Punktdichte pro Tag
  basierend auf Anzahl `habit_logs` mit `category = 'health'` und
  `value = true`/`count > 0`. Ergänzt die bestehende Text-Liste der
  Gesundheits-Events, ersetzt sie nicht.

### Weitere Screens (spätere Rollout-Schritte, gleiche Prinzipien)

Settings, Profile, Onboarding-Wizard, `MonthOverlay`, `BottomSheet`,
`FeedingQuickAdd`: bekommen dieselbe Glass-Behandlung + Icon-Tausch in
separaten Folge-Schritten des Implementierungsplans, jeweils nach
denselben hier festgelegten Regeln (kein neues Designvokabular pro
Screen).

## Data Flow

Kein Wechsel der Datenquellen oder RLS-Policies. Alle neuen visuellen
Elemente lesen ausschließlich bestehende Tabellen (`feeding_logs`,
`play_logs`, `habit_logs`, `weight_logs`, `cats`). Wochen-Insight und
Gesundheits-Heatmap sind reine Client-seitige Aggregationen der bereits
geladenen Zeiträume aus `useStats` (ggf. Zeitraum-Fetch dort erweitert,
kein neuer Endpoint).

## Error Handling

Keine neuen Fehlerквellen durch das Redesign selbst. Zu beachten:

- `backdrop-filter` ohne Fallback ist auf sehr alten Browsern (nicht
  relevant für Ziel-Browser iOS Safari/Android Chrome, beide unterstützen
  es) ggf. nicht verfügbar — Graceful Degradation: ohne Support wird die
  Card einfach undurchsichtig (kein Blur), keine Fehlfunktion, da
  `background: rgba(...)` immer greift.
- Wochen-Insight-Text: bei Division durch 0 (Vorwoche = 0 Minuten) wird der
  Text ausgeblendet statt `Infinity%`/`NaN%` anzuzeigen.

## Testing

- Bestehende Vitest-Unit-Tests (`dates.test.ts`, `streaks.test.ts`,
  `nfc.test.ts`) bleiben unverändert gültig, da reine Logik nicht
  angefasst wird.
- Neue Unit-Tests für die neue Aggregationslogik: Wochen-Insight-Berechnung
  (`src/lib/insights.ts`, neu, nach demselben Muster wie `streaks.ts`
  extrahiert und testbar gemacht) und Gesundheits-Heatmap-Aggregation.
- Visuelle/manuelle Prüfung je Rollout-Schritt im Browser (kein
  automatisiertes visuelles Testing in diesem Projekt vorhanden) —
  insbesondere: Touch-Targets bleiben ≥44×44px trotz kompakterer Kacheln,
  Kontrast von Text auf teiltransparentem Glass bleibt lesbar (auf hellem
  UND auf dem bunten Verlaufshintergrund selbst prüfen).
- `npm run check:task` (Types, Lint, Coverage) muss nach jedem
  Rollout-Schritt grün bleiben, gemäß `CONSTRAINTS.md`.

## Migration von CLAUDE.md

Nach Abschluss des gesamten Rollouts (alle Screens migriert) wird der
Abschnitt "Designsystem" in `CLAUDE.md` durch den Inhalt dieses Dokuments
ersetzt (Farbpalette-Werte bleiben, UI-Elemente-Tabelle wird durch
Glass-Werte ersetzt, "Keine Schatten"-Zeile entfernt).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `lucide-react` ist eine neue Dependency (gegen globale Regel "keine neuen Dependencies ohne Rückfrage") | Niedrig | Explizit in diesem Dokument benannt, Nutzer muss beim Spec-Review aktiv zustimmen |
| Bundle-Größe wächst (Ratchet in `CONSTRAINTS.md`: darf nicht wachsen) | Mittel | `lucide-react` ist tree-shakeable (nur genutzte Icons landen im Bundle); nach erstem Rollout-Schritt `check:task`/Bundle-Messung gegen bisherigen Wert (~241 kB gzip) prüfen, Ratchet-Wert danach aktualisieren falls leicht gestiegen |
| Lesbarkeit von Text auf durchsichtigem Glass über buntem Verlauf (Kontrast) | Mittel | Textfarben bleiben dunkel/gedämpft (`#3A2E22`/`#5c4e40` statt reinem Schwarz auf Weiß), im Mockup bereits geprüft; zusätzliche manuelle Kontrastprüfung je Screen |
| `backdrop-filter` Performance auf älteren Android-Geräten (viele überlappende Glass-Layer) | Niedrig-Mittel | Blur-Radius moderat (22px), keine verschachtelten Glass-auf-Glass-Stapel; bei Performance-Problemen Fallback auf `background: rgba(255,255,255,0.7)` ohne Blur für schwächere Geräte diskutieren (kein Autodetect in diesem Scope) |
| Großer Umbau über viele Dateien hinweg erhöht Risiko von Regressionen in bestehender Logik (Habit-Interaktion, Realtime, RLS-Anzeige) | Hoch | Screen-by-Screen-Rollout mit funktionierender App nach jedem Schritt (siehe Architecture Decisions); bestehende Interaktionslogik wird nicht angefasst, nur die visuelle Hülle |

## Open Questions

Keine offenen Fragen — alle Kernentscheidungen wurden im Brainstorming
geklärt (Hintergrund, Icon-Set, Layout-Regel, Stats-Umfang,
Icon-Mapping-Ansatz).
