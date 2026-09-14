# CLAUDE.md — MyCatz

## Projektübersicht

**MyCatz** ist eine Mobile-first Progressive Web App (PWA) zum täglichen Tracking von Katzen-Gewohnheiten. Hauptfokus: Fütterung (inkl. NFC-Logging), Spielzeit, Gesundheit und Verhalten. Mehrere Katzen, mehrere Nutzer (inkl. Gäste), gruppierbar.

**Zielgruppe:** Katzenbesitzer:innen (20–40), die täglich auf dem Handy via Home-Screen-Bookmark tracken. Kein App-Store.

**Design-Philosophie:** Glanceable Utility. Apple-clean, warmtonig. Kein Over-Design, keine Katzen-Illustrationen — die Wärme kommt über die Farben. Daten statt Deko.

---

## Tech-Stack

| Schicht       | Technologie                                    |
|---------------|------------------------------------------------|
| Frontend      | React (Vite), TypeScript                       |
| Styling       | CSS Custom Properties + Tailwind (warmtonige Custom-Config) |
| Charts        | Recharts (Ringe, Balken, Linie)                |
| Backend/DB    | Supabase (Postgres + Auth + Realtime + Storage)|
| Auth          | Supabase Auth (Email/Magic Link + Guest Access)|
| NFC           | Web NFC API (Android) + iOS Shortcuts Fallback |
| Hosting       | Vercel                                         |
| Repo          | GitHub                                         |

---

## Designsystem

### Farbpalette

```css
:root {
  /* Hintergründe */
  --bg-page:          #FAFAF8;   /* Seitenhintergrund */
  --bg-card:          #FFFFFF;   /* Cards */
  --bg-input:         #F5F3F0;   /* Input-Felder, Chip-BGs */

  /* Akzentfarben (funktional gebunden) */
  --color-apricot:    #E8A87C;   /* Buttons, aktive Elemente, NFC-Feedback, Spielzeit-Ring */
  --color-sage:       #85B79D;   /* Status OK, Futter-Ring */
  --color-warm-brown: #D4A574;   /* Warnung */
  --color-muted-red:  #C97C7C;   /* Achtung */
  --color-gray:       #8E8E93;   /* Sekundärer Text, Labels, Timestamps */

  /* Text */
  --text-primary:     #1C1C1E;   /* Headlines, Body */
  --text-secondary:   #8E8E93;   /* Labels, Zeitstempel */
  --text-on-color:    #FFFFFF;   /* Text auf farbigen Buttons */

  /* Borders */
  --border-default:   #E8E6E1;   /* Card-Borders, Dividers */

  /* Shadows */
  /* Keine Schatten — Flat Design */
}
```

### Ampelsystem (Fütterung)

| Zustand             | Farbe               | Hex       |
|---------------------|----------------------|-----------|
| ≥67% Tagesziel      | Salbeigrün           | `#85B79D` |
| 34–66% Tagesziel    | Warmes Braun         | `#D4A574` |
| 0–33% Tagesziel     | Gedämpftes Rot       | `#C97C7C` |

### Typografie

- **Font:** Inter (Google Fonts)
- **Headlines:** 22px, Weight 500
- **Body:** 16px, Weight 400
- **Labels/Timestamps:** 13px, `--color-gray`
- Keine anderen Fonts. Kein Bold über 600.

### UI-Elemente

- **Cards:** `--bg-card`, `0.5px solid --border-default`, `border-radius: 12px`, kein Shadow
- **Buttons:** `--color-apricot` Background, weißer Text, `border-radius: 8px`
- **Inputs:** `--bg-input`, `0.5px solid --border-default`, `border-radius: 8px`
- **Charts:** Salbeigrün für Futter, Apricot für Spielzeit
- **Layout:** Mobile-first, Single-Column, max-width 440px zentriert
- **Touch-Targets:** Minimum 44×44px

---

## Architektur & Datenmodell

### Supabase-Tabellen

