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
        display: ["var(--font-display)", "Newsreader", "Georgia", "serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
