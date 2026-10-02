import { useRef, useState } from 'react'
import { Camera, Check, ChevronDown, ChevronUp, Users, X } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { CAT_BREEDS, CAT_TAG_SUGGESTIONS } from '../lib/catOptions'
import GlassCard from '../components/shared/GlassCard'

// Rundes Profilbild mit Upload-Overlay — für Katzen und Gruppen gleich genutzt.
function PhotoPicker({
  photoUrl,
  label,
  onPick,
  fallback,
}: {
  photoUrl: string | null
  label: string
  onPick: (file: File) => void
  fallback: React.ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-14 h-14 shrink-0 rounded-full bg-input overflow-hidden flex items-center justify-center text-text-secondary"
        aria-label={`Profilbild für ${label} ändern`}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          fallback
        )}
        <span className="absolute inset-0 bg-black/25 opacity-0 active:opacity-100 flex items-center justify-center transition-opacity">
          <Camera size={16} className="text-white" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
    </>
  )
}

export default function Profile() {
  const {
    isOwner,
    cats,
    addCat,
    updateCat,
    archiveCat,
    uploadCatPhoto,
    uploadGroupPhoto,
    habits,
    catHabitExclusions,
    setCatHabitEnabled,
    groups,
    addGroup,
    renameGroup,
    setGroupMembers,
    deleteGroup,
    target,
    setTarget,
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

  const [groupName, setGroupName] = useState('')
  const [newGroupCatIds, setNewGroupCatIds] = useState<string[]>([])
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupCatIds, setEditGroupCatIds] = useState<string[]>([])

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

  async function handleUpdateCat(id: string, patch: Parameters<typeof updateCat>[1]) {
    setErrorMsg(null)
    try {
      await updateCat(id, patch)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleUploadCatPhoto(id: string, file: File) {
    setErrorMsg(null)
    try {
      await uploadCatPhoto(id, file)
    } catch (err) {
      setErrorMsg(friendlyError(err))
    }
  }

  async function handleUploadGroupPhoto(id: string, file: File) {
    setErrorMsg(null)
    try {
      await uploadGroupPhoto(id, file)
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

  return (
    <div className="py-6 flex flex-col gap-6">
      <h2>Profil</h2>

      {errorMsg && (
        <p className="text-[13px] text-muted-red bg-input rounded-control px-3 py-2">
          {errorMsg}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <p className="text-[13px] text-text-secondary">
          Wählt aus, welche Katze oder Gruppe auf dem Home-Screen getrackt wird.
        </p>

        <div className="flex flex-col gap-2">
          {cats.map((cat) => {
            const isSelected = target?.type === 'cat' && target.id === cat.id
            return (
              <GlassCard
                key={cat.id}
                className={`flex items-center justify-between min-h-[44px] px-3 ${
                  isSelected ? 'bg-input' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setTarget({ type: 'cat', id: cat.id })}
                  className="flex-1 flex items-center justify-between min-h-[44px]"
                >
                  <span>{cat.name}</span>
                  {isSelected && <Check size={18} className="text-apricot" />}
                </button>
              </GlassCard>
            )
          })}

          {groups.map((group) => {
            const isSelected = target?.type === 'group' && target.id === group.id
            return (
              <GlassCard
                key={group.id}
                className={`flex items-center justify-between min-h-[44px] px-3 ${
                  isSelected ? 'bg-input' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setTarget({ type: 'group', id: group.id })}
                  className="flex-1 flex items-center gap-2 justify-between min-h-[44px]"
                >
                  <span className="flex items-center gap-2">
                    <Users size={16} strokeWidth={1.75} />
                    {group.name}
                  </span>
                  {isSelected && <Check size={18} className="text-apricot" />}
                </button>
              </GlassCard>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
          Katzen verwalten
        </h3>

        {cats.length > 0 && (
          <div className="flex flex-col gap-2">
            {cats.map((cat) => (
              <div key={cat.id} className="glass flex flex-col gap-2 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {isOwner ? (
                      <PhotoPicker
                        photoUrl={cat.photo_url}
                        label={cat.name}
                        onPick={(file) => handleUploadCatPhoto(cat.id, file)}
                        fallback={<span className="text-[18px]">{cat.name[0]?.toUpperCase()}</span>}
                      />
                    ) : (
                      <span className="w-14 h-14 shrink-0 rounded-full bg-input overflow-hidden flex items-center justify-center text-text-secondary">
                        {cat.photo_url ? (
                          <img src={cat.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[18px]">{cat.name[0]?.toUpperCase()}</span>
                        )}
                      </span>
                    )}
                    <p className="text-text-primary truncate">{cat.name}</p>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleArchiveCat(cat.id)}
                      className="w-11 h-11 shrink-0 flex items-center justify-center text-muted-red"
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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isOwner ? (
                      <PhotoPicker
                        photoUrl={group.photo_url}
                        label={group.name}
                        onPick={(file) => handleUploadGroupPhoto(group.id, file)}
                        fallback={<Users size={20} strokeWidth={1.75} />}
                      />
                    ) : (
                      <span className="w-14 h-14 shrink-0 rounded-full bg-input overflow-hidden flex items-center justify-center text-text-secondary">
                        {group.photo_url ? (
                          <img src={group.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users size={20} strokeWidth={1.75} />
                        )}
                      </span>
                    )}
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
                      <p className="text-text-primary truncate">{group.name}</p>
                    )}
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="w-11 h-11 shrink-0 flex items-center justify-center text-muted-red"
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
    </div>
  )
}
