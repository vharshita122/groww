/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00D09C',
          red: '#EB5B3C',
          blue: '#5367FF',
          bg: '#121212',
          surface: '#1e1e1e',
          text: '#f1f1f1',
          textMuted: '#9aa0a6',
          border: '#2b2b2b'
        },
      },
    },
  },
  plugins: [],
}
