import { createHmac } from "crypto"

/** Create a backend-compatible HS256 JWT from the session's user claims. */
export function createBackendToken(sub: string, role: string): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!secret) throw new Error("NEXTAUTH_SECRET / AUTH_SECRET not set")
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(JSON.stringify({ sub, role, iat: now, exp: now + 3600 })).toString("base64url")
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")
  return `${header}.${payload}.${sig}`
}