```sql
-- Haushalt (eine Gruppe von Nutzern, die gemeinsam Katzen verwalten)
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nutzer (Supabase Auth User erweitert)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  household_id UUID REFERENCES households(id),
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member', 'guest')),
  -- owner: kann Katzen/Settings verwalten
  -- member: kann alles tracken und editieren
  -- guest: kann nur tracken (kein Löschen, keine Settings)
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Katzen
CREATE TABLE cats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) NOT NULL,
  name TEXT NOT NULL,
  age TEXT,                -- z.B. "3 Jahre" oder "8 Monate"
  breed TEXT,
  weight_kg NUMERIC(4,2),
  photo_url TEXT,          -- Supabase Storage
  tags TEXT[],             -- Besonderheiten als Tags, z.B. ["sensibel", "indoor"]
  daily_food_target_g INTEGER NOT NULL DEFAULT 200,
  daily_play_target_min INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT now(),
  archived BOOLEAN DEFAULT false
);

-- Katzen-Gruppen (für paralleles Tracking)
CREATE TABLE cat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cat_group_members (
  group_id UUID REFERENCES cat_groups(id) ON DELETE CASCADE,
  cat_id UUID REFERENCES cats(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, cat_id)
);

-- Futterarten (pro Haushalt konfigurierbar)
CREATE TABLE food_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) NOT NULL,
  name TEXT NOT NULL,            -- z.B. "Nassfutter", "Trockenfutter"
  category TEXT NOT NULL CHECK (category IN (
    'wet', 'dry', 'sensitive', 'cooked', 'snack_dry', 'snack_wet', 'custom'
  )),
  default_portion_g INTEGER NOT NULL,  -- Standard-Portion in Gramm
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Futter-Log (jede einzelne Fütterung)
CREATE TABLE feeding_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID REFERENCES cats(id) NOT NULL,
  food_type_id UUID REFERENCES food_types(id) NOT NULL,
  amount_g INTEGER NOT NULL,
  logged_by UUID REFERENCES profiles(id),
  logged_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'nfc')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,  -- für Tagesfilter
  note TEXT
);

-- Spielzeit-Log
CREATE TABLE play_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID REFERENCES cats(id) NOT NULL,
  duration_min INTEGER NOT NULL,
  logged_by UUID REFERENCES profiles(id),
  logged_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT
);

-- Habit-Definitionen (pro Haushalt konfigurierbar)
CREATE TABLE habit_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) NOT NULL,
  name TEXT NOT NULL,                -- z.B. "Gekuschelt"
  emoji TEXT,                        -- z.B. "🤗"
  type TEXT NOT NULL CHECK (type IN ('boolean', 'count', 'select')),
  -- boolean: 👍/👎
  -- count: 👍 → Zahl eingeben (z.B. "Wie oft erbrochen?")
  -- select: Dropdown-Auswahl (z.B. Stimmung)
  options TEXT[],                     -- nur für type='select', z.B. ["entspannt","verspielt","ängstlich","aggressiv","apathisch"]
  has_required_count BOOLEAN DEFAULT false, -- wenn true: 👍 öffnet Zahl-Input
  is_default BOOLEAN DEFAULT true,    -- im Wizard vorausgewählt?
  sort_order INTEGER DEFAULT 0,
  category TEXT DEFAULT 'daily' CHECK (category IN ('daily', 'health', 'behavior')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habit-Log (jeder Eintrag pro Katze pro Tag)
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID REFERENCES cats(id) NOT NULL,
  habit_id UUID REFERENCES habit_definitions(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  value BOOLEAN NOT NULL,            -- true = 👍, false = 👎
  count INTEGER,                      -- nur bei type='count'
  selected_option TEXT,               -- nur bei type='select'
  note TEXT,                          -- immer optional verfügbar
  logged_by UUID REFERENCES profiles(id),
  logged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cat_id, habit_id, date)     -- ein Habit pro Katze pro Tag
);

-- Gewichts-Log (periodisches Wiegen)
CREATE TABLE weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID REFERENCES cats(id) NOT NULL,
  weight_kg NUMERIC(4,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by UUID REFERENCES profiles(id),
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- NFC-Tag-Konfiguration
CREATE TABLE nfc_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) NOT NULL,
  tag_identifier TEXT NOT NULL UNIQUE, -- NFC Tag UID oder URL-Parameter
  food_type_id UUID REFERENCES food_types(id) NOT NULL,
  label TEXT,                          -- z.B. "Nassfutter-Tag Küche"
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Gruppenlogik

Wenn eine Katzengruppe aktiv ausgewählt ist und ein Futter-Eintrag (manuell oder NFC) geloggt wird:
1. Für **jede Katze** in der Gruppe wird ein separater `feeding_logs`-Eintrag erstellt
2. Jeder Eintrag bekommt die volle `amount_g` (kein Teilen)
3. Gleiches gilt für `habit_logs` und `play_logs`
4. Die Ringe zeigen den Fortschritt der **Gruppe** (Summe aller Katzen-Einträge / Summe aller Katzen-Ziele)

### NFC-Flow

```
Handy an Tag halten
       ↓
