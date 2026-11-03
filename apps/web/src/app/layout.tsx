import type { Metadata } from "next"
import { Urbanist } from "next/font/google"
import "./globals.css"

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
})

export const metadata: Metadata = {
  title: "DipApp — Diplomatic Intelligence",
  description: "AI-powered diplomatic intelligence and geopolitical analysis platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={urbanist.variable}>
      <body className="font-sans antialiased bg-white text-black">{children}</body>
    </html>
  )
}
