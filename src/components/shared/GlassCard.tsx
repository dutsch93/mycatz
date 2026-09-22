// Wiederverwendbare Glass-Karte für den Liquid-Glass-Look (siehe
// docs/superpowers/specs/2026-09-21-liquid-glass-dashboard-design.md).
// Nutzt die `.glass`-Utility-Klasse aus global.css als einzige Quelle des Looks.

import type { ReactNode } from 'react'

export default function GlassCard({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}) {
  return <Tag className={`glass ${className}`}>{children}</Tag>
}
