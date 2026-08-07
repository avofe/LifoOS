import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
      },
      colors: {
        accent: {
          DEFAULT: "#7B6FF0",
          light: "#A99DF5",
          bg: "rgba(123,111,240,0.07)",
        },
        surface: {
          DEFAULT: "#111114",
          2: "#18181C",
        },
      },
      animation: {
        "vline": "vline 4s ease-in-out infinite",
        "blink": "blink 1.1s step-end infinite",
        "ring": "ring 2s ease-in-out infinite",
      },
      keyframes: {
        vline: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.9" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        ring: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
