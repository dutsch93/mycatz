import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Login für Rückkehrer (Haushalt existiert bereits) — im Unterschied zum
// Onboarding-Wizard wird hier kein neuer Haushalt angelegt, nur eingeloggt.
export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    if (!email.trim()) return
    setSending(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
      if (authError) throw authError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-Mail konnte nicht gesendet werden.')
    } finally {
      setSending(false)
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
