/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0b0f19",
        cardBg: "#111827",
        borderSubtle: "#1f2937",
        accentCyan: "#06b6d4",
        accentBlue: "#3b82f6",
        statusHealthy: "#10b981",
        statusDegraded: "#f59e0b",
        statusCritical: "#ef4444"
      }
    },
  },
  plugins: [],
}
