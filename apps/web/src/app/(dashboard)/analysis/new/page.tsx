import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AnalysisStepper } from "@/components/analysis/AnalysisStepper"

export default async function NewAnalysisPage() {
  const session = await auth()
  if (!session) redirect("/login")
  return (
    <main className="container mx-auto py-8">
      <AnalysisStepper />
    </main>
  )
}
