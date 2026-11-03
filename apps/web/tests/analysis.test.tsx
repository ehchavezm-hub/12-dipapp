import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WeightsStep } from "@/components/analysis/steps/WeightsStep"
import { AnalysisStepper } from "@/components/analysis/AnalysisStepper"

it("weights not summing to 1.0 shows validation error", async () => {
  render(<WeightsStep />)
  await userEvent.type(screen.getByLabelText("Afinidad"), "0.5")
  await userEvent.type(screen.getByLabelText("Historial"), "0.4")
  await userEvent.type(screen.getByLabelText("Intereses"), "0.2")
  expect(await screen.findByText(/deben sumar 1\.0/i)).toBeInTheDocument()
})

it("Load Example Case populates all required fields", async () => {
  render(<AnalysisStepper />)
  await userEvent.click(screen.getByText("Cargar Caso de Ejemplo"))
  expect(screen.getByDisplayValue(/Peru/i)).toBeInTheDocument()
})
