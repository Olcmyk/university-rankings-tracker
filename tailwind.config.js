/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chart-qs': '#2563eb',
        'chart-the': '#16a34a',
        'chart-arwu': '#ea580c',
      },
      maxWidth: {
        'content': '1200px',
      }
    },
  },
  plugins: [],
}
