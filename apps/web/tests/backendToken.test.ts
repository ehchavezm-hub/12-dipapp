import { createHmac } from "crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Session } from "next-auth"
import { backendSubject, createBackendToken, getBackendUrl } from "@/lib/server/backendToken"

function decode(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>
}

function session(user: Partial<Session["user"]>): Session {
  return { user: { role: "editor", ...user }, expires: "2099-01-01" } as Session
}

afterEach(() => vi.unstubAllEnvs())

describe("createBackendToken (contract with apps/api/middleware/auth.py)", () => {
  it("emits an HS256 JWT with sub, role, iat and exp", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret")
    const token = createBackendToken("octocat", "editor")
    const [h, p, sig] = token.split(".")
    expect(decode(h)).toEqual({ alg: "HS256", typ: "JWT" })
    const payload = decode(p)
    expect(payload).toMatchObject({ sub: "octocat", role: "editor" })
    expect(Number(payload.exp) - Number(payload.iat)).toBe(3600)
    const expected = createHmac("sha256", "test-secret").update(`${h}.${p}`).digest("base64url")
    expect(sig).toBe(expected)
  })

  it("refuses to mint a token with an empty subject", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret")
    expect(() => createBackendToken("  ", "viewer")).toThrow(/empty subject/)
  })
})

describe("backendSubject", () => {
  it("falls back to email when githubLogin is an empty string", () => {
    expect(backendSubject(session({ githubLogin: "", email: "a@b.c" }))).toBe("a@b.c")
  })

  it("prefers the GitHub login", () => {
    expect(backendSubject(session({ githubLogin: "octocat", email: "a@b.c" }))).toBe("octocat")
  })
})

describe("getBackendUrl", () => {
  it("prefers BACKEND_URL (spec) over legacy NEXT_PUBLIC_* names and strips trailing slashes", () => {
    vi.stubEnv("BACKEND_URL", "https://api.example.com/")
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://legacy.example.com")
    expect(getBackendUrl()).toBe("https://api.example.com")
  })

  it("accepts the legacy NEXT_PUBLIC_BACKEND_URL", () => {
    vi.stubEnv("BACKEND_URL", "")
    vi.stubEnv("NEXT_PUBLIC_API_URL", "")
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://graph.example.com")
    expect(getBackendUrl()).toBe("https://graph.example.com")
  })
})
