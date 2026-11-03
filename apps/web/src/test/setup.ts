import "@testing-library/jest-dom"
import { vi } from "vitest"

// Mock next/navigation for components that use useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))
