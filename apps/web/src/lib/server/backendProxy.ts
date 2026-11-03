import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createSessionBackendToken, getBackendUrl } from "@/lib/server/backendToken"

function problem(status: number, title: string, detail: string): NextResponse {
  return NextResponse.json(
    { type: `https://httpstatuses.com/${status}`, title, status, detail },
    { status, headers: { "Content-Type": "application/problem+json" } }
  )
}

/**
 * Authenticated pass-through to the FastAPI backend.
 * - 401 when there is no session
 * - 502 (RFC 7807) when the backend is unreachable, instead of an unhandled throw
 * - streams the backend body through unchanged (keeps NDJSON streaming possible)
 */
export async function proxyToBackend(
  path: string,
  init: { body: BodyInit; contentType?: string }
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return problem(401, "Unauthorized", "Sign in required")

  let token: string
  try {
    token = createSessionBackendToken(session)
  } catch (err) {
    console.error("[proxy] token creation failed:", err)
    return problem(401, "Unauthorized", "Session has no usable identity")
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (init.contentType) headers["Content-Type"] = init.contentType

  let resp: Response
  try {
    resp = await fetch(`${getBackendUrl()}${path}`, { method: "POST", headers, body: init.body })
  } catch (err) {
    console.error(`[proxy] backend unreachable for ${path}:`, err)
    return problem(502, "Bad Gateway", "Analysis backend is unreachable")
  }

  return new NextResponse(resp.body, {
    status: resp.status,
    headers: { "Content-Type": resp.headers.get("Content-Type") ?? "application/json" },
  })
}
