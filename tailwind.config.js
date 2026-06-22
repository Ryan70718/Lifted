/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#080b12',
        surface: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.08)',
        accent: '#6366f1',
        green: { crm: '#22c55e' },
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
}
