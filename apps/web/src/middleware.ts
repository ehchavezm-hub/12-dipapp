import { NextRequest, NextResponse } from "next/server"
import type { Role } from "@dipapp/types"
import { auth } from "./auth"

// Route permission map
const ROUTE_PERMISSIONS: Array<{
  pattern: RegExp
  allowed: Role[]
}> = [
  { pattern: /^\/admin(\/|$)/, allowed: ["superadmin"] },
  { pattern: /^\/analysis\/new(\/|$)/, allowed: ["superadmin", "editor"] },
  { pattern: /^\/graph(\/|$)/, allowed: ["superadmin", "editor", "viewer"] },
  { pattern: /^\/results(\/|$)/, allowed: ["superadmin", "editor", "viewer"] },
]

function hasPermission(pathname: string, role: Role): boolean {
  for (const route of ROUTE_PERMISSIONS) {
    if (route.pattern.test(pathname)) {
      return route.allowed.includes(role)
    }
  }
  // Public routes (login, etc.) are allowed
  return true
}

/**
 * Testable core middleware logic — accepts a role directly (from session or test header).
 * Used in unit tests to bypass NextAuth session resolution.
 */
export async function testableMiddleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  // Only trust x-test-role in test environment — never in production
  const role: Role = (process.env.NODE_ENV === "test" && req.headers.get("x-test-role") as Role | null)
    || "viewer"

  // For protected routes, check permissions
  const isProtectedRoute = ROUTE_PERMISSIONS.some((r) => r.pattern.test(pathname))
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  if (!hasPermission(pathname, role)) {
    // Insufficient role → redirect to /graph
    return NextResponse.redirect(new URL("/graph", req.url), 307)
  }

  return NextResponse.next()
}

/**
 * The actual NextAuth v5 middleware — wraps the auth session check around the RBAC logic.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Unauthenticated users on protected routes → redirect to /login
  const isProtectedRoute = ROUTE_PERMISSIONS.some((r) => r.pattern.test(pathname))
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", req.url), 307)
  }

  // Authenticated users: check role
  const role: Role = (session?.user as { role?: Role } | undefined)?.role ?? "viewer"

  if (isProtectedRoute && !hasPermission(pathname, role)) {
    return NextResponse.redirect(new URL("/graph", req.url), 307)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
}
