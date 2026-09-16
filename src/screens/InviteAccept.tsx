import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Annahme einer Einladung per Magic Link. Ablauf:
// 1. Nutzer öffnet /invite/:token (noch nicht eingeloggt) → E-Mail + Name eingeben
// 2. Magic Link wird geschickt, Token+Name werden lokal gemerkt
// 3. Nutzer klickt den Link → Supabase erzeugt eine Session auf dieser Seite
// 4. Wir rufen die RPC redeem_invite auf, die das Profil anlegt und zum Home-Screen weiterleitet
const DRAFT_KEY = 'mycatz_pending_invite'

type Status = 'form' | 'sent' | 'redeeming' | 'error'

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [status, setStatus] = useState<Status>('form')
  const [error, setError] = useState<string | null>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function redeem() {
      if (cancelled || hasStartedRef.current) return
      hasStartedRef.current = true
      setStatus('redeeming')
      const stored = localStorage.getItem(DRAFT_KEY)
      const draft = stored ? (JSON.parse(stored) as { token: string; displayName: string }) : null
      try {
        const { error: rpcError } = await supabase.rpc('redeem_invite', {
          p_token: token,
          p_display_name: draft?.displayName ?? '',
        })
        if (rpcError) throw rpcError
        localStorage.removeItem(DRAFT_KEY)
        navigate('/', { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Einladung konnte nicht eingelöst werden.')
        setStatus('error')
        hasStartedRef.current = false
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) redeem()
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) redeem()
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [token, navigate])

  async function sendLink() {
    if (!email.trim() || !token) return
    setError(null)
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ token, displayName: displayName.trim() }))
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/invite/${token}`,
        shouldCreateUser: true,
      },
    })
    if (authError) {
      setError(authError.message)
      return
    }
    setStatus('sent')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="max-w-app w-full text-center flex flex-col gap-4">
        {status === 'redeeming' && (
          <>
            <div className="text-5xl">🐾</div>
            <h2>Einladung wird eingelöst…</h2>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl">⚠️</div>
            <h2>Da ist etwas schiefgelaufen</h2>
            <p className="text-muted-red">{error}</p>
          </>
        )}

        {status === 'sent' && (
          <>
            <div className="text-5xl">📬</div>
            <h2>Fast geschafft!</h2>
            <p className="text-text-secondary">
              Wir haben dir einen Link an <strong>{email}</strong> geschickt. Öffne die E-Mail auf
              diesem Gerät und tippe auf den Link.
            </p>
          </>
        )}

        {status === 'form' && (
          <>
            <div className="text-5xl">🐾</div>
            <h2>Du wurdest eingeladen!</h2>
            <p className="text-text-secondary">
              Gib deine E-Mail-Adresse ein, um dem Haushalt beizutreten.
            </p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Dein Name"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
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
              onClick={sendLink}
              disabled={!email.trim()}
              className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
            >
              Link senden
            </button>
          </>
        )}
      </div>
    </div>
  )
}
