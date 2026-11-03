"use client"
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink, Link,
} from "@react-pdf/renderer"
import type { Scenario, ScoringResult } from "@/lib/types/results"

const BLUE = "#FF6600"
const GREEN = "#003087"
const YELLOW = "#0078C1"
const RED = "#E85500"
const GRAY = "#6D6E71"
const LIGHT = "#F2F2F2"
const DARK = "#1A1A1A"

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
    backgroundColor: "#FFF3E0", borderLeft: `3px solid ${YELLOW}`,
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

/* ── Size limits (keeps PDF ≤ 500 KB) ──────────────────────────────── */
const MAX_STRATEGY   = 400
const MAX_COT        = 700
const MAX_ITEM       = 120

function trunc(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "…" : text
}

interface ScenarioPDFProps {
  scenarios: Scenario[]
  scoring?: ScoringResult | null
  generatedAt?: string
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
          {scoring.litigation_penalty > 0 && (
            <Text style={{ fontSize: 9, color: RED, marginTop: 6 }}>
              Penalización por litigios CIJ/CPA/CIADI: −{scoring.litigation_penalty.toFixed(1)} pts
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

      {/* Chain of Thought — truncated to control PDF size */}
      {scenario.chain_of_thought && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cadena de Razonamiento (resumen)</Text>
          <View style={styles.cotBox}>
            <Text style={styles.cotText}>{trunc(scenario.chain_of_thought, MAX_COT)}</Text>
          </View>
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

function FullReportPDF({ scenarios, scoring, generatedAt }: ScenarioPDFProps) {
  return (
    <Document>
      <CoverPage scenarios={scenarios} scoring={scoring} generatedAt={generatedAt} />
      {scenarios.map(s => <ScenarioPage key={s.label} scenario={s} />)}
    </Document>
  )
}

interface ScenarioExportProps {
  scenarios: Scenario[]
  scoring?: ScoringResult | null
}

export function ScenarioExport({ scenarios, scoring }: ScenarioExportProps) {
  const generatedAt = new Date().toLocaleDateString("es-PE", {
    year: "numeric", month: "long", day: "numeric",
  })

  return (
    <PDFDownloadLink
      document={<FullReportPDF scenarios={scenarios} scoring={scoring} generatedAt={generatedAt} />}
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
