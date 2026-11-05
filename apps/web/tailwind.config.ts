import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-urbanist)", "sans-serif"],
      },
      colors: {
        // AECOM official palette
        brand: {
          blue:   "#1A1A1A",
          green:  "#333333",
          yellow: "#555555",
          red:    "#333333",
          gray:   "#6D6E71",
        },
      },
    },
  },
  plugins: [],
}

export default config
