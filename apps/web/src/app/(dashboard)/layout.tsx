import Link from "next/link"
import { auth } from "@/auth"
import { SignOutButton } from "@/components/ui/SignOutButton"
import { KeepAlive } from "@/components/ui/KeepAlive"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = session?.user.role ?? "viewer"
  const canAnalyze = role === "editor" || role === "superadmin"

  return (
    <div className="min-h-screen bg-white font-sans">
      <nav
        aria-label="Navegación principal"
        className="flex items-center gap-6 px-6 py-3 border-b border-brand-gray/30"
      >
        <Link href="/graph" className="font-bold text-black">
          DipApp
        </Link>
        <Link href="/graph" className="text-sm text-brand-gray hover:text-black">
          Grafo
        </Link>
        {canAnalyze && (
          <Link href="/analysis/new" className="text-sm text-brand-gray hover:text-black">
            Nuevo análisis
          </Link>
        )}
        {role === "superadmin" && (
          <Link href="/admin" className="text-sm text-brand-gray hover:text-black">
            Admin
          </Link>
        )}
        {session?.user && (
          <div className="ml-auto flex items-center gap-4">
            <span className="text-xs text-brand-gray">
              {session.user.githubLogin || session.user.email} · {role}
            </span>
            <SignOutButton />
          </div>
        )}
      </nav>
      <KeepAlive />
      {children}
    </div>
  )
}
