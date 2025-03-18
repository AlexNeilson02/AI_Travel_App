
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["poppins", "sans-serif"],
      },
      fontSize: {
        h1: ["31px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["25px", { lineHeight: "1.2", fontWeight: "700" }],
        h3: ["21px", { lineHeight: "1.2", fontWeight: "700" }],
        base: ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        button: ["20px", { lineHeight: "1.2", fontWeight: "600" }],
      },
      colors: {
        primary: {
          DEFAULT: "#80bdce",
          light: "#80bdce",
        },
        secondary: {
          DEFAULT: "#80bdce",
          light: "#80bdce",
        },
        neutral: {
          900: "#FFA92C",
          800: "#FFC570",
          200: "#C0C0C0",
          100: "#F6FAF9",
        },
      },
      dropShadow: {
        DEFAULT: "0 0 4px rgba(0, 0, 0, 0.15)",
        primary: "0 4px 8px rgba(0, 0, 0, 0.15)",
        secondary: "0 2px 4px rgba(0, 0, 0, 0.10)",
      },
      blur: {
        sm: "4px",
        md: "8px",
      }
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
