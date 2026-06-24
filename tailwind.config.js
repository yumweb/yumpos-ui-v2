/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "var(--brand)",
        "brand-600": "var(--brand-600)",
        "brand-100": "var(--brand-100)",
        "brand-fg": "var(--brand-fg)",
        "brand-dark": "var(--brand-dark)",
        accent: "var(--accent)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        ink: "var(--text)",
        "ink-2": "var(--text-2)",
        "ink-3": "var(--text-3)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        md: "var(--radius-sm)",
        sm: "10px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20,24,40,.04), 0 10px 30px rgba(20,24,40,.07)",
        sm2: "0 1px 2px rgba(20,24,40,.05)",
      },
    },
  },
  plugins: [],
};
