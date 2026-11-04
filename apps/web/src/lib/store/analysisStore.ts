import { create } from "zustand"
import { DEFAULT_SCORING_WEIGHTS, type AnalysisCaseDTO } from "@/lib/schemas/analysis"

export const STEP_COUNT = 5

interface AnalysisState {
  currentCase: Partial<AnalysisCaseDTO>
  step: number
  isSubmitting: boolean
  updateCase: (patch: Partial<AnalysisCaseDTO>) => void
  nextStep: () => void
  prevStep: () => void
  loadExampleCase: (index?: number) => void
  reset: () => void
  setSubmitting: (value: boolean) => void
}

// ─── Caso 1: Perú – China (Puerto Chancay + TLC ampliado) ───────────────────
const CASE_PERU_CHINA: AnalysisCaseDTO = {
  target_profiles: [{ id: "c-chn", name: "China", country_code: "CN" }],
  geopolitical_context: {
    region: "Asia-Pacífico",
    description:
      "China es el principal socio comercial de Perú desde 2013. La inauguración del Puerto de Chancay (nov 2024, $1.3B COSCO Shipping) redefine la logística del Pacífico Sur. El TLC Perú-China (2010) cubre bienes pero excluye servicios digitales y datos. La Iniciativa de la Franja y la Ruta tiene 22 proyectos activos en infraestructura energética y minera en Perú. Tensión latente: soberanía sobre nodos críticos de infraestructura y transferencia tecnológica 5G (Huawei).",
  },
  diplomatic_objective: {
    type: "trade",
    description:
      "Ampliar el TLC Perú-China para incluir servicios digitales, economía de datos y comercio electrónico transfronterizo; negociar cláusulas de seguridad nacional para infraestructura portuaria de Chancay y telecomunicaciones 5G; establecer mecanismo bilateral de revisión de inversiones estratégicas.",
  },
  scoring_weights: { ...DEFAULT_SCORING_WEIGHTS },
  analysis_period_years: 10,
  support_documents: [],
  output_language: "es" as const,
  llm_model: "claude-haiku-3-5" as const,
  treaties: [
    { level: 1, active: true },
    { level: 2, active: true },
    { level: 2, active: true },
    { level: 3, active: true },
    { level: 3, active: true },
    { level: 3, active: true },
  ],
  icj_cases: 0,
}

// ─── Caso 2: Perú – Estados Unidos (Alianza estratégica + TPPA post-Trump) ──
const CASE_PERU_USA: AnalysisCaseDTO = {
  target_profiles: [{ id: "c-usa", name: "Estados Unidos", country_code: "US" }],
  geopolitical_context: {
    region: "América del Norte / Pacífico",
    description:
      "El ATPDEA y el TLC Perú-EEUU (vigente desde 2009) son la base comercial bilateral. La administración Trump 2025 ha reimplantado aranceles universales del 10% sobre importaciones latinoamericanas y presiona por cláusulas de exclusión de China en contratos de infraestructura. Perú es observador de la Alianza Indo-Pacífico para la Prosperidad Económica (IPEF) pero no miembro pleno. EEUU es el segundo inversor extranjero en Perú ($7.2B activos), con presencia clave en minería (Freeport-McMoRan, Southern Copper) y servicios financieros.",
  },
  diplomatic_objective: {
    type: "security",
    description:
      "Negociar un Acuerdo de Cooperación Estratégica Perú-EEUU que preserve el acceso preferencial al mercado norteamericano, gestione las nuevas condiciones arancelarias Trump, establezca salvaguardas sobre la presencia china en Chancay y defina un marco bilateral para minerales críticos (litio, cobre, zinc) en el contexto de la Ley de Reducción de la Inflación (IRA).",
  },
  scoring_weights: { ...DEFAULT_SCORING_WEIGHTS },
  analysis_period_years: 10,
  support_documents: [],
  output_language: "es" as const,
  llm_model: "claude-haiku-3-5" as const,
  treaties: [
    { level: 1, active: true },
    { level: 2, active: true },
    { level: 2, active: true },
    { level: 3, active: true },
    { level: 3, active: true },
  ],
  icj_cases: 0,
}

