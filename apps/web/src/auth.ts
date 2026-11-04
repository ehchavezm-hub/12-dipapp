import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import type { NextAuthConfig } from "next-auth"
import type { Role } from "@dipapp/types"

// Extend the built-in types to include role
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      role: Role
      githubLogin?: string
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role
    login?: string
    githubLogin?: string
  }
}

type GitHubOrg = { login: string }
type GitHubTeam = { slug: string; organization: { login: string } }

// ---------------------------------------------------------------------------
// Credentials users — parsed from DIPAPP_USERS env var
// Format: email:password:role,email2:password2:role2
// Passwords can be plain text or bcrypt hashes (recommended)
// ---------------------------------------------------------------------------
interface CredentialUser {
  email: string
  password: string
  role: Role
}

function parseCredentialUsers(): CredentialUser[] {
  const raw = process.env.DIPAPP_USERS ?? ""
  if (!raw) return []
  return raw.split(",").flatMap((entry) => {
    const parts = entry.trim().split(":")
    if (parts.length < 3) return []
    const [email, password, role] = parts
    if (!email || !password || !role) return []
    return [{ email: email.trim(), password: password.trim(), role: role.trim() as Role }]
  })
}

const REQUIRED_ORG = process.env.GITHUB_ORG // e.g. "cosapi-dipapp"

function githubHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" }
}

async function fetchGitHubList<T>(url: string, accessToken: string): Promise<T[]> {
  try {
    const res = await fetch(url, { headers: githubHeaders(accessToken) })
    if (!res.ok) return []
    const data: unknown = await res.json()
    return Array.isArray(data) ? (data as T[]) : []
  } catch {
    return []
  }
}

/**
 * When GITHUB_ORG is configured, only members of that org may sign in.
 * Superadmins listed in SUPERADMIN_GITHUB_LOGINS are always allowed.
 */
export function isAllowedToSignIn(login: string, orgs: GitHubOrg[]): boolean {
  if (!REQUIRED_ORG) return true
  const superadmins = (process.env.SUPERADMIN_GITHUB_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (superadmins.includes(login)) return true
  return orgs.some((o) => o.login.toLowerCase() === REQUIRED_ORG.toLowerCase())
}

/**
 * Resolves the Role for a GitHub user based on their login, orgs, and teams.
 */
export function resolveRole(
  login: string,
  _orgs: GitHubOrg[],
  teams: GitHubTeam[]
): Role {
  const superadminLogins = (process.env.SUPERADMIN_GITHUB_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (superadminLogins.includes(login)) {
    return "superadmin"
  }

  const inOrg = (team: GitHubTeam) =>
    !REQUIRED_ORG || team.organization.login === REQUIRED_ORG

  if (teams.some((t) => t.slug === "dipapp-admins" && inOrg(t))) {
    return "superadmin"
  }

  if (teams.some((t) => t.slug === "dipapp-editors" && inOrg(t))) {
    return "editor"
  }

  return "viewer"
}

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_CLIENT_SECRET,
      authorization: { params: { scope: "read:user user:email read:org" } },
      checks: ["state"],
    }),
    Credentials({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const users = parseCredentialUsers()
        const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
        if (!user) return null

        // Support both plain text (dev) and bcrypt hashes (production)
        const isValid = user.password.startsWith("$2")
          ? await bcrypt.compare(password, user.password)
          : password === user.password

        if (!isValid) return null
        return { id: email, email, name: email.split("@")[0], role: user.role }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!REQUIRED_ORG) return true
      const accessToken = account?.access_token
      if (!accessToken) return false
      const login = (profile as { login?: string } | undefined)?.login ?? ""
      const orgs = await fetchGitHubList<GitHubOrg>("https://api.github.com/user/orgs", accessToken)
      return isAllowedToSignIn(login, orgs)
    },
    async jwt({ token, account, profile, user }) {
      // Credentials login — role is already set on the user object
      if (account?.type === "credentials" && user) {
        token.role = (user as { role?: Role }).role ?? "viewer"
        token.githubLogin = ""
        token.login = token.email ?? ""
        return token
      }

      // GitHub OAuth login
      if (account?.access_token && profile) {
        const accessToken = account.access_token
        const githubProfile = profile as { login?: string }
        const login = githubProfile.login ?? token.email?.split("@")[0] ?? ""

        const [orgs, rawTeams] = await Promise.all([
          fetchGitHubList<GitHubOrg>("https://api.github.com/user/orgs", accessToken),
          fetchGitHubList<GitHubTeam>("https://api.github.com/user/teams", accessToken),
        ])

        token.githubLogin = login
        token.login = login
        token.role = resolveRole(login, orgs, rawTeams)
      }

      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          role: (token.role as Role) ?? "viewer",
          githubLogin: (token.githubLogin as string) ?? "",
        },
      }
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
