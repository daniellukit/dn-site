/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'purple-deep': '#4A148C',
        'purple-mid': '#7B1FA2',
        'pink-deep': '#AD1457',
        'pink-mid': '#EC407A',
      },
    },
  },
  plugins: [],
}