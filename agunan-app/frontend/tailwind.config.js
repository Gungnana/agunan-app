/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bank: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36a8f6',
          500: '#0c8de7',
          600: '#026fc5',
          700: '#03589f',
          800: '#074b83',
          900: '#0b3f6d',
          950: '#072848',
        },
      },
    },
  },
  plugins: [],
}
