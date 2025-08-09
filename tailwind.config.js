/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  safelist: [
    'ring-purple-400/30', 'dark:ring-purple-300/25',
    'ring-purple-400/40', 'dark:ring-purple-300/30'
  ],
  theme: {
    extend: {
      colors: {
        'deep-purple': {
          500: '#6b46c1',
          600: '#5a32a3',
          700: '#4c2889',
          800: '#3e1f6e',
          900: '#2e1758'
        }
      }
    },
  },
  plugins: [],
} 