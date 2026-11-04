import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#FAFAF8',
        card: '#FFFFFF',
        input: '#F5F3F0',
        apricot: '#E8A87C',
        // Kräftige Varianten für Text und Knöpfe mit weißer Schrift (WCAG AA ≥ 4.5:1).
        // Die hellen Markenfarben bleiben für Ringe, Punkte und Verlauf (reine Flächen).
        'apricot-strong': '#9A5527',
        'sage-strong': '#47735B',
        'muted-red-strong': '#A04545',
        sage: '#85B79D',
        'warm-brown': '#D4A574',
        'muted-red': '#C97C7C',
        gray: '#8E8E93',
        'text-primary': '#1C1C1E',
        'text-secondary': '#666670',
        border: '#E8E6E1',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
      boxShadow: {
        none: 'none',
      },
      maxWidth: {
        app: '440px',
      },
    },
  },
  plugins: [],
} satisfies Config
