import { useState } from 'react'
import BottomSheet from '../shared/BottomSheet'
import ChipGrid from '../shared/ChipGrid'
import type { FoodType } from '../../types'

type Mode = 'menu' | 'feeding' | 'play' | 'weight' | 'note'

interface Props {
  open: boolean
  onClose: () => void
  foodTypes: FoodType[]
  onLogFeeding: (foodTypeId: string, amountG: number, note?: string) => Promise<void>
  onLogPlay: (durationMin: number, note?: string) => Promise<void>
  onLogWeight: (weightKg: number) => Promise<void>
  onLogNote: (text: string) => Promise<void>
}

export default function FeedingQuickAdd({
  open,
  onClose,
  foodTypes,
  onLogFeeding,
  onLogPlay,
  onLogWeight,
  onLogNote,
}: Props) {
  const [mode, setMode] = useState<Mode>('menu')
  const [foodTypeId, setFoodTypeId] = useState<string | null>(null)
  const [amountG, setAmountG] = useState('')
  const [playMin, setPlayMin] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  function reset() {
    setMode('menu')
    setFoodTypeId(null)
    setAmountG('')
    setPlayMin('')
    setWeightKg('')
    setNoteText('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function selectFoodType(id: string) {
    setFoodTypeId(id)
    const ft = foodTypes.find((f) => f.id === id)
    setAmountG(String(ft?.default_portion_g ?? ''))
  }

  async function saveFeeding() {
    if (!foodTypeId || !amountG) return
    setSaving(true)
    try {
      await onLogFeeding(foodTypeId, Number(amountG))
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  async function savePlay() {
    if (!playMin) return
    setSaving(true)
    try {
      await onLogPlay(Number(playMin))
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  async function saveWeight() {
    if (!weightKg) return
    setSaving(true)
    try {
      await onLogWeight(Number(weightKg))
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  async function saveNote() {
    if (!noteText.trim()) return
    setSaving(true)
    try {
      await onLogNote(noteText.trim())
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      {mode === 'menu' && (
        <div className="flex flex-col gap-2">
          <h3 className="mb-1">Was möchtest du loggen?</h3>
          <button
            type="button"
            onClick={() => setMode('feeding')}
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border text-left"
          >
            🍽️ Fütterung
          </button>
          <button
            type="button"
            onClick={() => setMode('play')}
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border text-left"
          >
            🎾 Spielzeit
          </button>
          <button
            type="button"
            onClick={() => setMode('weight')}
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border text-left"
          >
            ⚖️ Gewicht
          </button>
          <button
            type="button"
            onClick={() => setMode('note')}
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border text-left"
          >
            📝 Notiz
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] px-3 rounded-control text-text-secondary text-left"
          >
            Abbrechen
          </button>
        </div>
      )}

      {mode === 'feeding' && (
        <div className="flex flex-col gap-3">
          <h3>Fütterung</h3>
          <ChipGrid
            chips={foodTypes.map((f) => ({ id: f.id, label: f.name }))}
            selectedId={foodTypeId}
            onSelect={selectFoodType}
          />
          <input
            type="number"
            value={amountG}
            onChange={(e) => setAmountG(e.target.value)}
            placeholder="Menge in Gramm"
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
          />
          <button
            type="button"
            disabled={!foodTypeId || !amountG || saving}
            onClick={saveFeeding}
            className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
          >
            Speichern
          </button>
        </div>
      )}

      {mode === 'play' && (
        <div className="flex flex-col gap-3">
          <h3>Spielzeit</h3>
          <input
            type="number"
            value={playMin}
            onChange={(e) => setPlayMin(e.target.value)}
            placeholder="Minuten"
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            autoFocus
          />
          <button
            type="button"
            disabled={!playMin || saving}
            onClick={savePlay}
            className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
          >
            Speichern
          </button>
        </div>
      )}

      {mode === 'weight' && (
        <div className="flex flex-col gap-3">
          <h3>Gewicht</h3>
          <input
            type="number"
            step="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="kg"
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            autoFocus
          />
          <button
            type="button"
            disabled={!weightKg || saving}
            onClick={saveWeight}
            className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
          >
            Speichern
          </button>
        </div>
      )}
      {mode === 'note' && (
        <div className="flex flex-col gap-3">
          <h3>Notiz</h3>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Freitext für die Katze/Gruppe"
            rows={4}
            className="px-3 py-2 rounded-control bg-input border-[0.5px] border-border"
            autoFocus
          />
          <button
            type="button"
            disabled={!noteText.trim() || saving}
            onClick={saveNote}
            className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
          >
            Speichern
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
