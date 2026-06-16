/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        industrial: {
          50: "#f0f5fa",
          100: "#dde9f2",
          200: "#b3cde3",
          300: "#7fa9cd",
          400: "#4e82b2",
          500: "#2d6497",
          600: "#1e4f7c",
          700: "#1e3a5f",
          800: "#182f4d",
          900: "#132540",
          950: "#0c1829",
        },
        safe: {
          normal: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          info: "#3b82f6",
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Helvetica Neue"',
          "system-ui",
          "sans-serif",
        ],
        mono: ['"JetBrains Mono"', '"SF Mono"', "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "0 4px 24px -8px rgba(30, 58, 95, 0.15)",
        card: "0 2px 12px -4px rgba(30, 58, 95, 0.1)",
        inset: "inset 0 2px 4px rgba(0, 0, 0, 0.05)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "status-flash": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(239, 68, 68, 0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "status-flash": "status-flash 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};
