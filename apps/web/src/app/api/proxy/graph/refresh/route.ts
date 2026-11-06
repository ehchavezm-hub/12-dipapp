import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createSessionBackendToken, getBackendUrl } from "@/lib/server/backendToken"

export const runtime = "nodejs"

export async function POST(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let token: string
  try {
    token = createSessionBackendToken(session)
  } catch {
    return NextResponse.json({ error: "Session error" }, { status: 401 })
  }

  try {
    const resp = await fetch(`${getBackendUrl()}/graph/data?refresh=true`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 })
  }
}
