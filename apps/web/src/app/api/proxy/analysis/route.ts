import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createBackendToken } from "@/lib/server/backendToken"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const sub = (session.user as { githubLogin?: string }).githubLogin ?? session.user.email ?? ""
  const role = (session.user as { role?: string }).role ?? "viewer"
  const token = createBackendToken(sub, role)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
  const body = await req.text()
  const resp = await fetch(`${apiUrl}/analysis/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body,
  })
  const data = await resp.text()
  return new NextResponse(data, {
    status: resp.status,
    headers: { "Content-Type": resp.headers.get("Content-Type") ?? "application/json" },
  })
}
