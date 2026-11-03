import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createSessionBackendToken, getBackendUrl } from "@/lib/server/backendToken"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const token = createSessionBackendToken(session)
    return NextResponse.json({ token, backendUrl: getBackendUrl() })
  } catch {
    return NextResponse.json({ error: "Session has no usable identity" }, { status: 401 })
  }
}
