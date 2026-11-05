"use client"
import React from "react"
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink, Link,
} from "@react-pdf/renderer"
import type { Scenario, ScoringResult } from "@/lib/types/results"
import type { AnalysisCaseDTO } from "@/lib/schemas/analysis"

const ORANGE   = "#1A1A1A"   // AECOM Orange — primary CTA
const ENG_BLUE = "#333333"   // Engineering Blue — pros / scenario A
const MED_BLUE = "#555555"   // Blue Medium — leverage / scenario C
const RED      = "#555555"   // Orange Deep — risk / cons
const GRAY     = "#6D6E71"
const LIGHT    = "#F2F2F2"
const DARK     = "#1A1A1A"

// Keep legacy aliases so existing code compiles without mass-renaming
const BLUE   = ORANGE
const GREEN  = ENG_BLUE
const YELLOW = MED_BLUE

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", backgroundColor: "#FFFFFF" },

  /* Cover */
  coverPage: { padding: 48, fontFamily: "Helvetica", backgroundColor: DARK, justifyContent: "center" },
  coverBadge: { fontSize: 10, color: BLUE, letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" },
  coverTitle: { fontSize: 28, fontWeight: "bold", color: "#FFFFFF", marginBottom: 8 },
  coverSub: { fontSize: 13, color: "#555555", marginBottom: 32 },
  coverMeta: { fontSize: 10, color: "#555555", marginTop: 4 },

  /* Section headers */
  scenarioHeader: { marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid ${BLUE}` },
  scenarioLabel: { fontSize: 22, fontWeight: "bold", color: BLUE },
  scenarioName: { fontSize: 15, color: DARK, marginTop: 2 },
  scores: { flexDirection: "row", gap: 24, marginTop: 10 },
  scoreBox: { backgroundColor: LIGHT, padding: "8 12", borderRadius: 4 },
  scoreNum: { fontSize: 20, fontWeight: "bold", color: DARK },
  scoreLabel: { fontSize: 9, color: GRAY },

  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 11, fontWeight: "bold", color: GRAY, marginBottom: 6,
    textTransform: "uppercase", letterSpacing: 1,
  },
  body: { fontSize: 10, color: DARK, lineHeight: 1.6 },

  /* Roadmap */
  roadmapRow: {
    flexDirection: "row", marginBottom: 8, backgroundColor: LIGHT,
    borderRadius: 4, padding: "8 10",
  },
  roadmapStep: { fontSize: 14, fontWeight: "bold", color: BLUE, width: 24 },
  roadmapContent: { flex: 1 },
  roadmapAction: { fontSize: 10, fontWeight: "bold", color: DARK, marginBottom: 2 },
  roadmapMeta: { fontSize: 9, color: GRAY },

  /* Pros/Cons */
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  pro: { fontSize: 10, color: GREEN, marginBottom: 4 },
  con: { fontSize: 10, color: RED, marginBottom: 4 },

  /* Leverage */
  chip: { fontSize: 10, color: YELLOW, marginBottom: 4 },

  /* Chain of Thought */
  cotBox: {
    backgroundColor: "#F5F5F5", borderLeft: `3px solid ${YELLOW}`,
    padding: "12 14", borderRadius: 2,
  },
  cotText: { fontSize: 9, color: "#1A1A1A", lineHeight: 1.7, fontFamily: "Helvetica-Oblique" },

  /* Sources */
  link: { fontSize: 9, color: BLUE, textDecoration: "underline", marginBottom: 3 },

  /* Scoring breakdown */
  breakdownRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  breakdownItem: { flex: 1, backgroundColor: LIGHT, padding: "8 10", borderRadius: 4 },
  breakdownNum: { fontSize: 16, fontWeight: "bold", color: DARK },
  breakdownLabel: { fontSize: 8, color: GRAY },
})

/* ── Roadmap flow colours ───────────────────────────────────────────── */
const C_ACTION = ORANGE
const C_PRO    = ENG_BLUE
const C_CON    = RED
const C_LEV    = MED_BLUE

/* ── Size limits (keeps PDF ≤ 500 KB) ──────────────────────────────── */
const MAX_STRATEGY   = 1200
const MAX_ITEM       = 280

function trunc(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "…" : text
}

interface ScenarioPDFProps {
  scenarios: Scenario[]
  scoring?: ScoringResult | null
  generatedAt?: string
  analysisCase?: Partial<AnalysisCaseDTO>
}

const OBJECTIVE_TYPE_LABELS: Record<string, string> = {
  trade: "Comercio / TLC",
  security: "Seguridad / Defensa",
  environment: "Medio Ambiente",
  humanitarian: "Humanitario",
  political: "Político / Diplomático",
  cultural: "Cultural / Educativo",
  technology: "Tecnología / Innovación",
  infrastructure: "Infraestructura",
  other: "Otro",
}

function CasePage({ analysisCase }: { analysisCase: Partial<AnalysisCaseDTO> }) {
  const targets = analysisCase.target_profiles ?? []
  const geo = analysisCase.geopolitical_context
  const obj = analysisCase.diplomatic_objective
  const period = analysisCase.analysis_period_years
  const docCount = analysisCase.support_documents?.length ?? 0

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={{ marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid ${ORANGE}` }}>
        <Text style={{ fontSize: 10, color: GRAY, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
          Datos del Caso Analizado
        </Text>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: DARK }}>Contexto y Parámetros de Entrada</Text>
      </View>

      {/* Targets */}
      <View style={[styles.section, { backgroundColor: "#F2F2F2", padding: "12 14", borderRadius: 4 }]}>
        <Text style={styles.sectionTitle}>Contraparte(s) Diplomática(s)</Text>
        {targets.map((t) => (
          <View key={t.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: "bold", color: DARK, marginRight: 8 }}>{t.name}</Text>
            <Text style={{ fontSize: 10, color: GRAY }}>({t.country_code})</Text>
          </View>
        ))}
      </View>

      {/* Objective */}
      {obj && (
        <View style={[styles.section, { backgroundColor: "#F5F5F5", borderLeft: `4px solid ${ORANGE}`, padding: "12 14", borderRadius: 4 }]}>
          <Text style={styles.sectionTitle}>Objetivo Diplomático</Text>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: ORANGE, marginBottom: 4 }}>
            Tipo: {OBJECTIVE_TYPE_LABELS[obj.type] ?? obj.type}
          </Text>
          <Text style={[styles.body, { lineHeight: 1.7 }]}>{obj.description}</Text>
        </View>
      )}

      {/* Geopolitical Context */}
      {geo && (
        <View style={[styles.section, { backgroundColor: "#E8EEF8", borderLeft: `4px solid ${ENG_BLUE}`, padding: "12 14", borderRadius: 4 }]}>
          <Text style={styles.sectionTitle}>Contexto Geopolítico</Text>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: ENG_BLUE, marginBottom: 4 }}>Región: {geo.region}</Text>
          <Text style={[styles.body, { lineHeight: 1.7 }]}>{geo.description}</Text>
        </View>
      )}

      {/* Meta row */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <View style={{ flex: 1, backgroundColor: LIGHT, padding: "10 12", borderRadius: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: DARK }}>{period ?? "—"}</Text>
          <Text style={{ fontSize: 9, color: GRAY }}>Período de análisis (años)</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: LIGHT, padding: "10 12", borderRadius: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: DARK }}>{docCount}</Text>
          <Text style={{ fontSize: 9, color: GRAY }}>Documentos de apoyo</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: LIGHT, padding: "10 12", borderRadius: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: DARK }}>{targets.length}</Text>
          <Text style={{ fontSize: 9, color: GRAY }}>Contrapartes analizadas</Text>
        </View>
      </View>
    </Page>
  )
}

