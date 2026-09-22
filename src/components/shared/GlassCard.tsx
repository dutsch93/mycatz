// Wiederverwendbare Glass-Karte für den Liquid-Glass-Look (siehe
// docs/superpowers/specs/2026-09-21-liquid-glass-dashboard-design.md).
// Nutzt die `.glass`-Utility-Klasse aus global.css als einzige Quelle des Looks.

import type { CSSProperties, ReactNode } from 'react'

export default function GlassCard({
  children,
  className = '',
  as: Tag = 'div',
  style,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
  style?: CSSProperties
}) {
  return (
    <Tag className={`glass ${className}`} style={style}>
      {children}
    </Tag>
  )
}
