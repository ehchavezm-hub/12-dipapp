"use client"

import { signOutAction } from "@/app/actions/auth"

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-sm text-brand-gray hover:text-brand-blue transition-colors bg-transparent border-none cursor-pointer font-sans"
      >
        Cerrar sesión
      </button>
    </form>
  )
}