function ChainOfThoughtPage({ scenario }: { scenario: Scenario }) {
  const colorMap: Record<string, string> = { A: ENG_BLUE, B: ORANGE, C: MED_BLUE }
  const accent = colorMap[scenario.label] ?? ORANGE

  return (
    <Page size="A4" style={styles.page}>
      <View style={{ marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${accent}` }}>
        <Text style={{ fontSize: 14, fontWeight: "bold", color: accent }}>
          Escenario {scenario.label} — Cadena de Razonamiento
        </Text>
        <Text style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>{scenario.name}</Text>
      </View>
      <View style={[styles.cotBox, { borderLeftColor: accent }]}>
        <Text style={styles.cotText}>{scenario.chain_of_thought ?? "(No disponible)"}</Text>
      </View>
    </Page>
  )
}

function CoverPage({ scenarios, scoring, generatedAt }: ScenarioPDFProps) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverBadge}>Sistema de Gestión Diplomática — DipApp</Text>
      <Text style={styles.coverTitle}>Análisis Diplomático{"\n"}Estratégico</Text>
      <Text style={styles.coverSub}>3 Escenarios: Óptima · Moderada · Contingencia</Text>
      {scoring && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 10, color: "#555555", marginBottom: 8 }}>SCORE PRE-LLM (DETERMINÍSTICO)</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { label: "Afinidad", val: scoring.breakdown.affinity },
              { label: "Historial", val: scoring.breakdown.history },
              { label: "Intereses", val: scoring.breakdown.interests },
              { label: "Total", val: scoring.score_total },
            ].map(({ label, val }) => (
              <View key={label} style={{ backgroundColor: "#2E2E2E", padding: "10 14", borderRadius: 4, flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: BLUE }}>{val.toFixed(1)}</Text>
                <Text style={{ fontSize: 8, color: "#555555" }}>{label}</Text>
              </View>
            ))}
          </View>
          {scoring.litigation_penalty < 0 && (
            <Text style={{ fontSize: 9, color: RED, marginTop: 6 }}>
              Penalización por litigios CIJ/CPA/CIADI: {scoring.litigation_penalty.toFixed(1)} pts
            </Text>
          )}
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 32 }}>
        {scenarios.map(s => (
          <View key={s.label} style={{ flex: 1, borderLeft: `2px solid ${BLUE}`, paddingLeft: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: "#FFFFFF" }}>
              {s.label} — {s.name}
            </Text>
            <Text style={{ fontSize: 9, color: "#555555", marginTop: 2 }}>
              Score {s.score_total.toFixed(1)} · Viab. {s.viability_score.toFixed(1)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.coverMeta}>Generado: {generatedAt ?? new Date().toLocaleDateString("es-PE")}</Text>
      <Text style={styles.coverMeta}>Confidencial — solo para uso interno</Text>
    </Page>
  )
}

function ScenarioPage({ scenario }: { scenario: Scenario }) {
  const colorMap: Record<string, string> = { A: GREEN, B: BLUE, C: YELLOW }
  const accent = colorMap[scenario.label] ?? BLUE

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={[styles.scenarioHeader, { borderBottomColor: accent }]}>
        <Text style={[styles.scenarioLabel, { color: accent }]}>
          Escenario {scenario.label}
        </Text>
        <Text style={styles.scenarioName}>{scenario.name}</Text>
        <View style={styles.scores}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNum}>{scenario.score_total.toFixed(1)}</Text>
            <Text style={styles.scoreLabel}>Score Total</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNum}>{scenario.viability_score.toFixed(1)}</Text>
            <Text style={styles.scoreLabel}>Viabilidad</Text>
          </View>
        </View>
      </View>

      {/* Strategy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estrategia</Text>
        <Text style={styles.body}>{trunc(scenario.strategy, MAX_STRATEGY)}</Text>
      </View>

      {/* Roadmap */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hoja de Ruta</Text>
        {scenario.roadmap.map(step => (
          <View key={step.step} style={styles.roadmapRow}>
            <Text style={[styles.roadmapStep, { color: accent }]}>{step.step}</Text>
            <View style={styles.roadmapContent}>
              <Text style={styles.roadmapAction}>{trunc(step.action, MAX_ITEM)}</Text>
              <Text style={styles.roadmapMeta}>{step.timeline} · {step.responsible}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Pros / Cons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ventajas y Desventajas</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            {scenario.pros.map((p, i) => <Text key={i} style={styles.pro}>✓ {trunc(p, MAX_ITEM)}</Text>)}
          </View>
          <View style={styles.col}>
            {scenario.cons.map((c, i) => <Text key={i} style={styles.con}>✗ {trunc(c, MAX_ITEM)}</Text>)}
          </View>
        </View>
      </View>

      {/* Leverage points */}
      {scenario.leverage_points.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Puntos de Apalancamiento</Text>
          {scenario.leverage_points.map((lp, i) => (
            <Text key={i} style={styles.chip}>▸ {trunc(lp, MAX_ITEM)}</Text>
          ))}
        </View>
      )}

      {/* Sources */}
      {scenario.sources.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fuentes y Referencias</Text>
          {scenario.sources.map((s, i) => (
            <Link key={i} src={s.url} style={styles.link}>
              [{i + 1}] {s.title}{s.date ? ` (${s.date})` : ""}
            </Link>
          ))}
        </View>
      )}
    </Page>
  )
}

/* ── Roadmap flow chart page ────────────────────────────────────────── */
function RoadmapFlowPage({ scenario }: { scenario: Scenario }) {
  const colorMap: Record<string, string> = { A: C_PRO, B: C_ACTION, C: C_LEV }
  const accent = colorMap[scenario.label] ?? C_ACTION

  return (
    <Page size="A4" style={styles.page}>
      {/* Title */}
      <View style={{ marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${accent}` }}>
        <Text style={{ fontSize: 14, fontWeight: "bold", color: accent }}>
          Escenario {scenario.label} — Mapa de Decisión
        </Text>
        <Text style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>{scenario.name}</Text>
      </View>

      {/* Roadmap flow — vertical chain */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Hoja de Ruta</Text>
        {scenario.roadmap.map((step, idx) => (
          <View key={step.step}>
            {/* Step box */}
            <View style={{
              flexDirection: "row", backgroundColor: "#F5F5F5",
              borderLeft: `4px solid ${C_ACTION}`, borderRadius: 4,
              padding: "10 12", marginBottom: 0,
            }}>
              {/* Number circle */}
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: C_ACTION, alignItems: "center",
                justifyContent: "center", marginRight: 10, marginTop: 1,
              }}>
                <Text style={{ fontSize: 11, fontWeight: "bold", color: "#fff" }}>{step.step}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: DARK }}>
                  {trunc(step.action, MAX_ITEM)}
                </Text>
                <Text style={{ fontSize: 9, color: GRAY, marginTop: 2 }}>
                  {step.timeline}  ·  {step.responsible}
                </Text>
              </View>
            </View>
            {/* Arrow connector — only between steps */}
            {idx < scenario.roadmap.length - 1 && (
              <View style={{ alignItems: "center", marginVertical: 2 }}>
                <View style={{ width: 2, height: 10, backgroundColor: C_ACTION }} />
                <Text style={{ fontSize: 10, color: C_ACTION, lineHeight: 1 }}>▼</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Three-column leaf nodes: Pros | Cons | Leverage */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {/* Pros */}
        <View style={{ flex: 1, backgroundColor: "#E8F0F8", borderRadius: 4, padding: "10 10" }}>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: C_PRO, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            ✓ Ventajas
          </Text>
          {scenario.pros.map((p, i) => (
            <Text key={i} style={{ fontSize: 9, color: C_PRO, marginBottom: 4, lineHeight: 1.4 }}>
              • {trunc(p, MAX_ITEM)}
            </Text>
          ))}
        </View>
        {/* Cons */}
        <View style={{ flex: 1, backgroundColor: "#FDE8E0", borderRadius: 4, padding: "10 10" }}>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: C_CON, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            ✗ Riesgos
          </Text>
          {scenario.cons.map((c, i) => (
            <Text key={i} style={{ fontSize: 9, color: C_CON, marginBottom: 4, lineHeight: 1.4 }}>
              • {trunc(c, MAX_ITEM)}
            </Text>
          ))}
        </View>
        {/* Leverage */}
        <View style={{ flex: 1, backgroundColor: "#E0EEF8", borderRadius: 4, padding: "10 10" }}>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: C_LEV, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            ▸ Palancas
          </Text>
          {scenario.leverage_points.map((lp, i) => (
            <Text key={i} style={{ fontSize: 9, color: C_LEV, marginBottom: 4, lineHeight: 1.4 }}>
              • {trunc(lp, MAX_ITEM)}
            </Text>
          ))}
        </View>
      </View>
    </Page>
  )
}

/* ── Comparative summary page ───────────────────────────────────────── */
function ComparativePage({ scenarios, scoring }: { scenarios: Scenario[]; scoring?: ScoringResult | null }) {
  const colColors = [C_PRO, C_ACTION, C_LEV]

  return (
    <Page size="A4" style={styles.page}>
      {/* Title */}
      <View style={{ marginBottom: 16, paddingBottom: 10, borderBottom: `2px solid ${C_ACTION}` }}>
        <Text style={{ fontSize: 16, fontWeight: "bold", color: DARK }}>Comparativa de Escenarios</Text>
        <Text style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>
          Análisis comparativo — Score · Viabilidad · Riesgo
        </Text>
      </View>

      {/* Score comparison bar chart (rect widths) */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Score vs. Viabilidad</Text>
        {scenarios.map((s, i) => (
          <View key={s.label} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colColors[i], width: 24 }}>{s.label}</Text>
              <Text style={{ fontSize: 10, color: DARK, flex: 1 }}>{s.name}</Text>
            </View>
            {/* Score bar — use nested Views with flex ratio to avoid % cast hack */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
              <Text style={{ fontSize: 8, color: GRAY, width: 60 }}>Score</Text>
              <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#F2F2F2", borderRadius: 2, height: 10 }}>
                <View style={{ flex: Math.min(100, Math.max(0, s.score_total)), backgroundColor: colColors[i], borderRadius: 2, height: 10 }} />
                <View style={{ flex: Math.max(0, 100 - s.score_total) }} />
              </View>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colColors[i], width: 36, textAlign: "right" }}>
                {s.score_total.toFixed(1)}
              </Text>
            </View>
            {/* Viability bar */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 8, color: GRAY, width: 60 }}>Viabilidad</Text>
              <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#F2F2F2", borderRadius: 2, height: 10 }}>
                <View style={{ flex: Math.min(100, Math.max(0, s.viability_score)), backgroundColor: "#6D6E71", borderRadius: 2, height: 10 }} />
                <View style={{ flex: Math.max(0, 100 - s.viability_score) }} />
              </View>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: GRAY, width: 36, textAlign: "right" }}>
                {s.viability_score.toFixed(1)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Side-by-side strategy summary */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Estrategias en Paralelo</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {scenarios.map((s, i) => (
            <View key={s.label} style={{
              flex: 1, borderTop: `3px solid ${colColors[i]}`,
              paddingTop: 8, backgroundColor: "#FAFAFA", padding: "8 8",
            }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colColors[i], marginBottom: 4 }}>
                {s.label} — {s.name}
              </Text>
              <Text style={{ fontSize: 9, color: DARK, lineHeight: 1.5 }}>
                {trunc(s.strategy, 300)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Scoring table */}
      {scoring && (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Score Determinístico Pre-LLM</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[
              { label: "Afinidad",  val: scoring.breakdown.affinity },
              { label: "Historial", val: scoring.breakdown.history },
              { label: "Intereses", val: scoring.breakdown.interests },
              { label: "Total",     val: scoring.score_total },
            ].map(({ label, val }) => (
              <View key={label} style={{ flex: 1, backgroundColor: LIGHT, padding: "8 10", borderRadius: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: DARK }}>{val.toFixed(1)}</Text>
                <Text style={{ fontSize: 8, color: GRAY }}>{label}</Text>
              </View>
            ))}
          </View>
          {scoring.litigation_penalty < 0 && (
            <Text style={{ fontSize: 9, color: RED, marginTop: 6 }}>
              Penalización CIJ/CPA: {scoring.litigation_penalty.toFixed(1)} pts
            </Text>
          )}
        </View>
      )}

      {/* Recommendation */}
      <View style={{ backgroundColor: "#F5F5F5", borderLeft: `3px solid ${C_ACTION}`, padding: "10 12", borderRadius: 4 }}>
        <Text style={{ fontSize: 10, fontWeight: "bold", color: C_ACTION, marginBottom: 4 }}>
          Recomendación del Sistema
        </Text>
        {(() => {
          const best = scenarios.reduce((a, b) =>
            (a.score_total * 0.4 + a.viability_score * 0.6) > (b.score_total * 0.4 + b.viability_score * 0.6) ? a : b
          )
          return (
            <Text style={{ fontSize: 10, color: DARK, lineHeight: 1.5 }}>
              El sistema recomienda el Escenario {best.label} — {best.name} como punto de partida,
              con índice compuesto (40% Score + 60% Viabilidad) de {(best.score_total * 0.4 + best.viability_score * 0.6).toFixed(1)}.
              Priorizar viabilidad política en el corto plazo con ruta de escalamiento hacia escenarios más ambiciosos.
            </Text>
          )
        })()}
      </View>
    </Page>
  )
}

function FullReportPDF({ scenarios, scoring, generatedAt, analysisCase }: ScenarioPDFProps) {
  return (
    <Document>
      <CoverPage scenarios={scenarios} scoring={scoring} generatedAt={generatedAt} />
      {analysisCase && <CasePage analysisCase={analysisCase} />}
      {scenarios.flatMap(s => [
        <ScenarioPage key={`detail-${s.label}`} scenario={s} />,
        <RoadmapFlowPage key={`flow-${s.label}`} scenario={s} />,
        <ChainOfThoughtPage key={`cot-${s.label}`} scenario={s} />,
      ])}
      <ComparativePage scenarios={scenarios} scoring={scoring} />
    </Document>
  )
}

interface ScenarioExportProps {
  scenarios: Scenario[]
  scoring?: ScoringResult | null
  analysisCase?: Partial<AnalysisCaseDTO>
}

export function ScenarioExport({ scenarios, scoring, analysisCase }: ScenarioExportProps) {
  const generatedAt = new Date().toLocaleDateString("es-PE", {
    year: "numeric", month: "long", day: "numeric",
  })

  return (
    <PDFDownloadLink
      document={<FullReportPDF scenarios={scenarios} scoring={scoring} generatedAt={generatedAt} analysisCase={analysisCase} />}
      fileName={`dipapp-analisis-diplomatico-${new Date().toISOString().slice(0, 10)}.pdf`}
      style={{
        display: "inline-block",
        padding: "10px 20px",
        background: BLUE,
        color: "#fff",
        textDecoration: "none",
        borderRadius: 4,
        fontFamily: "var(--font-urbanist)",
        fontSize: 14,
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {({ loading }) => loading ? "Generando PDF…" : "Exportar Informe Completo — PDF"}
    </PDFDownloadLink>
  )
}
