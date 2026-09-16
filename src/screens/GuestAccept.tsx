import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Gast-Zugang ohne eigenen Account: anonyme Supabase-Session + RPC, die
// (falls der Link gültig ist) ein Gast-Profil für diese Session anlegt.
export default function GuestAccept() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function join() {
    if (!token) return
    setJoining(true)
    setError(null)
    try {
      let userId = (await supabase.auth.getSession()).data.session?.user.id
      if (!userId) {
        const { data, error: anonError } = await supabase.auth.signInAnonymously()
        if (anonError) throw anonError
        userId = data.user?.id
      }
      if (!userId) throw new Error('Anmeldung als Gast fehlgeschlagen.')

      const { error: rpcError } = await supabase.rpc('redeem_guest_link', {
        p_token: token,
        p_display_name: displayName.trim(),
      })
      if (rpcError) throw new Error(rpcError.message)

      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gast-Link konnte nicht eingelöst werden.')
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="max-w-app w-full text-center flex flex-col gap-4">
        <div className="text-5xl">🐾</div>
        <h2>Als Gast beitreten</h2>
        <p className="text-text-secondary">
          Du kannst ohne eigenen Account Fütterungen, Spielzeit und Habits eintragen. Bearbeiten
          und Löschen ist als Gast nicht möglich.
        </p>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Dein Name (optional)"
          className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
        {error && <p className="text-[13px] text-muted-red">{error}</p>}
        <button
          type="button"
          onClick={join}
          disabled={joining}
          className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
        >
          {joining ? 'Wird verbunden…' : 'Als Gast beitreten'}
        </button>
      </div>
    </div>
  )
}
