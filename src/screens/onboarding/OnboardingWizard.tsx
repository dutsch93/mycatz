import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  createEmptyDraft,
  saveDraft,
  makeLocalId,
  type OnboardingDraft,
} from '../../lib/onboardingDraft'
import { DEFAULT_FOOD_TYPES, DEFAULT_HABITS } from '../../lib/defaults'
import StepHousehold from './StepHousehold'
import StepCats from './StepCats'
import StepFood from './StepFood'
import StepHabits from './StepHabits'

const TOTAL_STEPS = 4

function seedDraft(): OnboardingDraft {
  const draft = createEmptyDraft()
  draft.foodTypes = DEFAULT_FOOD_TYPES.map((f) => ({
    localId: makeLocalId(),
    name: f.name,
    category: f.category,
    defaultPortionG: f.defaultPortionG,
    selected: true,
  }))
  draft.habits = DEFAULT_HABITS.map((h) => ({
    localId: makeLocalId(),
    emoji: h.emoji,
    name: h.name,
    type: h.type,
    options: h.options,
    hasRequiredCount: h.hasRequiredCount ?? false,
    category: h.category,
    selected: true,
  }))
  return draft
}

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<OnboardingDraft>(seedDraft)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function goNext() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function handleFinish() {
    setError(null)
    setSending(true)
    try {
      saveDraft(draft)
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: draft.ownerEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding/complete`,
        },
      })
      if (authError) throw authError
      navigate('/onboarding/check-email', { state: { email: draft.ownerEmail } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-Mail konnte nicht gesendet werden.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-page px-4 py-6">
      <div className="max-w-app mx-auto">
        {/* Fortschrittsbalken: 4 Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((dot) => (
            <span
              key={dot}
              className={`w-2.5 h-2.5 rounded-full ${
                dot === step ? 'bg-apricot' : dot < step ? 'bg-sage' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {step === 1 && <StepHousehold draft={draft} onChange={setDraft} />}
        {step === 2 && <StepCats draft={draft} onChange={setDraft} />}
        {step === 3 && <StepFood draft={draft} onChange={setDraft} />}
        {step === 4 && <StepHabits draft={draft} onChange={setDraft} />}

        {error && (
          <p className="mt-4 text-[13px] text-muted-red">{error}</p>
        )}

        <div className="flex items-center gap-3 mt-8">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="flex-1 min-h-[44px] rounded-control border-[0.5px] border-border bg-card text-text-primary"
            >
              Zurück
            </button>
          )}
          {step < TOTAL_STEPS && (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 min-h-[44px] rounded-control bg-apricot text-text-on-color"
            >
              Weiter
            </button>
          )}
          {step === TOTAL_STEPS && (
            <button
              type="button"
              onClick={handleFinish}
              disabled={sending}
              className="flex-1 min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
            >
              {sending ? 'Wird gesendet…' : 'Fertig'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
