// Farbpunkt nach dem Fütterungs-Ampelsystem aus CLAUDE.md (>=67% / 34-66% / 0-33%).

export function ampelColor(percent: number): string {
  if (percent >= 67) return 'var(--ampel-good)'
  if (percent >= 34) return 'var(--ampel-mid)'
  return 'var(--ampel-low)'
}

export default function AmpelDot({ percent, size = 8 }: { percent: number; size?: number }) {
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, backgroundColor: ampelColor(percent) }}
    />
  )
}
