import type { OnboardingDraft } from '../../lib/onboardingDraft'

interface Props {
  draft: OnboardingDraft
  onChange: (draft: OnboardingDraft) => void
}

function toggleHabit(draft: OnboardingDraft, localId: string): OnboardingDraft {
  return {
    ...draft,
    habits: draft.habits.map((h) =>
      h.localId === localId ? { ...h, selected: !h.selected } : h,
    ),
  }
}

export default function StepHabits({ draft, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2>Habits</h2>
        <p className="text-[13px] text-text-secondary mt-1">
          Diese Gewohnheiten schlagen wir vor — wähle ab, was ihr nicht tracken wollt.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {draft.habits.map((h) => (
          <label
            key={h.localId}
            className={`flex items-center gap-3 rounded-card px-3 py-2 border-[0.5px] ${
              h.selected ? 'bg-card border-border' : 'bg-input border-border opacity-60'
            }`}
          >
            <input
              type="checkbox"
              checked={h.selected}
              onChange={() => onChange(toggleHabit(draft, h.localId))}
              className="w-5 h-5"
            />
            <span className="text-xl leading-none">{h.emoji}</span>
            <span className="text-text-primary">{h.name}</span>
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-text-secondary">Spielzeit-Tagesziel (Minuten)</span>
        <input
          type="number"
          value={draft.playTargetMin}
          onChange={(e) => onChange({ ...draft, playTargetMin: Number(e.target.value) })}
          className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
      </label>
    </div>
  )
}
