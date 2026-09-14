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
        sage: '#85B79D',
        'warm-brown': '#D4A574',
        'muted-red': '#C97C7C',
        gray: '#8E8E93',
        'text-primary': '#1C1C1E',
        'text-secondary': '#8E8E93',
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
