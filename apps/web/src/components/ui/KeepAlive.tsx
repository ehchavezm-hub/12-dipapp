"use client"

import { useEffect } from "react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? ""
const INTERVAL_MS = 10 * 60 * 1000 // 10 minutos

export function KeepAlive() {
  useEffect(() => {
    if (!BACKEND_URL) return
    const ping = () => fetch(`${BACKEND_URL}/health`, { method: "GET" }).catch(() => {})
    ping()
    const id = setInterval(ping, INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return null
}