Tag-ID wird gelesen (Web NFC oder iOS Shortcut öffnet URL ?nfc=TAG_ID)
       ↓
App erkennt Tag → schlägt food_type + default_portion_g nach
       ↓
Loggt für die aktuell ausgewählte Katze/Gruppe
       ↓
Kurzes Bestätigungs-Feedback (Apricot-Puls-Animation, 2s)
       ↓
Ring aktualisiert sich in Echtzeit
```

---

## Screen-Architektur

### Screen 1: Onboarding Wizard (Erststart)

Geführter Flow in 4 Schritten:

```
Schritt 1: Haushalt        → Name des Haushalts, eigener Name + Email
Schritt 2: Katze(n)        → Name, Alter, Rasse, Gewicht, Foto, Tags
                              → Optional: Gruppe erstellen bei ≥2 Katzen
Schritt 3: Futter           → Futterarten auswählen/anlegen + Portionsgrößen
                              → Tagesziel pro Katze festlegen
Schritt 4: Habits           → Vorgeschlagene Habits an/abwählen
                              → Spielzeit-Tagesziel festlegen
→ Fertig → Home Screen
```

Fortschrittsbalken oben (4 Dots). Jeder Schritt hat einen "Weiter"-Button unten. Zurück jederzeit möglich.

### Screen 2: Home (Hauptscreen)

```
┌─────────────────────────────────────────┐
│  [📷 Foto]  Luna & Milo          [👤]  │  ← Profil-Link rechts
├─────────────────────────────────────────┤
│  Mo  Di  Mi ●Do  Fr  Sa  So     [📅]   │  ← Kalender-Timeline, heute = aktiv
│                                         │     [📅] öffnet Monatskalender
├─────────────────────────────────────────┤
│         ╭─────────────╮                 │
│        ╱   ╭───────╮   ╲               │
│       │   ╱  FUTTER ╲   │              │  ← Zwei konzentrische Ringe
│       │  │  156/200g  │  │              │     Außen: Futter (Salbeigrün)
│       │   ╲  78%    ╱   │              │     Innen: Spielzeit (Apricot)
│        ╲   ╰───────╯   ╱               │     Prozent + Gramm im Zentrum
│         ╰─────────────╯                 │     Ampelfarbe des Rings ändert sich
│          🟢 Futter  🟠 Spiel            │     je nach %-Erreichung
├─────────────────────────────────────────┤
│  DAILY HABITS                           │
│                                         │
│  🤗 Gekuschelt              [👍] [👎]  │  ← Ja/Nein
│  🤮 Erbrochen       [2×] 📝 [👍] [👎]  │  ← Anzahl + Notiz
│  😺 Stimmung    [entspannt] 📝 [✓]     │  ← Select + Notiz
│  ✂️ Gebürstet                [👍] [👎]  │
│  💊 Medikament          📝  [👍] [👎]  │
│  🚽 Klo gereinigt           [👍] [👎]  │
│  🎯 Markiert         [0×] 📝 [👍] [👎]  │
│  ...                                    │
├─────────────────────────────────────────┤
│  🏠    📊    [＋]    👤    ⚙️           │  ← Bottom Nav
│  Home  Stats  Add   Profil  Settings    │
└─────────────────────────────────────────┘
```

### Screen 3: Quick-Add (＋ Button)

Modal/Bottom-Sheet das von unten hochfährt:

```
┌─────────────────────────────────────────┐
│  Was möchtest du loggen?                │
│                                         │
│  🍽️ Fütterung                           │  → Futterart wählen → Menge (vorausgefüllt) → Speichern
│  🎾 Spielzeit                           │  → Minuten eingeben → Speichern
│  ⚖️ Gewicht                              │  → kg eingeben → Speichern
│  📝 Notiz                               │  → Freitext für die Katze/Gruppe → Speichern
│                                         │
│  [Abbrechen]                            │
└─────────────────────────────────────────┘
```

Bei **Fütterung**: Futterart-Auswahl als Chip-Grid (Nassfutter, Trockenfutter, etc.). Menge ist mit `default_portion_g` vorausgefüllt, kann überschrieben werden. Ein Tap auf "Speichern" loggt den Eintrag.

### Screen 4: Statistik

Tab-Navigation oben: **Woche | Monat | Jahr**

```
┌─────────────────────────────────────────┐
│  [Woche]  Monat   Jahr                  │
├─────────────────────────────────────────┤
│  FUTTER                                 │
│  ┌─────────────────────────────────┐    │
│  │ ▐█ ▐█ ▐█ ▐▌ ▐█ ▐█ ▐▌          │    │  ← Balkendiagramm pro Tag
│  │ Mo Di Mi Do Fr Sa So            │    │
│  └─────────────────────────────────┘    │
│  Ø 178g / Tag   Ziel: 200g             │
├─────────────────────────────────────────┤
│  SPIELZEIT                              │
│  ┌─────────────────────────────────┐    │
│  │ ▐█ ▐▌ ▐█ ▐█ ▐▌ ▐█ ▐▌          │    │
│  │ Mo Di Mi Do Fr Sa So            │    │
│  └─────────────────────────────────┘    │
│  Ø 12 min / Tag   Ziel: 15 min         │
├─────────────────────────────────────────┤
│  HABIT-STREAKS                          │
│  🤗 Gekuschelt          12 Tage 🔥     │
│  ✂️ Gebürstet            3 Tage        │
│  🚽 Klo gereinigt        7 Tage 🔥     │
├─────────────────────────────────────────┤
│  GEWICHTSVERLAUF                        │
│  ┌─────────────────────────────────┐    │
│  │     ╱‾‾‾╲___╱‾‾                │    │  ← Linienchart
│  │ 4.2kg            4.1kg          │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  GESUNDHEITS-EVENTS                     │
│  12.09. 🤮 2× erbrochen                │
│  08.09. 💊 Entwurmung                  │
│  01.09. 🏥 Tierarzt: Impfung           │
└─────────────────────────────────────────┘
```

### Screen 5: Profil

Katzen-/Gruppenauswahl. Hier wechselt man zwischen Katzen und Gruppen.

### Screen 6: Einstellungen

- Haushalt verwalten (Name, Mitglieder einladen, Gast-Link generieren)
- Katzen verwalten (bearbeiten, archivieren, neue anlegen)
- Gruppen verwalten
- Futterarten verwalten
- Habits verwalten (aktivieren/deaktivieren, neue anlegen, Reihenfolge)
- NFC-Tags verwalten (Tag-ID ↔ Futterart zuordnen)
- Account (Email, Passwort, Logout)

### Monatskalender-Overlay

Wenn man auf [📅] tippt, öffnet sich ein Full-Screen-Overlay:

```
┌─────────────────────────────────────────┐
│         September 2026          [✕]     │
│  Mo  Di  Mi  Do  Fr  Sa  So             │
│   1   2   3   4   5   6   7             │
│  🟢  🟢  🟡  🔴  🟢  🟢  🟡            │  ← Farbpunkt = Ampelstatus des Tages
│   8   9  10  11  12  13  14             │
│  🟢  🟡  🟢  🟢  ...                    │
│                                         │
│  Tap auf Tag → Home-Screen zeigt diesen Tag │
└─────────────────────────────────────────┘
```

Der Farbpunkt pro Tag basiert auf dem Futter-Ampelsystem (% vom Tagesziel).

---

## Default Habits (Seeded beim Onboarding)

| Emoji | Name                | Typ      | Optionen (bei select)                                    | Kategorie |
|-------|---------------------|----------|----------------------------------------------------------|-----------|
| 🤗    | Gekuschelt          | boolean  | —                                                        | daily     |
| ✂️    | Gebürstet           | boolean  | —                                                        | daily     |
| 🚽    | Katzenklo gereinigt | boolean  | —                                                        | daily     |
| 💊    | Medikament gegeben  | boolean  | —                                                        | health    |
| 💧    | Trinkmenge          | count    | — (Einheit: Portionen)                                   | daily     |
| 😺    | Stimmung            | select   | ["entspannt","verspielt","ängstlich","aggressiv","apathisch"] | daily     |
| 🤮    | Erbrochen           | count    | — (Einheit: Mal)                                         | health    |
| 💩    | Durchfall           | count    | — (Einheit: Mal)                                         | health    |
| 🤧    | Niesen              | count    | — (Einheit: Mal)                                         | health    |
| 🧶    | Haarballen          | count    | — (Einheit: Stück)                                       | health    |
| 🎯    | Markiert / Angepinkelt | count | — (Einheit: Mal)                                         | behavior  |
| 🏥    | Tierarztbesuch      | boolean  | —                                                        | health    |
| ⚠️    | Ungewöhnl. Verhalten| boolean  | —                                                        | behavior  |
| ✂️    | Krallen geschnitten | boolean  | —                                                        | daily     |

**Alle Habits haben immer ein optionales Notizfeld** (📝 Icon neben dem Habit). Tap darauf öffnet ein Textfeld. Die Notiz wird in `habit_logs.note` gespeichert.

---

## Default Futterarten (Seeded beim Onboarding)

| Name              | Kategorie   | Default-Portion |
|-------------------|-------------|-----------------|
| Nassfutter        | wet         | 100g            |
| Trockenfutter     | dry         | 30g             |
| Sensitives Futter | sensitive   | 100g            |
| Gekochtes Hähnchen| cooked      | 50g             |
| Snacks trocken    | snack_dry   | 10g             |
| Snacks nass       | snack_wet   | 15g             |

Nutzer können weitere anlegen (Kategorie: `custom`).

---

## Vergangene Tage bearbeiten

- Im Kalender-Strip oder Monatskalender kann jeder vergangene Tag ausgewählt werden
- Der Home-Screen zeigt dann die Daten dieses Tages
- Alle Einträge (Futter, Spielzeit, Habits) können nachträglich bearbeitet/entfernt werden
- Ein Badge zeigt an: "Donnerstag, 12. Sep." wenn nicht der aktuelle Tag angezeigt wird
- Ein "Zurück zu Heute"-Button erscheint, wenn ein vergangener Tag aktiv ist

---

## Auth & Multi-User

### Rollen

| Rolle   | Kann tracken | Kann editieren | Kann löschen | Settings | Mitglieder verwalten |
|---------|:---:|:---:|:---:|:---:|:---:|
| Owner   | ✅  | ✅  | ✅  | ✅  | ✅ |
| Member  | ✅  | ✅  | ✅  | ❌  | ❌ |
| Guest   | ✅  | ❌  | ❌  | ❌  | ❌ |

### Einladung

- **Member:** Owner generiert einen Einladungslink (Magic Link per Email)
- **Guest:** Owner generiert einen Gast-Link (kein Account nötig, Session-basiert, läuft nach 30 Tagen ab oder wird manuell widerrufen)

### Realtime

- Supabase Realtime subscriptions auf `feeding_logs`, `play_logs`, `habit_logs`
- Wenn Person A auf Gerät 1 einen Eintrag macht, sieht Person B auf Gerät 2 sofort das Update
- Ring-Animationen triggern bei Realtime-Events

---

## Supabase Row-Level Security (RLS)

Alle Tabellen haben RLS aktiv. Grundregel:

```sql
-- Nutzer sehen nur Daten ihres Haushalts
CREATE POLICY "household_isolation" ON [TABLE]
  USING (household_id = (SELECT household_id FROM profiles WHERE id = auth.uid()));

