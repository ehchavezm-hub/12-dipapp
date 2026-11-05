"use client"

import { useMemo, useRef, useState } from "react"
import { z } from "zod"
import { useAnalysisStore } from "@/lib/store/analysisStore"
import {
  DocumentChunkSchema,
  MAX_SUPPORT_CHUNKS,
  type DocumentChunk,
} from "@/lib/schemas/analysis"
import { readErrorMessage } from "@/lib/services/analysisService"

const IngestResponseSchema = z.array(DocumentChunkSchema)
const MAX_FILE_BYTES = 500 * 1024
const MAX_FILES = 3

interface UploadError {
  file: string
  message: string
}

export function DocumentsStep() {
  const { currentCase, updateCase } = useAnalysisStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<UploadError[]>([])

  const docs: DocumentChunk[] = useMemo(
    () => currentCase.support_documents ?? [],
    [currentCase.support_documents]
  )

  // One row per source file, with its chunk count
  const bySource = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of docs) counts.set(d.source, (counts.get(d.source) ?? 0) + 1)
    return Array.from(counts.entries())
  }, [docs])

  async function ingestFile(file: File): Promise<DocumentChunk[]> {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("Archivo mayor a 500 KB. Reduzca el tamaño del PDF antes de subir.")
    }
    const formData = new FormData()
    formData.append("file", file)
    const resp = await fetch("/api/proxy/documents/ingest", { method: "POST", body: formData })
    if (!resp.ok) throw new Error(await readErrorMessage(resp))
    const parsed = IngestResponseSchema.safeParse(await resp.json())
    if (!parsed.success) throw new Error("Respuesta de ingesta inválida")
    return parsed.data
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    if (bySource.length >= MAX_FILES) {
      setErrors([{ file: "—", message: `Máximo ${MAX_FILES} archivos permitidos.` }])
      return
    }
    setUploading(true)
    const newErrors: UploadError[] = []
    let next = [...docs]
    const remaining = MAX_FILES - bySource.length
    for (const file of Array.from(files).slice(0, remaining)) {
      try {
        const chunks = await ingestFile(file)
        // Re-uploading the same file replaces its chunks
        next = [...next.filter((d) => d.source !== file.name), ...chunks]
      } catch (err) {
        newErrors.push({
          file: file.name,
          message: err instanceof Error ? err.message : "Error desconocido",
        })
      }
    }
    if (next.length > MAX_SUPPORT_CHUNKS) {
      newErrors.push({
        file: "—",
        message: `Se conservaron los primeros ${MAX_SUPPORT_CHUNKS} fragmentos (límite del análisis).`,
      })
      next = next.slice(0, MAX_SUPPORT_CHUNKS)
    }
    updateCase({ support_documents: next })
    setErrors(newErrors)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removeSource(source: string) {
    updateCase({ support_documents: docs.filter((d) => d.source !== source) })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ color: "#6D6E71", fontFamily: "var(--font-urbanist)" }}>
        Documentos de Soporte
      </h2>
      <p style={{ color: "#6D6E71" }}>
        Adjunte PDFs relevantes para el análisis (opcional). Máx. {MAX_FILES} archivos · 500 KB por archivo.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        aria-label="Subir documentos PDF"
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          background: uploading ? "#6D6E71" : "#1A1A1A",
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

      {errors.length > 0 && (
        <ul role="alert" style={{ listStyle: "none", padding: 0, color: "#555555", fontSize: 13 }}>
          {errors.map((e) => (
            <li key={`${e.file}-${e.message}`}>
              {e.file}: {e.message}
            </li>
          ))}
        </ul>
      )}

      {bySource.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {bySource.map(([source, count]) => (
            <li
              key={source}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}
            >
              <span style={{ color: "#333333" }} aria-hidden="true">
                PDF
              </span>
              <span style={{ fontFamily: "var(--font-urbanist)" }}>
                {source}
                <span style={{ color: "#6D6E71", fontSize: 12, marginLeft: 6 }}>
                  ({count} fragmentos)
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeSource(source)}
                style={{ background: "none", border: "none", color: "#555555", cursor: "pointer" }}
                aria-label={`Eliminar ${source}`}
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
