"use client"

import { useAnalysisStore } from "@/lib/store/analysisStore"
import type { TargetProfile } from "@/lib/schemas/analysis"

export function TargetProfileStep() {
  const { currentCase, updateCase } = useAnalysisStore()
  const profile: TargetProfile =
    currentCase.target_profiles?.[0] ?? { id: "", name: "", country_code: "" }

  function handleChange(field: keyof TargetProfile, value: string) {
    const updated: TargetProfile = { ...profile, [field]: value }
    updateCase({ target_profiles: [updated] })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ color: "#6D6E71", fontFamily: "var(--font-urbanist)" }}>
        Perfil del Objetivo
      </h2>
      <div>
        <label htmlFor="target-name" style={{ display: "block", marginBottom: 4 }}>
          Nombre{" "}
          <span style={{ fontSize: 12, color: "#9E9E9E", fontWeight: 400 }}>
            (País o entidad a analizar. Ej: «China», «Brasil», «Unión Europea»)
          </span>
        </label>
        <input
          id="target-name"
          type="text"
          value={profile.name}
          onChange={(e) => handleChange("name", e.target.value)}
          style={{
            border: "1px solid #6D6E71",
            borderRadius: 4,
            padding: "8px 12px",
            width: "100%",
          }}
        />
      </div>
      <div>
        <label htmlFor="target-country" style={{ display: "block", marginBottom: 4 }}>
          Código de País (2 letras){" "}
          <span style={{ fontSize: 12, color: "#9E9E9E", fontWeight: 400 }}>
            (Código ISO. Ej: PE = Perú, BR = Brasil, CN = China, US = Estados Unidos)
          </span>
        </label>
        <input
          id="target-country"
          type="text"
          maxLength={2}
          value={profile.country_code}
          onChange={(e) =>
            handleChange("country_code", e.target.value.toUpperCase())
          }
          style={{
            border: "1px solid #6D6E71",
            borderRadius: 4,
            padding: "8px 12px",
            width: "80px",
          }}
        />
      </div>
    </div>
  )
}