-- Gäste können nur INSERT (kein UPDATE/DELETE)
CREATE POLICY "guest_insert_only" ON [TABLE]
  FOR INSERT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'member', 'guest'));

CREATE POLICY "no_guest_modify" ON [TABLE]
  FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'member'));

CREATE POLICY "no_guest_delete" ON [TABLE]
  FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('owner', 'member'));
```

---

## NFC-Tag Setup (Settings-Screen)

```
Schritt 1: "Neuen NFC-Tag einrichten" → Futterart aus Dropdown wählen
Schritt 2: "Halte dein Handy jetzt an den Tag" → Web NFC schreibt URL mit Tag-ID
Schritt 3: Bestätigung + Label vergeben (z.B. "Küchen-Tag Nassfutter")
```

**iOS-Fallback:** Anleitung im Settings-Screen: "Öffne die Kurzbefehle-App und erstelle eine NFC-Automation mit dieser URL: `https://[APP-URL]?nfc=[TAG_ID]`"

---

## Ordnerstruktur

```
mycatz/
├── public/
│   └── manifest.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/
│   │   ├── tokens.css              ← CSS Custom Properties
│   │   └── global.css
│   ├── lib/
│   │   ├── supabase.ts             ← Supabase Client
│   │   ├── nfc.ts                  ← Web NFC Helper
│   │   └── dates.ts                ← Datumshilfen
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useHousehold.ts
│   │   ├── useCats.ts
│   │   ├── useFeedingLogs.ts
│   │   ├── usePlayLogs.ts
│   │   ├── useHabits.ts
│   │   └── useRealtime.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Shell.tsx
│   │   ├── rings/
│   │   │   └── FitnessRings.tsx     ← Doppelter Ring (Futter + Spiel)
│   │   ├── calendar/
│   │   │   ├── DayStrip.tsx         ← Horizontaler Kalender-Strip
│   │   │   └── MonthOverlay.tsx     ← Vollbild-Monatskalender
│   │   ├── habits/
│   │   │   ├── HabitList.tsx
│   │   │   └── HabitItem.tsx
│   │   ├── feeding/
│   │   │   └── FeedingQuickAdd.tsx
│   │   └── shared/
│   │       ├── AmpelDot.tsx
│   │       ├── ChipGrid.tsx
│   │       └── BottomSheet.tsx
│   ├── screens/
│   │   ├── Home.tsx
│   │   ├── Stats.tsx
│   │   ├── Profile.tsx
│   │   ├── Settings.tsx
│   │   └── onboarding/
│   │       ├── OnboardingWizard.tsx
│   │       ├── StepHousehold.tsx
│   │       ├── StepCats.tsx
│   │       ├── StepFood.tsx
│   │       └── StepHabits.tsx
│   └── types/
│       └── index.ts                 ← TypeScript Types (matching DB schema)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   ← Alle CREATE TABLE Statements
├── .env.local                       ← VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Build-Reihenfolge (empfohlen)

```
Phase 1: Foundation
  1. Vite + React + TypeScript Setup
  2. Supabase Projekt anlegen + Migration ausführen
  3. Auth-Flow (Signup, Login, Magic Link)
  4. Basis-Layout (Shell, BottomNav, Header)
  5. tokens.css + Tailwind Custom Config

