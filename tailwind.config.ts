import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["forma", "sans-serif"],
      },
      fontSize: {
        h1: ["31px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["25px", { lineHeight: "1.2", fontWeight: "700" }],
        h3: ["21px", { lineHeight: "1.2", fontWeight: "700" }],
        base: ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        button: ["20px", { lineHeight: "1.2", fontWeight: "600" }],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#FF5A5F",
        secondary: "#00A699",
        neutral: {
          900: "#484848",
          800: "#767676",
          200: "#C0C0C0",
          100: "#F6FAF9",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      spacing: {
        element: "16px",
        button: "16px",
        vertical: "24px",
      },
      dropShadow: {
        button: "0 0 4px rgba(0, 0, 0, 0.15)",
      },
      blur: {
        card: "4px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;