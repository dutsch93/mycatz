# Todo: Vercel-Deployment für MyCatz

Siehe `tasks/plan.md` für den Gesamtüberblick, Architektur-Entscheidungen und Risiken.

## Phase 1: Vorbereitung im Repo

### Task 1: `vercel.json` mit SPA-Rewrite anlegen

**Description:** React Router läuft im History-Mode (echte Pfade wie `/settings`,
`/invite/:token`). Vercels Zero-Config-Vite-Preset liefert standardmäßig nur
statische Dateien aus — ein Reload oder Direktaufruf eines Unterpfads würde
ohne Rewrite-Regel einen 404 zurückgeben. `vercel.json` mit einer
Catch-all-Rewrite auf `/index.html` behebt das.

**Acceptance criteria:**
- [x] `vercel.json` existiert im Repo-Root mit einer Rewrite-Regel, die alle Pfade auf `/index.html` umleitet
- [x] Bestehende statische Assets (`/icons/*.png`, `/manifest.json`, `/sw.js`) bleiben direkt erreichbar (Vercels Standard-Reihenfolge: Dateisystem-Treffer gewinnen immer vor Rewrites)

**Verification:**
- [x] Build succeeds: `npm run build`
- [ ] Manual check: echte Verifikation erst nach dem Vercel-Deploy in Task 4

**Dependencies:** None

**Files likely touched:**
- `vercel.json` (neu)

**Estimated scope:** XS (1 Datei)

---

## Phase 2: Vercel-Projekt & Deployment

### Task 2: Vercel-Projekt anlegen und mit GitHub-Repo verbinden

**Description:** Ein neues Vercel-Projekt für `dutsch93/mycatz` anlegen,
verbunden mit dem `main`-Branch für automatische Production-Deploys bei
jedem Push (siehe globales CLAUDE.md). Kein Code-Change, sondern eine
externe Konfigurationsaktion.

**Acceptance criteria:**
- [x] Vercel-Projekt existiert und ist mit dem GitHub-Repo verknüpft
- [x] Framework-Preset "Vite" erkannt (Build-Command `tsc -b && vite build`, Output-Verzeichnis `dist`)
- [x] Auto-Deploy bei Push auf `main` ist aktiv (per Leer-Commit verifiziert)

**Verification:**
- [x] Manual check: Projekt ist im Vercel-Dashboard sichtbar, Production-Domain `https://mycatz.vercel.app`

**Dependencies:** Task 1 (Rewrite sollte vor dem ersten Deploy committet sein)

**Files likely touched:** keine (externe Konfiguration)

**Estimated scope:** XS

---

### Task 3: Umgebungsvariablen in Vercel hinterlegen

**Description:** `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` (identisch
zu `.env.local`) als Environment-Variablen im Vercel-Projekt setzen, damit
der Build denselben Supabase-Client konfiguriert wie lokal.

**Acceptance criteria:**
- [x] Beide Variablen sind für "Production" gesetzt (vom Nutzer beim Import eingetragen)
- [x] Werte stimmen mit dem aktiven Supabase-Projekt überein (Build/App funktioniert live)

**Verification:**
- [x] Manual check: Variablen sind im Vercel-Dashboard unter Settings → Environment Variables sichtbar

**Dependencies:** Task 2

**Files likely touched:** keine (externe Konfiguration)

**Estimated scope:** XS

---

### Task 4: Erst-Deployment auslösen und Build-Log prüfen

**Description:** Deployment antriggern (Push auf `main` oder manueller
Deploy-Trigger) und das Build-Log auf Fehler prüfen.

**Acceptance criteria:**
- [x] Deployment-Status ist "Ready" / erfolgreich
- [x] Production-URL liefert die App aus (`https://mycatz.vercel.app/` → 200, kein weißer Screen)
- [x] Direktaufruf eines Unterpfads (`/settings`) liefert die App statt 404 (verifiziert per curl: 200, Titel "MyCatz")

**Verification:**
- [x] Manual check: `curl` gegen Production-URL — root, `/settings`, `/manifest.json`, `/sw.js` alle 200

**Dependencies:** Task 2, Task 3

**Files likely touched:** keine

**Estimated scope:** XS

---

## Checkpoint: Deployment steht

- [ ] Production-URL ist erreichbar, Build ist grün
- [ ] **Review mit Nutzer**, bevor Supabase-Auth-Config angefasst wird (Task 5 ändert eine geteilte, produktive Einstellung)

---

## Phase 3: Auth-Konfiguration & Verifikation

### Task 5: Supabase Redirect-URLs um Vercel-Domain(s) erweitern

**Description:** Im Supabase-Dashboard (Authentication → URL Configuration)
die neue Vercel-Production-Domain zu den erlaubten Redirect-URLs
hinzufügen. Ohne diesen Schritt schlagen Magic-Link-Login,
Einladungs-Redemption und Gast-Links auf der Live-Domain fehl (der
`emailRedirectTo`-Wert wird dynamisch aus `window.location.origin`
gebildet, muss aber serverseitig auf der Allowlist stehen).

**Acceptance criteria:**
- [x] Production-Domain `https://mycatz.vercel.app/**` steht in der Redirect-URL-Allowlist
- [x] Entscheidung: Preview-Deployments erstmal ausgelassen (nur Production-Domain eingetragen)

**Verification:**
- [x] Manual check: vom Nutzer im Supabase-Dashboard eingetragen und bestätigt

**Dependencies:** Task 4 (Domain muss feststehen)

**Files likely touched:** keine (externe Konfiguration, außerhalb des Repos)

**Estimated scope:** XS

**⚠️ Achtung:** Ändert eine geteilte Produktiv-Einstellung (wirkt sich auf alle bestehenden Nutzer-Logins aus) — vor Ausführung kurz Bescheid geben.

---

### Task 6: End-to-End-Test auf der Live-URL

**Description:** Kompletten Login-/Onboarding-Flow einmal live durchspielen,
um zu bestätigen, dass Deployment und Auth-Konfiguration zusammenspielen.

**Acceptance criteria:**
- [x] Magic-Link-Login auf der Production-URL funktioniert (bestehender Account)
- [x] NFC-iOS-Fallback-URL in den Settings zeigt jetzt die Production-Domain statt `localhost` (folgt automatisch aus `window.location.origin`)

**Verification:**
- [x] Manual check: Login-Flow komplett durchgeklickt — funktioniert live auf `mycatz.vercel.app`

**Nachtrag:** Erster Build schlug mit weißem Screen fehl, weil `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
beim ersten Vercel-Import nicht tatsächlich gespeichert wurden (Vite backt Env-Vars zur
Build-Zeit ein). Per Bundle-Analyse (`curl` + `grep` auf die ausgelieferte JS-Datei)
diagnostiziert, nachgetragen, Redeploy ausgelöst und verifiziert.

**Dependencies:** Task 5

**Files likely touched:** keine

**Estimated scope:** XS

---

## Checkpoint: Fertig

- [x] Login/Onboarding funktioniert auf der Live-Domain (`https://mycatz.vercel.app`)
- [x] Push auf `main` löst automatisch ein neues Deployment aus (mehrfach verifiziert)
- [x] Offene Fragen aus `tasks/plan.md` beantwortet: `*.vercel.app`-Domain reicht, Preview-Deployments erstmal ausgelassen
