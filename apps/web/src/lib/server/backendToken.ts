import { createHmac } from "crypto"
import type { Session } from "next-auth"
import type { Role } from "@dipapp/types"

const TOKEN_TTL_SECONDS = 3600

/**
 * Create a backend-compatible HS256 JWT `{ sub, role, iat, exp }`.
 * Validated by `apps/api/middleware/auth.py::validate_token` (exp + sub required).
 */
export function createBackendToken(sub: string, role: Role): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!secret) throw new Error("NEXTAUTH_SECRET / AUTH_SECRET not set")
  if (!sub.trim()) throw new Error("Cannot mint a backend token with an empty subject")
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const payload = Buffer.from(
    JSON.stringify({ sub, role, iat: now, exp: now + TOKEN_TTL_SECONDS })
  ).toString("base64url")
  const sig = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")
  return `${header}.${payload}.${sig}`
}

/**
 * Stable per-user subject for the backend token. Uses `||` (not `??`) because the
 * session callback defaults `githubLogin` to "" — an empty subject would merge every
 * user into a single rate-limit bucket.
 */
export function backendSubject(session: Session): string {
  return session.user.githubLogin || session.user.email || ""
}

/** Mint a backend token for the current session. */
export function createSessionBackendToken(session: Session): string {
  return createBackendToken(backendSubject(session), session.user.role ?? "viewer")
}

/**
 * Backend base URL. `BACKEND_URL` is the documented (server-only) variable; the
 * NEXT_PUBLIC_* names are accepted for backwards compatibility with earlier configs.
 */
export function getBackendUrl(): string {
  const url =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8000"
  return url.replace(/\/+$/, "")
}
