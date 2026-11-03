import type { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/server/backendProxy"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  // Content-Type (with multipart boundary) is set by fetch from the FormData body.
  return proxyToBackend("/documents/ingest", { body: await req.formData() })
}
