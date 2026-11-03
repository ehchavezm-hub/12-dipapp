"use client"

import { useRef, useState } from "react"
import { useAnalysisStore } from "@/lib/store/analysisStore"

export function DocumentsStep() {
  const { currentCase, updateCase } = useAnalysisStore()
  const docs = currentCase.support_documents ?? []
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [chunkCounts, setChunkCounts] = useState<Record<string, number>>({})
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    setUploading(true)
    const newDocs = [...docs]
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append("file", file)
        const resp = await fetch("/api/proxy/documents/ingest", {
          method: "POST",
          body: formData,
        })
        if (resp.ok) {
          const chunks: { content: string; source: string; chunk_index: number }[] = await resp.json()
          setChunkCounts(prev => ({ ...prev, [file.name]: chunks.length }))
          newDocs.push(...chunks)
        } else {
          newDocs.push(file)
        }
      } catch {
        newDocs.push(file)
      }
    }
    updateCase({ support_documents: newDocs })
    setUploading(false)
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
        disabled={uploading}
        style={{
          background: uploading ? "#5F6368" : "#4285F4",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "8px 16px",
          cursor: uploading ? "default" : "pointer",
          fontFamily: "var(--font-urbanist)",
          width: "fit-content",
        }}
      >
        {uploading ? "Procesando…" : "Agregar PDFs"}
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
                {doc instanceof File ? doc.name : (doc as { source?: string }).source ?? String(doc)}
                {doc instanceof File && chunkCounts[doc.name] != null && (
                  <span style={{ color: "#5F6368", fontSize: 12, marginLeft: 6 }}>
                    ({chunkCounts[doc.name]} fragmentos)
                  </span>
                )}
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
