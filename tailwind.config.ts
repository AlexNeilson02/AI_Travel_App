
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
        primary: "#FF5A5F",
        secondary: "#00A699",
        accent: "#FC642D",
        neutral: {
          900: "#484848",
          800: "#767676",
          200: "#DDDDDD",
          100: "#F7F7F7",
        },
        background: "white",
        foreground: "#484848",
        muted: "#F7F7F7",
        "muted-foreground": "#767676",
        border: "#DDDDDD",
      },
      spacing: {
        element: "16px",
        button: "16px",
        vertical: "24px",
      },
      boxShadow: {
        card: "0 6px 16px rgba(0,0,0,0.12)",
        button: "0 2px 4px rgba(0,0,0,0.08)",
        dropdown: "0 2px 16px rgba(0,0,0,0.15)",
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
