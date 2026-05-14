/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void:    "#050507",
        ink:     "#0C0C10",
        surface: "#13131A",
        border:  "#1E1E2E",
        muted:   "#2A2A3E",
        subtle:  "#4A4A6A",
        ghost:   "#6B6B8A",
        // Accent palette
        neon:    "#00F5A0",
        pulse:   "#00D4FF",
        plasma:  "#FF006E",
        amber:   "#FFB800",
        violet:  "#7C3AED",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        mono:    ["var(--font-mono)", "monospace"],
        body:    ["var(--font-body)", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan":       "scan 2s linear infinite",
        "flicker":    "flicker 4s ease-in-out infinite",
      },
      keyframes: {
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.85" },
        },
      },
    },
  },
  plugins: [],
};
