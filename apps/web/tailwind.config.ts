import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          ink: 'hsl(var(--accent-ink))',
          soft: 'hsl(var(--accent-soft))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          soft: 'hsl(var(--danger-soft))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          soft: 'hsl(var(--ok-soft))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          soft: 'hsl(var(--warn-soft))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          soft: 'hsl(var(--info-soft))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        paper: {
          DEFAULT: 'hsl(var(--paper-bg))',
          2: 'hsl(var(--paper-bg-2))',
          surface: 'hsl(var(--paper-surface))',
          raised: 'hsl(var(--paper-surface-raised))',
          line: 'hsl(var(--paper-line))',
          'line-soft': 'hsl(var(--paper-line-soft))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          2: 'hsl(var(--ink-2))',
          3: 'hsl(var(--ink-3))',
          muted: 'hsl(var(--ink-muted))',
        },
        tag: {
          1: 'hsl(var(--tag-1))',
          '1-soft': 'hsl(var(--tag-1-soft))',
          2: 'hsl(var(--tag-2))',
          '2-soft': 'hsl(var(--tag-2-soft))',
          3: 'hsl(var(--tag-3))',
          '3-soft': 'hsl(var(--tag-3-soft))',
          4: 'hsl(var(--tag-4))',
          '4-soft': 'hsl(var(--tag-4-soft))',
        },
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter Tight', 'Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['var(--font-serif)', 'Instrument Serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace'],
      },
      boxShadow: {
        'paper-1': 'var(--shadow-1)',
        'paper-2': 'var(--shadow-2)',
        'paper-3': 'var(--shadow-3)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-in-right': 'slide-in-right 200ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config
