// Feste Habit-Name → Lucide-Icon-Mapping-Tabelle (siehe Spec:
// docs/superpowers/specs/2026-09-21-liquid-glass-dashboard-design.md).
// `habit_definitions.emoji` bleibt in der DB unverändert, das Mapping
// passiert nur bei der UI-Auflösung hier.

import {
  Heart,
  Paintbrush,
  Trash2,
  Scissors,
  Pill,
  Droplet,
  Smile,
  TriangleAlert,
  Droplets,
  Wind,
  CircleDashed,
  MapPin,
  Stethoscope,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react'

const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  gekuschelt: Heart,
  'gebürstet': Paintbrush,
  'katzenklo gereinigt': Trash2,
  'krallen geschnitten': Scissors,
  'medikament gegeben': Pill,
  trinkmenge: Droplet,
  stimmung: Smile,
  erbrochen: TriangleAlert,
  durchfall: Droplets,
  niesen: Wind,
  haarballen: CircleDashed,
  'markiert / angepinkelt': MapPin,
  tierarztbesuch: Stethoscope,
  'ungewöhnl. verhalten': TriangleAlert,
}

export function resolveHabitIcon(name: string): LucideIcon {
  const key = name.trim().toLowerCase()
  return HABIT_ICON_MAP[key] ?? CircleHelp
}