// ─── Caso 3: Perú – Bolivia (Acceso al mar + integración energética) ─────────
const CASE_PERU_BOLIVIA: AnalysisCaseDTO = {
  target_profiles: [{ id: "c-bol", name: "Bolivia", country_code: "BO" }],
  geopolitical_context: {
    region: "América del Sur / Andes",
    description:
      "Bolivia no tiene acceso soberano al mar desde la Guerra del Pacífico (1879). Perú ofrece acceso portuario en Ilo bajo el Acuerdo de Ilo (1992, ampliado 2010) y el proyecto Boliviamar, pero su utilización efectiva es <3% del comercio boliviano. Bolivia exporta gas natural ($2.1B/año, en declive) y litio (reservas probadas 21M ton, las mayores del mundo). Tensión: Bolivia ha buscado acceso alternativo vía Chile (proceso CIJ fallido 2018) y acercamiento a Argentina. Crisis política interna boliviana (Arce vs. Morales, 2024-2025) crea incertidumbre en negociaciones multilaterales.",
  },
  diplomatic_objective: {
    type: "territorial",
    description:
      "Establecer un Corredor Económico Perú-Bolivia que reactive el Acuerdo de Ilo con infraestructura moderna (zona franca, almacenes, ferrocarril bioceánico); negociar participación peruana en cadena de valor del litio boliviano a cambio de facilidades portuarias soberanas; crear mecanismo de cogobernanza para el Lago Titicaca ante el deterioro ambiental documentado.",
  },
  scoring_weights: { ...DEFAULT_SCORING_WEIGHTS },
  analysis_period_years: 20,
  support_documents: [],
  output_language: "es" as const,
  llm_model: "claude-haiku-3-5" as const,
  treaties: [
    { level: 1, active: true },
    { level: 2, active: true },
    { level: 3, active: true },
    { level: 3, active: true },
  ],
  icj_cases: 0,
}

// ─── Caso 4: Perú – Unión Europea (Acuerdo Comercial ampliado + CBAM) ───────
const CASE_PERU_EU: AnalysisCaseDTO = {
  target_profiles: [
    { id: "c-deu", name: "Alemania", country_code: "DE" },
    { id: "c-esp", name: "España", country_code: "ES" },
    { id: "c-nld", name: "Países Bajos", country_code: "NL" },
  ],
  geopolitical_context: {
    region: "Europa / Atlántico",
    description:
      "El Acuerdo Comercial Perú-UE (2013) ha impulsado las exportaciones peruanas de agroindustria y pesca ($4.8B/año a la UE). La UE implementa en 2026 el Mecanismo de Ajuste en Frontera de Carbono (CBAM) que afectará exportaciones de aluminio, fertilizantes y acero peruanos. El Reglamento de Deforestación (EUDR) limita acceso a cacao, café y madera sin certificación. La UE es el primer inversor en sector agroexportador (Países Bajos, Alemania) y el mayor mercado para espárragos peruanos. Negociaciones para modernizar el Acuerdo iniciadas en 2023 pero estancadas en capítulos de sostenibilidad y compras públicas.",
  },
  diplomatic_objective: {
    type: "trade",
    description:
      "Modernizar el Acuerdo Comercial Perú-UE para incorporar: (1) capítulo de economía verde y certificación de huella de carbono que cumpla el CBAM; (2) reconocimiento mutuo de denominaciones de origen para productos bandera peruanos (pisco, cacao nativo, café de especialidad); (3) mecanismo de cooperación para transición energética y minería responsable de minerales críticos para la electrificación europea.",
  },
  scoring_weights: { ...DEFAULT_SCORING_WEIGHTS },
  analysis_period_years: 10,
  support_documents: [],
  output_language: "es" as const,
  llm_model: "claude-haiku-3-5" as const,
  treaties: [
    { level: 1, active: true },
    { level: 2, active: true },
    { level: 2, active: true },
    { level: 3, active: true },
    { level: 3, active: true },
    { level: 3, active: true },
  ],
  icj_cases: 0,
}

