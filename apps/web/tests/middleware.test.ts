import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import type { Role } from "@dipapp/types"

// Mock next-auth to avoid runtime dependencies
vi.mock("next-auth", () => ({
  default: vi.fn(),
}))

// We need to mock the auth module to control what token/session is returned
vi.mock("../src/auth", () => ({
  auth: vi.fn(),
  authConfig: {},
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Import the middleware AFTER mocking
// We'll test the core logic directly by importing the middleware function
import { testableMiddleware } from "../src/middleware"

function makeRequest(pathname: string, options?: { role?: Role }): NextRequest {
  const url = `http://localhost:3000${pathname}`
  const req = new NextRequest(url)

  if (options?.role) {
    // Attach role via a custom header that our testable middleware reads
    const headers = new Headers(req.headers)
    headers.set("x-test-role", options.role)
    return new NextRequest(url, { headers })
  }

  return req
}

describe("RBAC middleware", () => {
  it("viewer accessing /analysis/new redirects to /graph", async () => {
    const req = makeRequest("/analysis/new", { role: "viewer" })
    const res = await testableMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/graph")
  })

  it("editor accessing /analysis/new returns 200", async () => {
    const req = makeRequest("/analysis/new", { role: "editor" })
    const res = await testableMiddleware(req)
    expect(res.status).not.toBe(307)
  })
})
