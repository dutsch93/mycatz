// Web NFC (nur Android + Chrome). Auf iOS gibt es keine Web-NFC-API — dort läuft
// das Tag-Scannen über die Kurzbefehle-App, die stattdessen die App-URL mit
// ?nfc=TAG_ID öffnet (siehe NFC_QUERY_PARAM unten und Settings-Screen).

export const NFC_QUERY_PARAM = 'nfc'

export function isWebNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window
}

export function buildNfcShortcutUrl(tagIdentifier: string): string {
  return `${window.location.origin}/?${NFC_QUERY_PARAM}=${encodeURIComponent(tagIdentifier)}`
}

// Startet einen einmaligen Scan-Vorgang (muss durch eine Nutzer-Interaktion ausgelöst werden,
// z. B. einen Button-Klick) und liefert die Tag-Kennung des nächsten gescannten Tags.
export function scanNfcTag(onTag: (tagIdentifier: string) => void, onError: (message: string) => void) {
  if (!isWebNfcSupported()) {
    onError('Web NFC wird auf diesem Gerät/Browser nicht unterstützt (nur Android + Chrome).')
    return () => {}
  }

  // NDEFReader ist nicht in allen TS-Lib-Definitionen enthalten, daher hier als any.
  const NDEFReaderCtor = (window as unknown as { NDEFReader: new () => any }).NDEFReader
  const reader = new NDEFReaderCtor()
  let cancelled = false

  reader
    .scan()
    .then(() => {
      reader.onreading = (event: { serialNumber: string }) => {
        if (!cancelled && event.serialNumber) onTag(event.serialNumber)
      }
      reader.onreadingerror = () => {
        if (!cancelled) onError('Tag konnte nicht gelesen werden. Bitte erneut versuchen.')
      }
    })
    .catch((err: Error) => onError(err.message || 'NFC-Scan konnte nicht gestartet werden.'))

  return () => {
    cancelled = true
  }
}
