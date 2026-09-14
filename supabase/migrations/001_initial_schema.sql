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
