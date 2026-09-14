import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { loadDraft, clearDraft } from '../../lib/onboardingDraft'
import { commitOnboardingDraft } from '../../lib/onboardingCommit'

type Status = 'waiting' | 'saving' | 'error'

export default function CompleteOnboarding() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('waiting')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run(userId: string) {
      if (cancelled) return
      setStatus('saving')
      const draft = loadDraft()
      if (!draft) {
        setError('Es wurden keine Onboarding-Daten gefunden. Bitte starte den Wizard erneut.')
        setStatus('error')
        return
      }
      try {
        await commitOnboardingDraft(draft, userId)
        clearDraft()
        navigate('/', { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Einrichtung fehlgeschlagen.')
        setStatus('error')
      }
    }

    // Falls beim Laden bereits eine Session existiert (z. B. nach Reload)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) run(data.session.user.id)
    })

    // Supabase parst den Magic-Link-Token aus der URL und feuert SIGNED_IN
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        run(session.user.id)
      }
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="max-w-app w-full text-center flex flex-col gap-3">
        {status !== 'error' ? (
          <>
            <div className="text-5xl">🐾</div>
            <h2>Haushalt wird eingerichtet…</h2>
            <p className="text-text-secondary">Einen Moment, wir richten alles für euch ein.</p>
          </>
        ) : (
          <>
            <div className="text-5xl">⚠️</div>
            <h2>Da ist etwas schiefgelaufen</h2>
            <p className="text-muted-red">{error}</p>
          </>
        )}
      </div>
    </div>
  )
}
