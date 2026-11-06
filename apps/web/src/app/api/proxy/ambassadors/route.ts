import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createSessionBackendToken, getBackendUrl } from "@/lib/server/backendToken"

export const runtime = "nodejs"

export async function GET(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let token: string
  try {
    token = createSessionBackendToken(session)
  } catch {
    return NextResponse.json({ error: "Session error" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get("refresh") === "true"

  try {
    const url = `${getBackendUrl()}/ambassadors${refresh ? "?refresh=true" : ""}`
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 })
  }
}
