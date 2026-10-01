-- Habits pro Katze an-/abwählbar: Habit-Definitionen bleiben haushaltsweit,
-- aber jede Katze kann einzelne Habits für sich deaktivieren. Ein Eintrag
-- hier bedeutet "für diese Katze ausgeblendet"; Abwesenheit = aktiv
-- (passt zum bestehenden is_default-Verhalten der Habit-Definitionen).

CREATE TABLE cat_habit_exclusions (
  cat_id UUID REFERENCES cats(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habit_definitions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (cat_id, habit_id)
);

ALTER TABLE cat_habit_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_habit_exclusions_select" ON cat_habit_exclusions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "cat_habit_exclusions_insert" ON cat_habit_exclusions
  FOR INSERT WITH CHECK (
    my_role() = 'owner'
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "cat_habit_exclusions_delete" ON cat_habit_exclusions
  FOR DELETE USING (
    my_role() = 'owner'
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );

GRANT SELECT, INSERT, DELETE ON cat_habit_exclusions TO authenticated;
