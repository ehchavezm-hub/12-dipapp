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
          blue:   "#FF6600",   // AECOM Orange Primary — acento principal
          green:  "#003087",   // Engineering Blue — positivo / éxito
          yellow: "#0078C1",   // Blue Medium — destacado
          red:    "#E85500",   // Orange Deep — alerta / riesgo
          gray:   "#6D6E71",   // Gray Corporate — texto secundario
        },
      },
    },
  },
  plugins: [],
}

export default config
