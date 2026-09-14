import { useState } from 'react'
import { makeLocalId, type OnboardingDraft } from '../../lib/onboardingDraft'
import type { FoodCategory } from '../../types'

interface Props {
  draft: OnboardingDraft
  onChange: (draft: OnboardingDraft) => void
}

function toggleFoodType(draft: OnboardingDraft, localId: string): OnboardingDraft {
  return {
    ...draft,
    foodTypes: draft.foodTypes.map((f) =>
      f.localId === localId ? { ...f, selected: !f.selected } : f,
    ),
  }
}

function updatePortion(draft: OnboardingDraft, localId: string, value: number): OnboardingDraft {
  return {
    ...draft,
    foodTypes: draft.foodTypes.map((f) =>
      f.localId === localId ? { ...f, defaultPortionG: value } : f,
    ),
  }
}

function updateCatTarget(draft: OnboardingDraft, catLocalId: string, value: number): OnboardingDraft {
  return {
    ...draft,
    cats: draft.cats.map((c) =>
      c.localId === catLocalId ? { ...c, dailyFoodTargetG: value } : c,
    ),
  }
}

export default function StepFood({ draft, onChange }: Props) {
  const [customName, setCustomName] = useState('')

  function addCustomFoodType() {
    if (!customName.trim()) return
    onChange({
      ...draft,
      foodTypes: [
        ...draft.foodTypes,
        {
          localId: makeLocalId(),
          name: customName.trim(),
          category: 'custom' as FoodCategory,
          defaultPortionG: 50,
          selected: true,
        },
      ],
    })
    setCustomName('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2>Futterarten</h2>
        <p className="text-[13px] text-text-secondary mt-1">
          Wähle aus, was ihr füttert, und passt die Standard-Portion an.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {draft.foodTypes.map((f) => (
          <div
            key={f.localId}
            className={`flex items-center justify-between rounded-card px-3 py-2 border-[0.5px] ${
              f.selected ? 'bg-card border-border' : 'bg-input border-border opacity-60'
            }`}
          >
            <button
              type="button"
              onClick={() => onChange(toggleFoodType(draft, f.localId))}
              className="flex-1 text-left text-text-primary"
            >
              {f.name}
            </button>
            {f.selected && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={f.defaultPortionG}
                  onChange={(e) =>
                    onChange(updatePortion(draft, f.localId, Number(e.target.value)))
                  }
                  className="w-16 min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border text-right"
                />
                <span className="text-[13px] text-text-secondary">g</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Eigene Futterart hinzufügen"
          className="flex-1 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
        <button
          type="button"
          onClick={addCustomFoodType}
          disabled={!customName.trim()}
          className="min-h-[44px] px-4 rounded-control bg-apricot text-text-on-color disabled:opacity-60"
        >
          +
        </button>
      </div>

      {draft.cats.length > 0 && (
        <div>
          <h3 className="text-[16px] mb-2">Tagesziel Futter pro Katze</h3>
          <div className="flex flex-col gap-2">
            {draft.cats.map((cat) => (
              <label
                key={cat.localId}
                className="flex items-center justify-between bg-card border-[0.5px] border-border rounded-card px-3 py-2"
              >
                <span className="text-text-primary">{cat.name}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={cat.dailyFoodTargetG}
                    onChange={(e) =>
                      onChange(updateCatTarget(draft, cat.localId, Number(e.target.value)))
                    }
                    className="w-20 min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border text-right"
                  />
                  <span className="text-[13px] text-text-secondary">g/Tag</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
