import { redirect } from "next/navigation"
import { auth } from "@/auth"

export default async function HomePage() {
  const session = await auth()
  if (session?.user) {
    redirect("/graph")
  } else {
    redirect("/login")
  }
}
