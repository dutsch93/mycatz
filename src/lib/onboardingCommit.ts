// Schreibt den fertigen Onboarding-Draft in Supabase, nachdem der Nutzer
// den Magic Link bestätigt hat und eine aktive Session existiert.
import { supabase } from './supabase'
import type { OnboardingDraft } from './onboardingDraft'

export async function commitOnboardingDraft(draft: OnboardingDraft, userId: string) {
  // 1. Haushalt anlegen
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name: draft.householdName })
    .select()
    .single()
  if (householdError) throw householdError

  // 2. Eigenes Profil als Owner anlegen
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    household_id: household.id,
    display_name: draft.ownerName,
    role: 'owner',
  })
  if (profileError) throw profileError

  // 3. Futterarten anlegen (nur ausgewählte)
  const selectedFoodTypes = draft.foodTypes.filter((f) => f.selected)
  const { data: insertedFoodTypes, error: foodTypesError } = await supabase
    .from('food_types')
    .insert(
      selectedFoodTypes.map((f, index) => ({
        household_id: household.id,
        name: f.name,
        category: f.category,
        default_portion_g: f.defaultPortionG,
        sort_order: index,
      })),
    )
    .select()
  if (foodTypesError) throw foodTypesError

  // 4. Habits anlegen (nur ausgewählte)
  const selectedHabits = draft.habits.filter((h) => h.selected)
  const { error: habitsError } = await supabase.from('habit_definitions').insert(
    selectedHabits.map((h, index) => ({
      household_id: household.id,
      name: h.name,
      emoji: h.emoji,
      type: h.type,
      options: h.options ?? null,
      has_required_count: h.hasRequiredCount,
      is_default: true,
      sort_order: index,
      category: h.category,
    })),
  )
  if (habitsError) throw habitsError

  // 5. Katzen anlegen
  const { data: insertedCats, error: catsError } = await supabase
    .from('cats')
    .insert(
      draft.cats.map((c) => ({
        household_id: household.id,
        name: c.name,
        age: c.age || null,
        breed: c.breed || null,
        weight_kg: c.weightKg ? Number(c.weightKg) : null,
        tags: c.tags.length > 0 ? c.tags : null,
        daily_food_target_g: c.dailyFoodTargetG,
        daily_play_target_min: draft.playTargetMin,
      })),
    )
    .select()
  if (catsError) throw catsError

  // 6. Optional: Gruppe anlegen und alle Katzen zuordnen
  if (draft.createGroup && draft.groupName && insertedCats && insertedCats.length >= 2) {
    const { data: group, error: groupError } = await supabase
      .from('cat_groups')
      .insert({ household_id: household.id, name: draft.groupName })
      .select()
      .single()
    if (groupError) throw groupError

    const { error: membersError } = await supabase.from('cat_group_members').insert(
      insertedCats.map((cat) => ({
        group_id: group.id,
        cat_id: cat.id,
      })),
    )
    if (membersError) throw membersError
  }

  return { household, cats: insertedCats, foodTypes: insertedFoodTypes }
}