Phase 2: Onboarding
  6. Wizard-Flow (4 Schritte)
  7. Katzen-CRUD
  8. Futterarten-CRUD
  9. Habit-Setup

Phase 3: Core Dashboard
  10. Home-Screen Layout
  11. Kalender-Strip (Tagesauswahl)
  12. Fitness-Ringe (Futter + Spielzeit)
  13. Habit-Liste (alle 3 Typen + Notiz)
  14. Quick-Add Bottom-Sheet (Futter, Spielzeit, Gewicht)
  15. Vergangene-Tage-Bearbeitung

Phase 4: NFC & Realtime
  16. NFC-Tag-Konfiguration (Settings)
  17. NFC-Scan → Auto-Log Flow
  18. Supabase Realtime Subscriptions
  19. iOS Shortcut Fallback-Anleitung

Phase 5: Multi-User
  20. Einladungs-Flow (Member)
  21. Gast-Link-Generierung
  22. RLS Policies
  23. Realtime Cross-Device Sync

Phase 6: Stats & Polish
  24. Stats-Screen (Charts, Streaks, Gewicht, Events)
  25. Monatskalender-Overlay
  26. Gruppen-Logik (paralleles Logging)
  27. PWA Manifest + Service Worker
  28. Vercel Deployment
```

---

## Definition of Done

Das Projekt ist fertig, wenn:

- [ ] **Onboarding:** Wizard erstellt Haushalt, Katze(n), Futterarten und Habits in 4 Schritten
- [ ] **Home:** Kalender-Strip, Ringe und Habit-Liste zeigen den aktuellen Tag korrekt
- [ ] **Ringe:** Futter-Ring (Salbeigrün) und Spiel-Ring (Apricot) füllen sich passend und wechseln die Ampelfarbe bei 33%/66%
- [ ] **Habits:** Alle 3 Typen (boolean, count, select) funktionieren mit optionalem Notizfeld
- [ ] **Quick-Add:** Futter + Spielzeit loggen über ＋ Button funktioniert
- [ ] **NFC:** Tag scannen loggt Futter für die ausgewählte Katze/Gruppe
- [ ] **Kalender:** Vergangene Tage können ausgewählt und bearbeitet werden
- [ ] **Monatskalender:** Zeigt Ampel-Dots pro Tag, Tap → wechselt zum Tag
- [ ] **Gruppen:** Logging für eine Gruppe erstellt Einträge für jede Katze
- [ ] **Multi-User:** Owner, Member und Guest haben ihre jeweiligen Rechte
- [ ] **Realtime:** Eintrag auf Gerät A erscheint sofort auf Gerät B
- [ ] **Stats:** Futter-/Spielzeit-Trend, Habit-Streaks, Gewichtsverlauf, Gesundheits-Events
- [ ] **Design:** Exakt nach Branding Guide (Farben, Typo, kein Shadow, Flat Design)
- [ ] **PWA:** Installierbar auf Home-Screen (iOS + Android)
- [ ] **Deployed:** Läuft auf Vercel mit verbundenem GitHub Repo
