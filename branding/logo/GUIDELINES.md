# MyCatz — Logo Guidelines (kompakt)

## 1. Das Logo
- **Idee**: Zwei Katzenohren über den beiden konzentrischen Tracking-Ringen des Home-Dashboards (Futter = apricot, Spielzeit = sage) — das Symbol ist ein direkter Verweis auf die App selbst, keine generische Katze.
- **Versionen**: horizontal (`lockup-horizontal.svg`) · gestapelt (`lockup-stacked.svg`) · nur Symbol (`symbol-master.svg`) · vereinfachtes Symbol für sehr kleine Größen (`symbol-small.svg`, ohne doppelten Ring)
- **Dateien**: `branding/logo/*.svg` sind die Master (für Web/Bildschirm, RGB). Für Druck gibt es aktuell keine CMYK-Variante — bei Bedarf separat beauftragen.

## 2. Schutzraum
Mindestabstand rundherum = Höhe eines Ohrs im jeweiligen Symbol (ca. 1/6 der Logohöhe). Skaliert mit der Logogröße, kein fester Pixelwert.

## 3. Mindestgröße
| Version | Bildschirm |
|---|---|
| Horizontal-Lockup | ab 96px Breite |
| Symbol | ab 24px — darunter `symbol-small.svg` verwenden (ist bereits die Basis für Favicon/App-Icon) |

## 4. Farbe
| Name | HEX | Verwendung |
|---|---|---|
| Apricot | `#E8A87C` | äußerer Ring / Ohren (Futter-Akzent) |
| Sage | `#85B79D` | innerer Ring (Spielzeit-Akzent) |
| Text-Primary | `#1C1C1E` | Schriftzug "MyCatz" |

**Freigegebene Logo/Hintergrund-Kombinationen**: Farbig auf Weiß/Cream (`#FFF7EE`) · Schwarz auf Weiß (`symbol-master-black.svg`) · Weiß auf dunklem/farbigem Grund (`symbol-master-white.svg`). Einfarbige Variante in Text-Primary: `symbol-master-mono-1c1c1e.svg`.

## 5. Typografie
Schriftzug "MyCatz" in **Inter**, Weight 500 (Google Fonts, bereits im Projekt via `index.html` eingebunden) — identisch zum UI-Headline-Style aus `CLAUDE.md`. Kein eigener Font fürs Logo.

## 6. Don'ts
Nicht verzerren oder stauchen · keine anderen Farben als oben · nicht rotieren · keine Schatten/Outlines/Gradients/Effekte hinzufügen · Ohren und Ring nicht einzeln neu anordnen · Schriftzug nicht selbst nachtippen, sondern `lockup-*.svg` verwenden · auf unruhigem Hintergrund die Variante mit Cream-Kachel (`variants/icon-512.png`) nutzen.

## 7. Dateien & Kontakt
Alle Master- und Exportdateien liegen in `branding/logo/` (Master-SVGs) und `branding/logo/variants/` (Schwarz/Weiß/Mono, Favicon-Set, App-Icon-Set, `site.webmanifest`, `head-snippet.html`). Präsentations-Board mit Mockups: `branding/logo/presentation.html` (im Browser öffnen).

**Hinweis zum Schriftzug**: Der Text in den Lockup-SVGs ist Live-Text (`<text>`, Font Inter), keine zu Pfaden konvertierten Buchstaben — bewusste Vereinfachung für dieses Projekt, da Inter bereits lizenzfrei über Google Fonts eingebunden ist. Für Druck/Fremdweitergabe ggf. vorher in Pfade konvertieren.
