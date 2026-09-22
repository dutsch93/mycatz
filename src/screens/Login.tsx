import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Login für Rückkehrer (Haushalt existiert bereits) — im Unterschied zum
// Onboarding-Wizard wird hier kein neuer Haushalt angelegt, nur eingeloggt.
//
// Zusätzlich zum Magic-Link gibt es eine Code-Eingabe: Als Home-Screen-App
// gespeichert (iOS "standalone" Modus) hat die App einen eigenen, von Safari
// getrennten Speicherbereich. Der Magic-Link öffnet aber immer in Safari
// (Mail-Apps können Links nicht in einer bereits installierten Web-App
// öffnen), die Session landet dort und nie in der Home-Screen-App. Der Code
// wird direkt in der App eingegeben, egal in welchem Kontext sie läuft.
export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  async function handleLogin() {
    if (!email.trim()) return
    setSending(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          // Kein neuer Account bei unbekannter/falsch getippter E-Mail — nur bestehende
          // Nutzer (mit Haushalt aus dem Onboarding) sollen sich hier einloggen können.
          shouldCreateUser: false,
        },
      })
      if (authError) throw authError
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error && err.message.toLowerCase().includes('signups not allowed')
          ? 'Für diese E-Mail existiert noch kein Haushalt. Bitte starte zuerst das Onboarding.'
          : err instanceof Error
            ? err.message
            : 'E-Mail konnte nicht gesendet werden.',
      )
    } finally {
      setSending(false)
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) return
    setVerifying(true)
    setError(null)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      })
      if (verifyError) throw verifyError
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code konnte nicht bestätigt werden.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="max-w-app w-full text-center flex flex-col gap-4">
        {sent ? (
          <>
            <div className="text-5xl">📬</div>
            <h2>Fast geschafft!</h2>
            <p className="text-text-secondary">
              Wir haben dir einen Login-Link an <strong>{email}</strong> geschickt. Öffne die
              E-Mail auf diesem Gerät und tippe auf den Link.
            </p>
            <p className="text-[13px] text-text-secondary">
              App als Home-Screen-Icon gespeichert? Der Link öffnet dann Safari statt der App —
              gib stattdessen den Code aus der E-Mail hier ein:
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-stelliger Code"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border text-center"
            />
            {error && <p className="text-[13px] text-muted-red">{error}</p>}
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={!code.trim() || verifying}
              className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
            >
              {verifying ? 'Wird geprüft…' : 'Code bestätigen'}
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl">🐾</div>
            <h2>Anmelden</h2>
            <p className="text-text-secondary">
              Gib deine E-Mail-Adresse ein, wir schicken dir einen Login-Link.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail-Adresse"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            {error && <p className="text-[13px] text-muted-red">{error}</p>}
            <button
              type="button"
              onClick={handleLogin}
              disabled={!email.trim() || sending}
              className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
            >
              {sending ? 'Wird gesendet…' : 'Login-Link senden'}
            </button>
            <p className="text-[13px] text-text-secondary">
              Noch keinen Haushalt?{' '}
              <Link to="/onboarding" className="text-apricot underline">
                Onboarding starten
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
