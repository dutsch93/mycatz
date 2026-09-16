-- Kritischer Fix: profiles_insert_first_owner prüfte "existiert schon ein Profil
-- für diesen Haushalt?" per Subquery direkt auf profiles — diese Subquery
-- unterliegt aber selbst der profiles_select-Policy. Für einen profillosen
-- Nutzer liefert my_household_id() NULL, wodurch die Subquery IMMER leer
-- zurückkommt (auch wenn der Haushalt längst einen Owner hat) und NOT EXISTS
-- damit IMMER true ist. Jeder authentifizierte Nutzer ohne eigenes Profil
-- konnte sich dadurch mit bekannter household_id als Owner in einen fremden,
-- bereits existierenden Haushalt einschleusen (voller Lese-/Schreib-/Lösch-
-- Zugriff auf Katzen, Logs, Einladungen, Gast-Links). Exploit wurde gegen
-- die Live-DB verifiziert (Transaktion zurückgerollt, nichts persistiert).
--
-- Fix: SECURITY-DEFINER-Hilfsfunktion, die RLS bei der Prüfung umgeht
-- (wie schon my_household_id()/my_role()), statt einer roh gefilterten
-- Subquery auf profiles.

CREATE OR REPLACE FUNCTION household_has_profile(target_household_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles p WHERE p.household_id = target_household_id);
$$;

DROP POLICY IF EXISTS "profiles_insert_first_owner" ON profiles;

CREATE POLICY "profiles_insert_first_owner" ON profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
    AND role = 'owner'
    AND household_id IS NOT NULL
    AND NOT household_has_profile(household_id)
  );
