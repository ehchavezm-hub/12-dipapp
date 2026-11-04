import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WeightsStep } from "@/components/analysis/steps/WeightsStep"
import { DocumentsStep } from "@/components/analysis/steps/DocumentsStep"
import { AnalysisStepper } from "@/components/analysis/AnalysisStepper"
import { useAnalysisStore, EXAMPLE_CASE } from "@/lib/store/analysisStore"
import { AnalysisCaseDTOSchema } from "@/lib/schemas/analysis"

beforeEach(() => {
  useAnalysisStore.getState().reset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it("weights not summing to 1.0 shows validation error", async () => {
  render(<WeightsStep />)
  for (const [label, value] of [["Afinidad", "0.5"], ["Historial", "0.4"], ["Intereses", "0.2"]]) {
    const input = screen.getByLabelText(label)
    await userEvent.clear(input)
    await userEvent.type(input, value)
  }
  expect(await screen.findByText(/deben sumar 1\.0/i)).toBeInTheDocument()
})

it("weights default to the spec values 0.40 / 0.35 / 0.25", () => {
  render(<WeightsStep />)
  expect(screen.getByLabelText("Afinidad")).toHaveValue(0.4)
  expect(screen.getByLabelText("Historial")).toHaveValue(0.35)
  expect(screen.getByLabelText("Intereses")).toHaveValue(0.25)
})

it("Load Example Case dropdown shows preset options", async () => {
  render(<AnalysisStepper />)
  await userEvent.click(screen.getByText("Cargar Caso de Ejemplo"))
  // Dropdown should appear with the first preset
  expect(await screen.findByText(/Perú.*China/i)).toBeInTheDocument()
})

it("Load Example Case loads the first preset on click", async () => {
  render(<AnalysisStepper />)
  await userEvent.click(screen.getByText("Cargar Caso de Ejemplo"))
  const firstOption = await screen.findByText(/Puerto Chancay/i)
  await userEvent.click(firstOption)
  // After loading CASE_PERU_CHINA, the target name "China" should appear
  expect(screen.getByDisplayValue("China")).toBeInTheDocument()
})

it("example case is a valid AnalysisCaseDTO with a consistent target id", () => {
  expect(AnalysisCaseDTOSchema.safeParse(EXAMPLE_CASE).success).toBe(true)
  // PRESET_CASES[0] = CASE_PERU_CHINA: target is China (CN)
  expect(EXAMPLE_CASE.target_profiles[0]).toMatchObject({ id: "c-chn", country_code: "CN" })
})

describe("AnalysisStepper submit", () => {
  it("does not call the backend itself (results page performs the single request)", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    useAnalysisStore.setState({ currentCase: EXAMPLE_CASE, step: 4 })
    render(<AnalysisStepper />)
    await userEvent.click(screen.getByText("Analizar"))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("lists missing fields instead of a generic alert", async () => {
    useAnalysisStore.setState({ currentCase: {}, step: 4 })
    render(<AnalysisStepper />)
    await userEvent.click(screen.getByText("Analizar"))
    expect(await screen.findByText(/Complete los campos requeridos/i)).toBeInTheDocument()
    expect(screen.getByText(/target_profiles/)).toBeInTheDocument()
  })
})

describe("DocumentsStep", () => {
  it("never stores raw File objects when ingestion fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Could not extract text" }), { status: 422 })
      )
    )
    render(<DocumentsStep />)
    const input = screen.getByLabelText("Subir documentos PDF")
    await userEvent.upload(input, new File(["%PDF"], "bad.pdf", { type: "application/pdf" }))
    expect(await screen.findByText(/bad\.pdf: Could not extract text/)).toBeInTheDocument()
    expect(useAnalysisStore.getState().currentCase.support_documents).toEqual([])
  })

  it("stores typed chunks and groups them by source file", async () => {
    const chunks = [
      { content: "a", source: "ok.pdf", chunk_index: 0 },
      { content: "b", source: "ok.pdf", chunk_index: 1 },
    ]
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(chunks), { status: 200 }))
    )
    render(<DocumentsStep />)
    await userEvent.upload(
      screen.getByLabelText("Subir documentos PDF"),
      new File(["%PDF"], "ok.pdf", { type: "application/pdf" })
    )
    expect(await screen.findByText("(2 fragmentos)")).toBeInTheDocument()
    expect(useAnalysisStore.getState().currentCase.support_documents).toEqual(chunks)
  })
})

describe("AnalysisCaseDTOSchema (contract with Pydantic AnalysisCaseDTO)", () => {
  it("rejects support documents that are not DocumentChunks", () => {
    const res = AnalysisCaseDTOSchema.safeParse({ ...EXAMPLE_CASE, support_documents: [{}] })
    expect(res.success).toBe(false)
  })

  it("applies backend defaults for optional scoring inputs", () => {
    const { treaties: _t, icj_cases: _i, ...rest } = EXAMPLE_CASE
    const res = AnalysisCaseDTOSchema.parse(rest)
    expect(res.treaties).toEqual([])
    expect(res.icj_cases).toBe(0)
    expect(res.support_documents).toEqual([])
  })
})
