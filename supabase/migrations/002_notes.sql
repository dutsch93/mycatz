-- Freie Notizen aus dem Quick-Add-Menü (unabhängig von Fütterung/Spielzeit/Habits)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID REFERENCES cats(id) NOT NULL,
  text TEXT NOT NULL,
  logged_by UUID REFERENCES profiles(id),
  logged_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);
