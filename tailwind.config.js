/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CSS variables — cambian según tema/acento del usuario
        bg:        'var(--color-bg)',
        surface:   'var(--color-surface)',
        border:    'var(--color-border)',
        text:      'var(--color-text)',
        muted:     'var(--color-muted)',
        accent:    'var(--color-accent)',
        accentFg:  'var(--color-accent-fg)',
      },
      fontFamily: {
        inter:     ['"Inter"', 'system-ui', 'sans-serif'],
        fraunces:  ['"Fraunces"', 'Georgia', 'serif'],
        dm:        ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:      ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: { xs: '4px' },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        widget: '0 2px 20px -4px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.06)',
        'widget-dark': '0 2px 20px -4px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)',
        float: '0 8px 32px -8px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}
