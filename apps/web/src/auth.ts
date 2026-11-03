import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
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
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role
    login?: string
  }
}

type GitHubOrg = { login: string }
type GitHubTeam = { slug: string }

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

  const teamSlugs = teams.map((t) => t.slug)

  if (teamSlugs.includes("dipapp-admins")) {
    return "superadmin"
  }

  if (teamSlugs.includes("dipapp-editors")) {
    return "editor"
  }

  return "viewer"
}

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // On initial sign in, account is available
      if (account?.access_token) {
        const accessToken = account.access_token

        // Fetch GitHub user info for login
        const login = (token.name ?? "").toLowerCase().replace(/\s+/g, "")

        // Fetch orgs and teams
        const [orgsRes, teamsRes] = await Promise.all([
          fetch("https://api.github.com/user/orgs", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github+json",
            },
          }),
          fetch("https://api.github.com/user/teams", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github+json",
            },
          }),
        ])

        const orgs: GitHubOrg[] = orgsRes.ok ? await orgsRes.json() : []
        const teams: GitHubTeam[] = teamsRes.ok ? await teamsRes.json() : []

        token.login = login
        token.role = resolveRole(login, orgs, teams)
      }

      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          role: (token.role as Role) ?? "viewer",
        },
      }
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
