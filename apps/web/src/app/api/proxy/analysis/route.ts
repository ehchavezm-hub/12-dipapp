import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/server/backendProxy"

// LLM generation takes up to ~45s; the platform default would cut it off.
export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  return proxyToBackend("/analysis/", {
    body: await req.text(),
    contentType: "application/json",
  })
}
