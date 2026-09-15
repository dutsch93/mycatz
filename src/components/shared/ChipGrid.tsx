export interface Chip {
  id: string
  label: string
}

export default function ChipGrid({
  chips,
  selectedId,
  onSelect,
}: {
  chips: Chip[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onSelect(chip.id)}
          className={`min-h-[44px] px-4 rounded-control border-[0.5px] ${
            selectedId === chip.id
              ? 'bg-apricot border-apricot text-text-on-color'
              : 'bg-input border-border text-text-primary'
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