// ─── Caso 5: Perú – Ecuador – Colombia (Alianza del Pacífico + seguridad) ────
const CASE_PERU_AP: AnalysisCaseDTO = {
  target_profiles: [
    { id: "c-ecu", name: "Ecuador", country_code: "EC" },
    { id: "c-col", name: "Colombia", country_code: "CO" },
    { id: "c-chl", name: "Chile", country_code: "CL" },
  ],
  geopolitical_context: {
    region: "América del Sur / Alianza del Pacífico",
    description:
      "La Alianza del Pacífico (2011) es el bloque más dinámico de América Latina: $1.1T PIB combinado, libre circulación de personas, bienes y capitales entre Chile, Colombia, México y Perú. Ecuador solicitó adhesión plena en 2023. Crisis de seguridad en Ecuador (narcotráfico, 2024) y Colombia (negociaciones ELN rotas, 2025) generan spillovers migratorios hacia Perú (200,000 venezolanos/colombianos en tránsito 2024). Oportunidad: coordinar posición común AP en negociaciones con ASEAN, UE e India como bloque.",
  },
  diplomatic_objective: {
    type: "multilateral",
    description:
      "Impulsar desde la Presidencia Pro Tempore peruana de la Alianza del Pacífico (2025) tres agendas: (1) integración del mercado de capitales y pasaporte de fondos AP; (2) protocolo de gestión migratoria y seguridad fronteriza tripartita Perú-Ecuador-Colombia con apoyo ACNUR; (3) posición común AP para la negociación del Acuerdo AP-ASEAN que incluya cadenas de valor de minerales críticos y economía digital.",
  },
  scoring_weights: { ...DEFAULT_SCORING_WEIGHTS },
  analysis_period_years: 5,
  support_documents: [],
  output_language: "es" as const,
  llm_model: "claude-haiku-3-5" as const,
  treaties: [
    { level: 1, active: true },
    { level: 1, active: true },
    { level: 2, active: true },
    { level: 2, active: true },
    { level: 3, active: true },
    { level: 3, active: true },
  ],
  icj_cases: 0,
}

export const PRESET_CASES: { label: string; tag: string; case: AnalysisCaseDTO }[] = [
  { label: "Perú – China: Puerto Chancay y TLC digital",       tag: "Comercio · Infraestructura",  case: CASE_PERU_CHINA  },
  { label: "Perú – EE.UU.: Minerales críticos y seguridad",   tag: "Seguridad · Comercio",         case: CASE_PERU_USA    },
  { label: "Perú – Bolivia: Corredor Ilo y litio",             tag: "Territorial · Energía",        case: CASE_PERU_BOLIVIA },
  { label: "Perú – UE: CBAM, EUDR y denominaciones origen",   tag: "Comercio · Sostenibilidad",    case: CASE_PERU_EU     },
  { label: "Alianza del Pacífico: seguridad y ASEAN",          tag: "Multilateral · Seguridad",     case: CASE_PERU_AP     },
]

export const EXAMPLE_CASE = PRESET_CASES[0].case

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentCase: {},
  step: 0,
  isSubmitting: false,
  updateCase: (patch) =>
    set((state) => ({ currentCase: { ...state.currentCase, ...patch } })),
  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, STEP_COUNT - 1) })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 0) })),
  loadExampleCase: (index = 0) =>
    set({ currentCase: PRESET_CASES[index % PRESET_CASES.length].case }),
  reset: () => set({ currentCase: {}, step: 0, isSubmitting: false }),
  setSubmitting: (value) => set({ isSubmitting: value }),
}))
