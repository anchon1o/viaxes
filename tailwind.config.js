/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base:    '#ffffff',
        ink:     '#0a0a0a',
        mid:     '#737373',
        line:    '#e5e5e5',
        soft:    '#f5f5f5',
        accent:  '#2563eb',
        danger:  '#ef4444',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      fontSize: {
        xs:  ['11px', '1.5'],
        sm:  ['13px', '1.5'],
        base:['15px', '1.6'],
        lg:  ['17px', '1.4'],
        xl:  ['20px', '1.3'],
        '2xl':['24px', '1.2'],
        '3xl':['30px', '1.15'],
        '4xl':['38px', '1.1'],
      },
    },
  },
  plugins: [],
}
