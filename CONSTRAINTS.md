# Constraints

Last reviewed: 2026-09-16

Diese Datei legt fest, was "fertig genug" für dieses Projekt heißt — mit
Zahlen, nicht nur Bauchgefühl. Vor jeder Code-Änderung lesen, nicht
aufweichen, nur um eine Änderung durchzubekommen.

## Floor (immer durchgesetzt, blockiert)

- Keine neuen Unterdrückungs-Kommentare: `@ts-ignore`, `eslint-disable`
- Keine unfertigen Stubs: `throw new Error("Not implemented")`, leere `catch {}`
- Keine übersprungenen/gelöschten Tests ohne Begründung im Commit
- Keine Secrets im Quellcode (Supabase-Keys etc. nur über `.env.local`, nie hart codiert)
- Diese Datei wird nicht aufgeweicht, nur um eine Änderung durchzubekommen

## Enforced mit Zahlen

| Dimension | Regel                              | Geprüft mit                        | Läuft wann     | Verhalten |
|-----------|-------------------------------------|-------------------------------------|----------------|-----------|
| Types     | Null Typfehler                      | `tsc -b --noEmit`                   | jede Änderung  | blockiert |
| Lint      | Null ESLint-Fehler (Warnungen ok)   | `eslint .`                          | jede Änderung  | blockiert |
| Coverage  | Projekt-Coverage darf nicht sinken  | `vitest run --coverage`             | Task-Ende      | warnt vorerst |

`npm run check:fast` = Types + Lint (Ziel: < 90s).
`npm run check:task` = check:fast + Coverage.

## Gemessen, noch nicht hart durchgesetzt (Ratchet — darf nicht schlechter werden)

| Metrik                          | Stand 2026-09-22 | Richtung        |
|----------------------------------|-------------------|-----------------|
| Projekt-Coverage (Statements)    | 2.25%             | darf nicht sinken |
| Bundle-Größe (JS, gzip)          | ~249 kB            | darf nicht wachsen |

Bundle-Größe am 2026-09-22 von ~241 kB auf ~249 kB angehoben: Liquid-
Glass-Umbau hat `lucide-react` als neue Dependency eingeführt (viele
einzeln importierte Icons über die App verteilt). Tree-Shaking greift
bereits (kein Full-Bundle-Import), der Zuwachs ist der erwartete Preis
für die Icon-Migration weg von Emoji.

Die Projekt-Coverage ist niedrig, weil bisher nur reine Logik (`src/lib/`)
getestet ist — UI-Screens/Hooks haben noch keine Tests. Das ist der
ehrliche Ist-Zustand, keine erfundene Zielzahl. Neue reine Logik (Hooks,
`lib/`-Funktionen) sollte beim Schreiben Tests bekommen; für UI-Screens
gibt es aktuell keine Pflicht.

## Bewusst nicht eingerichtet

- **Barrierefreiheit (axe-core)** und **Security-Scan** (Secrets/Dependencies):
  auf Wunsch zurückgestellt, können später ergänzt werden
- **CI-Pipeline (GitHub Actions)**: bisher nur lokale Checks, kein CI

## Exceptions

| ID | Regel | Pfad | Grund | Owner | Läuft ab |
|----|-------|------|-------|-------|----------|
| —  | —     | —    | —     | —     | —        |

(noch keine Ausnahmen)
