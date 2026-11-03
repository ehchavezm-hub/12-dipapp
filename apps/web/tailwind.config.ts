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
        // Google Material palette — only permitted colors
        brand: {
          blue: "#4285F4",
          green: "#34A853",
          yellow: "#FBBC05",
          red: "#EA4335",
          gray: "#5F6368",
        },
      },
    },
  },
  plugins: [],
}

export default config
