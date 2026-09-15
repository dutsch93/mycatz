import { useState } from 'react'
import { makeLocalId, type DraftCat, type OnboardingDraft } from '../../lib/onboardingDraft'

interface Props {
  draft: OnboardingDraft
  onChange: (draft: OnboardingDraft) => void
}

const AGE_OPTIONS = Array.from({ length: 21 }, (_, i) => i) // 0–20 Jahre
const KG_OPTIONS = Array.from({ length: 21 }, (_, i) => i) // 0–20 kg
const DEZI_OPTIONS = Array.from({ length: 10 }, (_, i) => i) // 0–9 (eine Nachkommastelle)

function ageLabel(years: number) {
  return years === 1 ? '1 Jahr' : `${years} Jahre`
}

function emptyCatForm() {
  return { name: '', age: '', breed: '', weightKgPart: '', weightDeziPart: '0', tagsInput: '' }
}

export default function StepCats({ draft, onChange }: Props) {
  const [form, setForm] = useState(emptyCatForm())

  function addCat() {
    if (!form.name.trim()) return
    const weightKg = form.weightKgPart
      ? `${form.weightKgPart}.${form.weightDeziPart || '0'}`
      : ''
    const newCat: DraftCat = {
      localId: makeLocalId(),
      name: form.name.trim(),
      age: form.age.trim(),
      breed: form.breed.trim(),
      weightKg,
      tags: form.tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      dailyFoodTargetG: 200,
      dailyPlayTargetMin: 15,
    }
    onChange({ ...draft, cats: [...draft.cats, newCat] })
    setForm(emptyCatForm())
  }

  function removeCat(localId: string) {
    onChange({ ...draft, cats: draft.cats.filter((c) => c.localId !== localId) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2>Eure Katze(n)</h2>
        <p className="text-[13px] text-text-secondary mt-1">
          Füge eine oder mehrere Katzen hinzu. Tagesziele legt ihr im nächsten Schritt fest.
        </p>
      </div>

      {draft.cats.length > 0 && (
        <div className="flex flex-col gap-2">
          {draft.cats.map((cat) => (
            <div
              key={cat.localId}
              className="flex items-center justify-between bg-card border-[0.5px] border-border rounded-card px-3 py-2"
            >
              <div>
                <p className="text-text-primary">{cat.name}</p>
                <p className="text-[13px] text-text-secondary">
                  {[cat.age, cat.breed].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeCat(cat.localId)}
                className="w-11 h-11 flex items-center justify-center text-muted-red"
                aria-label={`${cat.name} entfernen`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border-[0.5px] border-border rounded-card p-3 flex flex-col gap-3">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Name"
          className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
        <input
          type="text"
          value={form.breed}
          onChange={(e) => setForm({ ...form, breed: e.target.value })}
          placeholder="Rasse"
          className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
        <div className="flex gap-3">
          <select
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className="flex-1 min-w-0 min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border text-text-primary"
          >
            <option value="">Alter</option>
            {AGE_OPTIONS.map((y) => (
              <option key={y} value={ageLabel(y)}>
                {ageLabel(y)}
              </option>
            ))}
          </select>

          <div className="flex-1 min-w-0 flex items-center gap-1 min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border">
            <select
              value={form.weightKgPart}
              onChange={(e) => setForm({ ...form, weightKgPart: e.target.value })}
              className="flex-1 min-w-0 bg-input text-text-primary"
              aria-label="Gewicht (kg)"
            >
              <option value="">–</option>
              {KG_OPTIONS.map((kg) => (
                <option key={kg} value={kg}>
                  {kg}
                </option>
              ))}
            </select>
            <span className="text-text-secondary">,</span>
            <select
              value={form.weightDeziPart}
              onChange={(e) => setForm({ ...form, weightDeziPart: e.target.value })}
              className="flex-1 min-w-0 bg-input text-text-primary"
              aria-label="Gewicht (100g-Schritte)"
            >
              {DEZI_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="text-text-secondary text-[13px]">kg</span>
          </div>
        </div>
        <input
          type="text"
          value={form.tagsInput}
          onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
          placeholder="Tags, mit Komma getrennt (z. B. sensibel, indoor)"
          className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
        <button
          type="button"
          onClick={addCat}
          disabled={!form.name.trim()}
          className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
        >
          Katze hinzufügen
        </button>
      </div>

      {draft.cats.length >= 2 && (
        <label className="flex items-center justify-between bg-card border-[0.5px] border-border rounded-card px-3 py-2">
          <div>
            <p className="text-text-primary">Als Gruppe verwalten</p>
            <p className="text-[13px] text-text-secondary">
              Fütterung/Habits gleichzeitig für alle loggen
            </p>
          </div>
          <input
            type="checkbox"
            checked={draft.createGroup}
            onChange={(e) => onChange({ ...draft, createGroup: e.target.checked })}
            className="w-5 h-5"
          />
        </label>
      )}

      {draft.createGroup && draft.cats.length >= 2 && (
        <input
          type="text"
          value={draft.groupName}
          onChange={(e) => onChange({ ...draft, groupName: e.target.value })}
          placeholder="Gruppenname (z. B. Luna & Milo)"
          className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
        />
      )}
    </div>
  )
}
