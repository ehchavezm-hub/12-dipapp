"use client"
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Link } from "@react-pdf/renderer"
import type { Scenario } from "@/lib/types/results"

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  label: { fontSize: 24, fontWeight: "bold", color: "#4285F4" },
  score: { fontSize: 14, color: "#5F6368", marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#5F6368", marginBottom: 8, borderBottom: "1px solid #5F6368", paddingBottom: 4 },
  body: { fontSize: 11, color: "#5F6368", lineHeight: 1.5 },
  row: { flexDirection: "row", gap: 8 },
  col: { flex: 1 },
  bullet: { fontSize: 10, marginBottom: 3 },
  chip: { fontSize: 10, color: "#FBBC05", marginBottom: 2 },
  link: { fontSize: 10, color: "#4285F4", textDecoration: "underline", marginBottom: 3 },
})

function ScenarioPDF({ scenario }: { scenario: Scenario }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.label}>Escenario {scenario.label} — {scenario.name}</Text>
          <Text style={styles.score}>Puntuación: {scenario.score_total.toFixed(1)} | Viabilidad: {scenario.viability_score.toFixed(1)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estrategia</Text>
          <Text style={styles.body}>{scenario.strategy}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hoja de Ruta</Text>
          {scenario.roadmap.map(step => (
            <Text key={step.step} style={styles.bullet}>
              {step.step}. {step.action} — {step.timeline} ({step.responsible})
            </Text>
          ))}
        </View>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Ventajas</Text>
              {scenario.pros.map((p, i) => <Text key={i} style={styles.bullet}>✓ {p}</Text>)}
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Desventajas</Text>
              {scenario.cons.map((c, i) => <Text key={i} style={styles.bullet}>✗ {c}</Text>)}
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Puntos de Apalancamiento</Text>
          {scenario.leverage_points.map((lp, i) => <Text key={i} style={styles.chip}>▸ {lp}</Text>)}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fuentes</Text>
          {scenario.sources.map((s, i) => (
            <Link key={i} src={s.url} style={styles.link}>{s.title}{s.date ? ` (${s.date})` : ""}</Link>
          ))}
        </View>
      </Page>
    </Document>
  )
}

export function ScenarioExport({ scenario }: { scenario: Scenario }) {
  return (
    <PDFDownloadLink
      document={<ScenarioPDF scenario={scenario} />}
      fileName={`escenario-${scenario.label.toLowerCase()}.pdf`}
      style={{
        display: "inline-block",
        padding: "8px 16px",
        background: "#4285F4",
        color: "#fff",
        textDecoration: "none",
        borderRadius: 4,
        fontFamily: "var(--font-urbanist)",
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {({ loading }) => loading ? "Generando PDF…" : `Exportar Escenario ${scenario.label} — PDF`}
    </PDFDownloadLink>
  )
}
