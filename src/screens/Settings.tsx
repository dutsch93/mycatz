import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { buildNfcShortcutUrl, isWebNfcSupported, scanNfcTag } from '../lib/nfc'
import type { FoodCategory } from '../types'

const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  wet: 'Nassfutter',
  dry: 'Trockenfutter',
  sensitive: 'Sensitiv',
  cooked: 'Gekocht',
  snack_dry: 'Snack trocken',
  snack_wet: 'Snack nass',
  custom: 'Sonstiges',
}

export default function Settings() {
  const {
    household,
    foodTypes,
    addFoodType,
    updateFoodTypePortion,
    deleteFoodType,
    nfcTags,
    addTag,
    deleteTag,
  } = useAppData()

  const [foodName, setFoodName] = useState('')
  const [foodCategory, setFoodCategory] = useState<FoodCategory>('custom')
  const [foodPortion, setFoodPortion] = useState('')

  const [foodTypeId, setFoodTypeId] = useState('')
  const [label, setLabel] = useState('')
  const [tagIdentifier, setTagIdentifier] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Wandelt v.a. FK-Constraint-Fehler ("wird noch benutzt") in eine verständliche
  // Meldung um, statt den rohen Postgres-Fehler stumm verschwinden zu lassen.
  function friendlyError(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('foreign key') || message.includes('violates')) {
      return 'Kann nicht gelöscht werden — wird noch in bestehenden Einträgen verwendet.'
    }
    return message
  }

  async function saveNewFoodType() {
    if (!foodName.trim() || !foodPortion) return
    setErrorMsg(null)
    try {
      await addFoodType(foodName.trim(), foodCategory, Number(foodPortion))
      setFoodName('')
      setFoodCategory('custom')
      setFoodPortion('')
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleUpdatePortion(id: string, value: number) {
    setErrorMsg(null)
    try {
      await updateFoodTypePortion(id, value)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleDeleteFoodType(id: string) {
    setErrorMsg(null)
    try {
      await deleteFoodType(id)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleDeleteTag(id: string) {
    setErrorMsg(null)
    try {
      await deleteTag(id)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  function startScan() {
    setScanError(null)
    setScanning(true)
    scanNfcTag(
      (id) => {
        setTagIdentifier(id)
        setScanning(false)
      },
      (message) => {
        setScanError(message)
        setScanning(false)
      },
    )
  }

  async function saveTag() {
    if (!foodTypeId || !tagIdentifier.trim()) return
    setErrorMsg(null)
    try {
      await addTag(tagIdentifier.trim(), foodTypeId, label.trim())
      setFoodTypeId('')
      setLabel('')
      setTagIdentifier('')
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  return (
    <div className="py-6 flex flex-col gap-6">
      <h2>Einstellungen</h2>

      {errorMsg && (
        <p className="text-[13px] text-muted-red bg-input rounded-control px-3 py-2">
          {errorMsg}
        </p>
      )}

      {household && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">Haushalt</h3>
          <p className="text-text-primary">{household.name}</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
          Futterarten verwalten
        </h3>

        {foodTypes.length > 0 && (
          <div className="flex flex-col gap-2">
            {foodTypes.map((food) => (
              <div
                key={food.id}
                className="flex items-center justify-between bg-card border-[0.5px] border-border rounded-card px-3 py-2"
              >
                <div>
                  <p className="text-text-primary">{food.name}</p>
                  <p className="text-[13px] text-text-secondary">
                    {FOOD_CATEGORY_LABELS[food.category]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue={food.default_portion_g}
                    onBlur={(e) => {
                      const value = Number(e.target.value)
                      if (value > 0 && value !== food.default_portion_g) {
                        handleUpdatePortion(food.id, value)
                      }
                    }}
                    className="w-16 min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border text-text-primary"
                  />
                  <span className="text-[13px] text-text-secondary">g</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteFoodType(food.id)}
                    className="w-11 h-11 flex items-center justify-center text-muted-red"
                    aria-label={`${food.name} entfernen`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card border-[0.5px] border-border rounded-card p-3 flex flex-col gap-3">
          <p className="text-text-primary">Neue Futterart anlegen</p>
          <input
            type="text"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            placeholder="Name (z. B. Leberwurst)"
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
          />
          <select
            value={foodCategory}
            onChange={(e) => setFoodCategory(e.target.value as FoodCategory)}
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border text-text-primary"
          >
            {Object.entries(FOOD_CATEGORY_LABELS).map(([value, labelText]) => (
              <option key={value} value={value}>
                {labelText}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={foodPortion}
            onChange={(e) => setFoodPortion(e.target.value)}
            placeholder="Standard-Portion in Gramm"
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
          />
          <button
            type="button"
            onClick={saveNewFoodType}
            disabled={!foodName.trim() || !foodPortion}
            className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
          >
            Futterart speichern
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
          NFC-Tags verwalten
        </h3>

        {nfcTags.length > 0 && (
          <div className="flex flex-col gap-2">
            {nfcTags.map((tag) => {
              const foodType = foodTypes.find((f) => f.id === tag.food_type_id)
              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between bg-card border-[0.5px] border-border rounded-card px-3 py-2"
                >
                  <div>
                    <p className="text-text-primary">{tag.label || tag.tag_identifier}</p>
                    <p className="text-[13px] text-text-secondary">{foodType?.name ?? '—'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
                    className="w-11 h-11 flex items-center justify-center text-muted-red"
                    aria-label="Tag entfernen"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-card border-[0.5px] border-border rounded-card p-3 flex flex-col gap-3">
          <p className="text-text-primary">Neuen NFC-Tag einrichten</p>

          <select
            value={foodTypeId}
            onChange={(e) => setFoodTypeId(e.target.value)}
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border text-text-primary"
          >
            <option value="">Futterart wählen…</option>
            {foodTypes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {isWebNfcSupported() ? (
            <button
              type="button"
              onClick={startScan}
              disabled={scanning}
              className="min-h-[44px] rounded-control border-[0.5px] border-border bg-input text-text-primary disabled:opacity-60"
            >
              {scanning ? 'Halte dein Handy jetzt an den Tag…' : '📶 Tag scannen'}
            </button>
          ) : (
            <input
              type="text"
              value={tagIdentifier}
              onChange={(e) => setTagIdentifier(e.target.value)}
              placeholder="Tag-Kennung manuell eingeben"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
          )}

          {tagIdentifier && (
            <p className="text-[13px] text-sage">Tag erkannt: {tagIdentifier}</p>
          )}
          {scanError && <p className="text-[13px] text-muted-red">{scanError}</p>}

          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (z. B. Küchen-Tag Nassfutter)"
            className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
          />

          <button
            type="button"
            onClick={saveTag}
            disabled={!foodTypeId || !tagIdentifier.trim()}
            className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
          >
            Tag speichern
          </button>
        </div>

        <div className="bg-input rounded-card p-3">
          <p className="text-[13px] text-text-secondary">
            <strong>iOS-Fallback:</strong> iPhones unterstützen kein Web NFC. Öffne die
            Kurzbefehle-App und erstelle eine NFC-Automation, die diese URL öffnet:
          </p>
          <p className="text-[13px] text-text-primary mt-1 break-all">
            {tagIdentifier ? buildNfcShortcutUrl(tagIdentifier) : buildNfcShortcutUrl('TAG_ID')}
          </p>
        </div>
      </section>
    </div>
  )
}
