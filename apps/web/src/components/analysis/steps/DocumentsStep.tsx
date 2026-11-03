"use client"

import { useRef } from "react"
import { useAnalysisStore } from "@/lib/store/analysisStore"

export function DocumentsStep() {
  const { currentCase, updateCase } = useAnalysisStore()
  const docs = currentCase.support_documents ?? []
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files)
    updateCase({ support_documents: [...docs, ...newFiles] })
  }

  function removeDocument(index: number) {
    const updated = docs.filter((_, i) => i !== index)
    updateCase({ support_documents: updated })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ color: "#5F6368", fontFamily: "var(--font-urbanist)" }}>
        Documentos de Soporte
      </h2>
      <p style={{ color: "#5F6368" }}>
        Adjunte PDFs relevantes para el análisis (opcional).
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf"
        aria-label="Subir documentos PDF"
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: "#4285F4",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "8px 16px",
          cursor: "pointer",
          fontFamily: "var(--font-urbanist)",
          width: "fit-content",
        }}
      >
        Agregar PDFs
      </button>
      {docs.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {docs.map((doc, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 0",
              }}
            >
              <span style={{ color: "#34A853" }}>📄</span>
              <span style={{ fontFamily: "var(--font-urbanist)" }}>
                {doc instanceof File ? doc.name : String(doc)}
              </span>
              <button
                type="button"
                onClick={() => removeDocument(i)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#EA4335",
                  cursor: "pointer",
                }}
                aria-label={`Eliminar ${doc instanceof File ? doc.name : String(doc)}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
