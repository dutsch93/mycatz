import { useState } from 'react'
import { X, Nfc, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { buildNfcShortcutUrl, isWebNfcSupported, scanNfcTag } from '../lib/nfc'
import { supabase } from '../lib/supabase'
import { CAT_BREEDS, CAT_TAG_SUGGESTIONS } from '../lib/catOptions'
import type { FoodCategory, HabitCategory, HabitType } from '../types'

const HABIT_TYPE_LABELS: Record<HabitType, string> = {
  boolean: 'Ja/Nein',
  count: 'Anzahl',
  select: 'Auswahl',
}

const HABIT_CATEGORY_LABELS: Record<HabitCategory, string> = {
  daily: 'Täglich',
  health: 'Gesundheit',
  behavior: 'Verhalten',
}

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
    isOwner,
    cats,
    addCat,
    updateCat,
    archiveCat,
    habits,
    catHabitExclusions,
    setCatHabitEnabled,
    addHabit,
    deleteHabit,
    groups,
    addGroup,
    renameGroup,
    setGroupMembers,
    deleteGroup,
    foodTypes,
    addFoodType,
    updateFoodTypePortion,
    deleteFoodType,
    nfcTags,
    addTag,
    deleteTag,
    invites,
    guestLinks,
    createInvite,
    cancelInvite,
    createGuestLink,
    revokeGuestLink,
  } = useAppData()

  const [catName, setCatName] = useState('')
  const [catAge, setCatAge] = useState('')
  const [catBreed, setCatBreed] = useState('')
  const [catBreedCustom, setCatBreedCustom] = useState('')
  const [catWeight, setCatWeight] = useState('')
  const [catTagsInput, setCatTagsInput] = useState('')
  const [catFoodTarget, setCatFoodTarget] = useState('200')
  const [catPlayTarget, setCatPlayTarget] = useState('15')
  const [habitsPanelCatId, setHabitsPanelCatId] = useState<string | null>(null)
  const [catBreedDraft, setCatBreedDraft] = useState<Record<string, string>>({})

  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitType, setNewHabitType] = useState<HabitType>('boolean')
  const [newHabitOptions, setNewHabitOptions] = useState('')
  const [newHabitCategory, setNewHabitCategory] = useState<HabitCategory>('daily')

  const [groupName, setGroupName] = useState('')
  const [newGroupCatIds, setNewGroupCatIds] = useState<string[]>([])
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupCatIds, setEditGroupCatIds] = useState<string[]>([])

  const [foodName, setFoodName] = useState('')
  const [foodCategory, setFoodCategory] = useState<FoodCategory>('custom')
  const [foodPortion, setFoodPortion] = useState('')

  const [foodTypeId, setFoodTypeId] = useState('')
  const [label, setLabel] = useState('')
  const [tagIdentifier, setTagIdentifier] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [guestLinkLabel, setGuestLinkLabel] = useState('')

  // Wandelt v.a. FK-Constraint-Fehler ("wird noch benutzt") in eine verständliche
  // Meldung um, statt den rohen Postgres-Fehler stumm verschwinden zu lassen.
  function friendlyError(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('foreign key') || message.includes('violates')) {
      return 'Kann nicht gelöscht werden — wird noch in bestehenden Einträgen verwendet.'
    }
    return message
  }

  async function saveNewCat() {
    if (!catName.trim()) return
    setErrorMsg(null)
    try {
      const breed = catBreed === 'Andere' ? catBreedCustom.trim() : catBreed
      await addCat({
        name: catName.trim(),
        age: catAge.trim(),
        breed,
        weightKg: catWeight ? Number(catWeight) : null,
        tags: catTagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        dailyFoodTargetG: Number(catFoodTarget) || 200,
        dailyPlayTargetMin: Number(catPlayTarget) || 15,
      })
      setCatName('')
      setCatAge('')
      setCatBreed('')
      setCatBreedCustom('')
      setCatWeight('')
      setCatTagsInput('')
      setCatFoodTarget('200')
      setCatPlayTarget('15')
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  function toggleNewCatTag(tag: string) {
    const current = catTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    setCatTagsInput(next.join(', '))
  }

  async function handleUpdateCat(
    id: string,
    patch: Parameters<typeof updateCat>[1],
  ) {
    setErrorMsg(null)
    try {
      await updateCat(id, patch)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleArchiveCat(id: string) {
    setErrorMsg(null)
    try {
      await archiveCat(id)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  function toggleCatTag(catId: string, currentTags: string[], tag: string) {
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag]
    handleUpdateCat(catId, { tags: next })
  }

  async function handleToggleCatHabit(catId: string, habitId: string, enabled: boolean) {
    setErrorMsg(null)
    try {
      await setCatHabitEnabled(catId, habitId, enabled)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function saveNewHabit() {
    if (!newHabitName.trim()) return
    setErrorMsg(null)
    try {
      await addHabit({
        name: newHabitName.trim(),
        type: newHabitType,
        options: newHabitOptions
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
        category: newHabitCategory,
      })
      setNewHabitName('')
      setNewHabitType('boolean')
      setNewHabitOptions('')
      setNewHabitCategory('daily')
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleDeleteHabit(id: string) {
    setErrorMsg(null)
    try {
      await deleteHabit(id)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  function startEditGroup(groupId: string, memberIds: string[]) {
    setEditingGroupId(groupId)
    setEditGroupCatIds(memberIds)
  }

  async function handleSaveGroupMembers(groupId: string) {
    setErrorMsg(null)
    try {
      await setGroupMembers(groupId, editGroupCatIds)
      setEditingGroupId(null)
      setEditGroupCatIds([])
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  function toggleEditGroupCat(catId: string) {
    setEditGroupCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    )
  }

  async function handleRenameGroup(id: string, name: string) {
    if (!name.trim()) return
    setErrorMsg(null)
    try {
      await renameGroup(id, name.trim())
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleDeleteGroup(id: string) {
    setErrorMsg(null)
    try {
      await deleteGroup(id)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function saveNewGroup() {
    if (!groupName.trim() || newGroupCatIds.length < 2) return
    setErrorMsg(null)
    try {
      await addGroup(groupName.trim(), newGroupCatIds)
      setGroupName('')
      setNewGroupCatIds([])
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  function toggleNewGroupCat(catId: string) {
    setNewGroupCatIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    )
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

  async function handleCreateInvite() {
    if (!inviteEmail.trim()) return
    setErrorMsg(null)
    try {
      await createInvite(inviteEmail.trim())
      setInviteEmail('')
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleCancelInvite(id: string) {
    setErrorMsg(null)
    try {
      await cancelInvite(id)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleCreateGuestLink() {
    setErrorMsg(null)
    try {
      await createGuestLink(guestLinkLabel.trim())
      setGuestLinkLabel('')
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleRevokeGuestLink(id: string) {
    setErrorMsg(null)
    try {
      await revokeGuestLink(id)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
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
          Katzen verwalten
        </h3>

        {cats.length > 0 && (
          <div className="flex flex-col gap-2">
            {cats.map((cat) => (
              <div key={cat.id} className="glass flex flex-col gap-2 px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-text-primary">{cat.name}</p>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleArchiveCat(cat.id)}
                      className="w-11 h-11 flex items-center justify-center text-muted-red"
                      aria-label={`${cat.name} archivieren`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {isOwner ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        defaultValue={cat.name}
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          if (value && value !== cat.name) handleUpdateCat(cat.id, { name: value })
                        }}
                        placeholder="Name"
                        className="flex-1 min-w-0 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
                      />
                      <input
                        type="text"
                        defaultValue={cat.age ?? ''}
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          if (value !== (cat.age ?? '')) handleUpdateCat(cat.id, { age: value || null })
                        }}
                        placeholder="Alter"
                        className="flex-1 min-w-0 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
                      />
                    </div>
                    {(() => {
                      const knownBreed = CAT_BREEDS.includes(
                        cat.breed as (typeof CAT_BREEDS)[number],
                      )
                      const selectValue =
                        catBreedDraft[cat.id] ?? (knownBreed ? cat.breed! : cat.breed ? 'Andere' : '')
                      return (
                        <>
                          <div className="flex gap-2">
                            <select
                              value={selectValue}
                              onChange={(e) => {
                                const value = e.target.value
                                setCatBreedDraft((prev) => ({ ...prev, [cat.id]: value }))
                                if (value !== 'Andere') handleUpdateCat(cat.id, { breed: value || null })
                              }}
                              className="flex-1 min-w-0 min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border text-text-primary"
                            >
                              <option value="">Rasse wählen…</option>
                              {CAT_BREEDS.map((breed) => (
                                <option key={breed} value={breed}>
                                  {breed}
                                </option>
                              ))}
                            </select>
                            <div className="flex-1 min-w-0 flex items-center gap-1 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border">
                              <input
                                type="number"
                                step="0.1"
                                defaultValue={cat.weight_kg ?? ''}
                                onBlur={(e) => {
                                  const value = e.target.value ? Number(e.target.value) : null
                                  if (value !== cat.weight_kg) handleUpdateCat(cat.id, { weight_kg: value })
                                }}
                                placeholder="Gewicht"
                                className="flex-1 min-w-0 bg-input"
                              />
                              <span className="text-[13px] text-text-secondary">kg</span>
                            </div>
                          </div>
                          {selectValue === 'Andere' && (
                            <input
                              type="text"
                              defaultValue={knownBreed ? '' : (cat.breed ?? '')}
                              onBlur={(e) => {
                                const value = e.target.value.trim()
                                if (value !== (cat.breed ?? '')) handleUpdateCat(cat.id, { breed: value || null })
                              }}
                              placeholder="Eigene Rasse"
                              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
                            />
                          )}
                        </>
                      )
                    })()}
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0 flex items-center gap-1 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border">
                        <input
                          type="number"
                          defaultValue={cat.daily_food_target_g}
                          onBlur={(e) => {
                            const value = Number(e.target.value)
                            if (value > 0 && value !== cat.daily_food_target_g)
                              handleUpdateCat(cat.id, { daily_food_target_g: value })
                          }}
                          className="flex-1 min-w-0 bg-input"
                        />
                        <span className="text-[13px] text-text-secondary">g Futter/Tag</span>
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-1 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border">
                        <input
                          type="number"
                          defaultValue={cat.daily_play_target_min}
                          onBlur={(e) => {
                            const value = Number(e.target.value)
                            if (value > 0 && value !== cat.daily_play_target_min)
                              handleUpdateCat(cat.id, { daily_play_target_min: value })
                          }}
                          className="flex-1 min-w-0 bg-input"
                        />
                        <span className="text-[13px] text-text-secondary">min Spiel/Tag</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      defaultValue={(cat.tags ?? []).join(', ')}
                      onBlur={(e) => {
                        const value = e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean)
                        handleUpdateCat(cat.id, { tags: value })
                      }}
                      placeholder="Tags, mit Komma getrennt"
                      className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {CAT_TAG_SUGGESTIONS.map((tag) => {
                        const active = (cat.tags ?? []).includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleCatTag(cat.id, cat.tags ?? [], tag)}
                            className={`text-[13px] px-2.5 py-1 rounded-full border-[0.5px] ${
                              active
                                ? 'bg-apricot text-text-on-color border-apricot'
                                : 'bg-input text-text-secondary border-border'
                            }`}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setHabitsPanelCatId(habitsPanelCatId === cat.id ? null : cat.id)
                      }
                      className="flex items-center justify-between min-h-[40px] px-1 text-[13px] text-text-secondary"
                    >
                      Habits für {cat.name}
                      {habitsPanelCatId === cat.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                    {habitsPanelCatId === cat.id && (
                      <div className="flex flex-col gap-1 bg-input rounded-control p-2">
                        {habits.map((habit) => {
                          const enabled = !catHabitExclusions.some(
                            (ex) => ex.cat_id === cat.id && ex.habit_id === habit.id,
                          )
                          return (
                            <label
                              key={habit.id}
                              className="flex items-center justify-between min-h-[40px] px-1"
                            >
                              <span className="text-text-primary">{habit.name}</span>
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) =>
                                  handleToggleCatHabit(cat.id, habit.id, e.target.checked)
                                }
                                className="w-5 h-5"
                              />
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-text-secondary">
                    {[cat.age, cat.breed].filter(Boolean).join(' · ') || '—'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div className="glass p-3 flex flex-col gap-3">
            <p className="text-text-primary">Neue Katze anlegen</p>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Name"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={catAge}
                onChange={(e) => setCatAge(e.target.value)}
                placeholder="Alter"
                className="flex-1 min-w-0 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
              />
              <select
                value={catBreed}
                onChange={(e) => setCatBreed(e.target.value)}
                className="flex-1 min-w-0 min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border text-text-primary"
              >
                <option value="">Rasse wählen…</option>
                {CAT_BREEDS.map((breed) => (
                  <option key={breed} value={breed}>
                    {breed}
                  </option>
                ))}
              </select>
            </div>
            {catBreed === 'Andere' && (
              <input
                type="text"
                value={catBreedCustom}
                onChange={(e) => setCatBreedCustom(e.target.value)}
                placeholder="Eigene Rasse"
                className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
              />
            )}
            <input
              type="number"
              step="0.1"
              value={catWeight}
              onChange={(e) => setCatWeight(e.target.value)}
              placeholder="Gewicht in kg"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={catFoodTarget}
                onChange={(e) => setCatFoodTarget(e.target.value)}
                placeholder="Tagesziel Futter (g)"
                className="flex-1 min-w-0 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
              />
              <input
                type="number"
                value={catPlayTarget}
                onChange={(e) => setCatPlayTarget(e.target.value)}
                placeholder="Tagesziel Spielzeit (min)"
                className="flex-1 min-w-0 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
              />
            </div>
            <input
              type="text"
              value={catTagsInput}
              onChange={(e) => setCatTagsInput(e.target.value)}
              placeholder="Tags, mit Komma getrennt (z. B. sensibel, indoor)"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            <div className="flex flex-wrap gap-1.5">
              {CAT_TAG_SUGGESTIONS.map((tag) => {
                const active = catTagsInput
                  .split(',')
                  .map((t) => t.trim())
                  .includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleNewCatTag(tag)}
                    className={`text-[13px] px-2.5 py-1 rounded-full border-[0.5px] ${
                      active
                        ? 'bg-apricot text-text-on-color border-apricot'
                        : 'bg-input text-text-secondary border-border'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={saveNewCat}
              disabled={!catName.trim()}
              className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
            >
              Katze speichern
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
          Gruppen verwalten
        </h3>

        {groups.length > 0 && (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <div key={group.id} className="glass flex flex-col gap-2 px-3 py-3">
                <div className="flex items-center justify-between">
                  {isOwner ? (
                    <input
                      type="text"
                      defaultValue={group.name}
                      onBlur={(e) => {
                        const value = e.target.value.trim()
                        if (value && value !== group.name) handleRenameGroup(group.id, value)
                      }}
                      className="flex-1 min-w-0 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
                    />
                  ) : (
                    <p className="text-text-primary">{group.name}</p>
                  )}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="w-11 h-11 flex items-center justify-center text-muted-red"
                      aria-label={`${group.name} löschen`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {editingGroupId === group.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      {cats.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center justify-between min-h-[40px] px-1"
                        >
                          <span className="text-text-primary">{cat.name}</span>
                          <input
                            type="checkbox"
                            checked={editGroupCatIds.includes(cat.id)}
                            onChange={() => toggleEditGroupCat(cat.id)}
                            className="w-5 h-5"
                          />
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveGroupMembers(group.id)}
                      disabled={editGroupCatIds.length < 2}
                      className="min-h-[40px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
                    >
                      Mitglieder speichern
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-text-secondary">
                      {cats
                        .filter((c) => group.catIds.includes(c.id))
                        .map((c) => c.name)
                        .join(', ') || 'Keine Katzen'}
                    </p>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => startEditGroup(group.id, group.catIds)}
                        className="text-[13px] text-apricot underline"
                      >
                        Mitglieder bearbeiten
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && cats.length >= 2 && (
          <div className="glass p-3 flex flex-col gap-3">
            <p className="text-text-primary">Neue Gruppe anlegen</p>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Gruppenname (z. B. Luna & Milo)"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            <div className="flex flex-col gap-1">
              {cats.map((cat) => (
                <label key={cat.id} className="flex items-center justify-between min-h-[40px] px-1">
                  <span className="text-text-primary">{cat.name}</span>
                  <input
                    type="checkbox"
                    checked={newGroupCatIds.includes(cat.id)}
                    onChange={() => toggleNewGroupCat(cat.id)}
                    className="w-5 h-5"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={saveNewGroup}
              disabled={!groupName.trim() || newGroupCatIds.length < 2}
              className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
            >
              Gruppe speichern
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
          Habits verwalten
        </h3>

        {habits.length > 0 && (
          <div className="flex flex-col gap-2">
            {habits.map((habit) => (
              <div key={habit.id} className="glass flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-text-primary">{habit.name}</p>
                  <p className="text-[13px] text-text-secondary">
                    {HABIT_TYPE_LABELS[habit.type]} · {HABIT_CATEGORY_LABELS[habit.category]}
                    {habit.type === 'select' && habit.options && habit.options.length > 0
                      ? ` (${habit.options.join(', ')})`
                      : ''}
                  </p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="w-11 h-11 flex items-center justify-center text-muted-red"
                    aria-label={`${habit.name} entfernen`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div className="glass p-3 flex flex-col gap-3">
            <p className="text-text-primary">Neuen Habit anlegen</p>
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Name (z. B. Krallen geschnitten)"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            <div className="flex gap-2">
              <select
                value={newHabitType}
                onChange={(e) => setNewHabitType(e.target.value as HabitType)}
                className="flex-1 min-w-0 min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border text-text-primary"
              >
                {Object.entries(HABIT_TYPE_LABELS).map(([value, labelText]) => (
                  <option key={value} value={value}>
                    {labelText}
                  </option>
                ))}
              </select>
              <select
                value={newHabitCategory}
                onChange={(e) => setNewHabitCategory(e.target.value as HabitCategory)}
                className="flex-1 min-w-0 min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border text-text-primary"
              >
                {Object.entries(HABIT_CATEGORY_LABELS).map(([value, labelText]) => (
                  <option key={value} value={value}>
                    {labelText}
                  </option>
                ))}
              </select>
            </div>
            {newHabitType === 'select' && (
              <input
                type="text"
                value={newHabitOptions}
                onChange={(e) => setNewHabitOptions(e.target.value)}
                placeholder="Optionen, mit Komma getrennt (z. B. entspannt, verspielt, ängstlich)"
                className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
              />
            )}
            <button
              type="button"
              onClick={saveNewHabit}
              disabled={
                !newHabitName.trim() ||
                (newHabitType === 'select' &&
                  !newHabitOptions.split(',').map((o) => o.trim()).filter(Boolean).length)
              }
              className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
            >
              Habit speichern
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
          Futterarten verwalten
        </h3>

        {foodTypes.length > 0 && (
          <div className="flex flex-col gap-2">
            {foodTypes.map((food) => (
              <div
                key={food.id}
                className="glass flex items-center justify-between px-3 py-2"
              >
                <div>
                  <p className="text-text-primary">{food.name}</p>
                  <p className="text-[13px] text-text-secondary">
                    {FOOD_CATEGORY_LABELS[food.category]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <>
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
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[13px] text-text-secondary">
                      {food.default_portion_g}g
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div className="glass p-3 flex flex-col gap-3">
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
        )}
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
                  className="glass flex items-center justify-between px-3 py-2"
                >
                  <div>
                    <p className="text-text-primary">{tag.label || tag.tag_identifier}</p>
                    <p className="text-[13px] text-text-secondary">{foodType?.name ?? '—'}</p>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="w-11 h-11 flex items-center justify-center text-muted-red"
                      aria-label="Tag entfernen"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {isOwner && (
          <>
            <div className="glass p-3 flex flex-col gap-3">
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
                  className="min-h-[44px] rounded-control border-[0.5px] border-border bg-input text-text-primary disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Nfc size={18} strokeWidth={1.75} />
                  {scanning ? 'Halte dein Handy jetzt an den Tag…' : 'Tag scannen'}
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

            <div className="glass p-3">
              <p className="text-[13px] text-text-secondary">
                <strong>iOS-Fallback:</strong> iPhones unterstützen kein Web NFC. Öffne die
                Kurzbefehle-App und erstelle eine NFC-Automation, die diese URL öffnet:
              </p>
              <p className="text-[13px] text-text-primary mt-1 break-all">
                {tagIdentifier ? buildNfcShortcutUrl(tagIdentifier) : buildNfcShortcutUrl('TAG_ID')}
              </p>
            </div>
          </>
        )}
      </section>

      {isOwner && (
        <section className="flex flex-col gap-3">
          <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
            Mitglieder einladen
          </h3>

          {invites.length > 0 && (
            <div className="flex flex-col gap-2">
              {invites.map((invite) => {
                const isUsed = !!invite.used_at
                const isExpired = !isUsed && new Date(invite.expires_at) < new Date()
                const status = isUsed ? 'angenommen' : isExpired ? 'abgelaufen' : 'ausstehend'
                return (
                  <div
                    key={invite.id}
                    className="glass flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <p className="text-text-primary">{invite.email}</p>
                      <p className="text-[13px] text-text-secondary">{status}</p>
                    </div>
                    {!isUsed && (
                      <button
                        type="button"
                        onClick={() => handleCancelInvite(invite.id)}
                        className="w-11 h-11 flex items-center justify-center text-muted-red"
                        aria-label="Einladung zurückziehen"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="glass p-3 flex flex-col gap-3">
            <p className="text-text-primary">Neue Einladung senden</p>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="E-Mail-Adresse"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            <button
              type="button"
              onClick={handleCreateInvite}
              disabled={!inviteEmail.trim()}
              className="min-h-[44px] rounded-control bg-apricot text-text-on-color disabled:opacity-60"
            >
              Einladung erstellen
            </button>
            {invites.length > 0 && !invites[0].used_at && (
              <div className="glass rounded-control p-3">
                <p className="text-[13px] text-text-secondary">
                  Link zum Teilen (z. B. per Nachricht schicken):
                </p>
                <p className="text-[13px] text-text-primary mt-1 break-all">
                  {`${window.location.origin}/invite/${invites[0].token}`}
                </p>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`${window.location.origin}/invite/${invites[0].token}`)}
                  className="mt-2 min-h-[36px] px-3 rounded-control border-[0.5px] border-border bg-card text-text-primary text-[13px]"
                >
                  Link kopieren
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {isOwner && (
        <section className="flex flex-col gap-3">
          <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
            Gast-Zugang
          </h3>
          <p className="text-[13px] text-text-secondary">
            Gäste können ohne eigenen Account tracken (kein Bearbeiten/Löschen). Der Link läuft
            nach 30 Tagen automatisch ab.
          </p>

          {guestLinks.length > 0 && (
            <div className="flex flex-col gap-2">
              {guestLinks.map((link) => {
                const isRevoked = !!link.revoked_at
                const isExpired = !isRevoked && new Date(link.expires_at) < new Date()
                return (
                  <div
                    key={link.id}
                    className="glass flex flex-col gap-2 px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-text-primary">{link.label || 'Gast-Link'}</p>
                        <p className="text-[13px] text-text-secondary">
                          {isRevoked
                            ? 'widerrufen'
                            : isExpired
                              ? 'abgelaufen'
                              : `gültig bis ${new Date(link.expires_at).toLocaleDateString('de-DE')}`}
                        </p>
                      </div>
                      {!isRevoked && !isExpired && (
                        <button
                          type="button"
                          onClick={() => handleRevokeGuestLink(link.id)}
                          className="w-11 h-11 flex items-center justify-center text-muted-red"
                          aria-label="Gast-Link widerrufen"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {!isRevoked && !isExpired && (
                      <div className="bg-input rounded-control p-2">
                        <p className="text-[13px] text-text-primary break-all">
                          {`${window.location.origin}/guest/${link.token}`}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(`${window.location.origin}/guest/${link.token}`)
                          }
                          className="mt-2 min-h-[36px] px-3 rounded-control border-[0.5px] border-border bg-card text-text-primary text-[13px]"
                        >
                          Link kopieren
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="glass p-3 flex flex-col gap-3">
            <input
              type="text"
              value={guestLinkLabel}
              onChange={(e) => setGuestLinkLabel(e.target.value)}
              placeholder="Label (z. B. Katzensitter)"
              className="min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            <button
              type="button"
              onClick={handleCreateGuestLink}
              className="min-h-[44px] rounded-control bg-apricot text-text-on-color"
            >
              Gast-Link erstellen
            </button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">Account</h3>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="min-h-[44px] rounded-control border-[0.5px] border-border bg-input text-text-primary self-start px-4"
        >
          Abmelden
        </button>
      </section>
    </div>
  )
}
