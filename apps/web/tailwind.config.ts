import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        accent: "var(--accent)",
        muted: "var(--muted)",
        line: "var(--border)",
      },
      borderRadius: { xl2: "var(--radius)" },
      fontFamily: {
        display: ["var(--font-body)", "Roboto", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Roboto", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      maxWidth: {
        "6xl": "1120px",
      },
    },
  },
  plugins: [],
};

export default config;
