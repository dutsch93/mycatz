-- Phase 5: Multi-User — Einladungen, Gast-Links, Row-Level-Security

-- ─────────────────────────────────────────────────────────────────────────
-- Hilfsfunktionen (SECURITY DEFINER, damit Policies auf "profiles" sich
-- nicht selbst rekursiv auslesen — direkte Subqueries auf "profiles"
-- innerhalb einer Policy für "profiles" würden sonst einen
-- "infinite recursion"-Fehler auslösen).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION my_household_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT household_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Neue Tabellen: Einladungen (Member) und Gast-Links
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role = 'member'),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ
);

CREATE TABLE guest_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON invites, guest_links TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- RPCs zum Einlösen (SECURITY DEFINER — der einladende Haushalt ist zu
-- diesem Zeitpunkt noch nicht "eigener" Haushalt des Nutzers, normale
-- RLS-Policies würden das Anlegen des Profils verhindern)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION redeem_invite(p_token TEXT, p_display_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite invites%ROWTYPE;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet.';
  END IF;

  SELECT * INTO v_invite FROM invites WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Einladung nicht gefunden.';
  END IF;
  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Einladung wurde bereits verwendet.';
  END IF;
  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Einladung ist abgelaufen.';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR lower(v_email) <> lower(v_invite.email) THEN
    RAISE EXCEPTION 'Diese Einladung gehört zu einer anderen E-Mail-Adresse.';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Für diesen Account existiert bereits ein Profil.';
  END IF;

  INSERT INTO profiles (id, household_id, display_name, role)
  VALUES (
    auth.uid(),
    v_invite.household_id,
    COALESCE(NULLIF(p_display_name, ''), split_part(v_email, '@', 1)),
    'member'
  );

  UPDATE invites SET used_at = now() WHERE id = v_invite.id;

  RETURN v_invite.household_id;
END;
$$;

CREATE OR REPLACE FUNCTION redeem_guest_link(p_token TEXT, p_display_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link guest_links%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet.';
  END IF;

  SELECT * INTO v_link FROM guest_links WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gast-Link nicht gefunden.';
  END IF;
  IF v_link.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Gast-Link wurde widerrufen.';
  END IF;
  IF v_link.expires_at < now() THEN
    RAISE EXCEPTION 'Gast-Link ist abgelaufen.';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Für diesen Account existiert bereits ein Profil.';
  END IF;

  INSERT INTO profiles (id, household_id, display_name, role)
  VALUES (auth.uid(), v_link.household_id, COALESCE(NULLIF(p_display_name, ''), 'Gast'), 'guest');

  RETURN v_link.household_id;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_invite(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_guest_link(TEXT, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Row-Level-Security aktivieren
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_links ENABLE ROW LEVEL SECURITY;

-- households ────────────────────────────────────────────────────────────
CREATE POLICY "households_select" ON households
  FOR SELECT USING (id = my_household_id());

-- Jeder frisch angemeldete Nutzer darf einen Haushalt anlegen (Onboarding,
-- Schritt 1 — zu diesem Zeitpunkt existiert noch kein eigenes Profil).
CREATE POLICY "households_insert" ON households
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "households_update" ON households
  FOR UPDATE USING (id = my_household_id() AND my_role() = 'owner');

-- profiles ──────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (id = auth.uid() OR household_id = my_household_id());

-- Direktes Anlegen ist nur für den allerersten Nutzer eines Haushalts
-- erlaubt (Onboarding, Schritt 2 → Owner). Member/Guest-Profile entstehen
-- ausschließlich über die SECURITY-DEFINER-RPCs redeem_invite/redeem_guest_link.
CREATE POLICY "profiles_insert_first_owner" ON profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
    AND role = 'owner'
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.household_id = profiles.household_id)
  );

-- cats ──────────────────────────────────────────────────────────────────
CREATE POLICY "cats_select" ON cats
  FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "cats_insert" ON cats
  FOR INSERT WITH CHECK (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "cats_update" ON cats
  FOR UPDATE USING (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "cats_delete" ON cats
  FOR DELETE USING (household_id = my_household_id() AND my_role() = 'owner');

-- cat_groups ────────────────────────────────────────────────────────────
CREATE POLICY "cat_groups_select" ON cat_groups
  FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "cat_groups_insert" ON cat_groups
  FOR INSERT WITH CHECK (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "cat_groups_update" ON cat_groups
  FOR UPDATE USING (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "cat_groups_delete" ON cat_groups
  FOR DELETE USING (household_id = my_household_id() AND my_role() = 'owner');

-- cat_group_members ─────────────────────────────────────────────────────
CREATE POLICY "cat_group_members_select" ON cat_group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cat_groups g WHERE g.id = group_id AND g.household_id = my_household_id())
  );
CREATE POLICY "cat_group_members_insert" ON cat_group_members
  FOR INSERT WITH CHECK (
    my_role() = 'owner'
    AND EXISTS (SELECT 1 FROM cat_groups g WHERE g.id = group_id AND g.household_id = my_household_id())
  );
CREATE POLICY "cat_group_members_delete" ON cat_group_members
  FOR DELETE USING (
    my_role() = 'owner'
    AND EXISTS (SELECT 1 FROM cat_groups g WHERE g.id = group_id AND g.household_id = my_household_id())
  );

-- food_types ────────────────────────────────────────────────────────────
CREATE POLICY "food_types_select" ON food_types
  FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "food_types_insert" ON food_types
  FOR INSERT WITH CHECK (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "food_types_update" ON food_types
  FOR UPDATE USING (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "food_types_delete" ON food_types
  FOR DELETE USING (household_id = my_household_id() AND my_role() = 'owner');

-- habit_definitions ─────────────────────────────────────────────────────
CREATE POLICY "habit_definitions_select" ON habit_definitions
  FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "habit_definitions_insert" ON habit_definitions
  FOR INSERT WITH CHECK (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "habit_definitions_update" ON habit_definitions
  FOR UPDATE USING (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "habit_definitions_delete" ON habit_definitions
  FOR DELETE USING (household_id = my_household_id() AND my_role() = 'owner');

-- nfc_tags ──────────────────────────────────────────────────────────────
CREATE POLICY "nfc_tags_select" ON nfc_tags
  FOR SELECT USING (household_id = my_household_id());
CREATE POLICY "nfc_tags_insert" ON nfc_tags
  FOR INSERT WITH CHECK (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "nfc_tags_update" ON nfc_tags
  FOR UPDATE USING (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "nfc_tags_delete" ON nfc_tags
  FOR DELETE USING (household_id = my_household_id() AND my_role() = 'owner');

-- feeding_logs / play_logs / habit_logs / weight_logs / notes ──────────
-- (kein household_id direkt vorhanden → Join über cats)

CREATE POLICY "feeding_logs_select" ON feeding_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "feeding_logs_insert" ON feeding_logs
  FOR INSERT WITH CHECK (
    my_role() IN ('owner', 'member', 'guest')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "feeding_logs_update" ON feeding_logs
  FOR UPDATE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "feeding_logs_delete" ON feeding_logs
  FOR DELETE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );

CREATE POLICY "play_logs_select" ON play_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "play_logs_insert" ON play_logs
  FOR INSERT WITH CHECK (
    my_role() IN ('owner', 'member', 'guest')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "play_logs_update" ON play_logs
  FOR UPDATE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "play_logs_delete" ON play_logs
  FOR DELETE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );

CREATE POLICY "habit_logs_select" ON habit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "habit_logs_insert" ON habit_logs
  FOR INSERT WITH CHECK (
    my_role() IN ('owner', 'member', 'guest')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "habit_logs_update" ON habit_logs
  FOR UPDATE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "habit_logs_delete" ON habit_logs
  FOR DELETE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );

CREATE POLICY "weight_logs_select" ON weight_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "weight_logs_insert" ON weight_logs
  FOR INSERT WITH CHECK (
    my_role() IN ('owner', 'member', 'guest')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "weight_logs_update" ON weight_logs
  FOR UPDATE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "weight_logs_delete" ON weight_logs
  FOR DELETE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );

CREATE POLICY "notes_select" ON notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "notes_insert" ON notes
  FOR INSERT WITH CHECK (
    my_role() IN ('owner', 'member', 'guest')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "notes_update" ON notes
  FOR UPDATE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );
CREATE POLICY "notes_delete" ON notes
  FOR DELETE USING (
    my_role() IN ('owner', 'member')
    AND EXISTS (SELECT 1 FROM cats c WHERE c.id = cat_id AND c.household_id = my_household_id())
  );

-- invites ───────────────────────────────────────────────────────────────
CREATE POLICY "invites_select" ON invites
  FOR SELECT USING (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "invites_insert" ON invites
  FOR INSERT WITH CHECK (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "invites_delete" ON invites
  FOR DELETE USING (household_id = my_household_id() AND my_role() = 'owner');

-- guest_links ───────────────────────────────────────────────────────────
CREATE POLICY "guest_links_select" ON guest_links
  FOR SELECT USING (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "guest_links_insert" ON guest_links
  FOR INSERT WITH CHECK (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "guest_links_update" ON guest_links
  FOR UPDATE USING (household_id = my_household_id() AND my_role() = 'owner');
CREATE POLICY "guest_links_delete" ON guest_links
  FOR DELETE USING (household_id = my_household_id() AND my_role() = 'owner');
