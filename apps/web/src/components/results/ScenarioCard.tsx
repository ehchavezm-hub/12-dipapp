"use client"

import dynamic from "next/dynamic"
import type { Scenario } from "@/lib/types/results"


interface ScenarioCardProps {
  scenario: Scenario
}

function CircularGauge({ value }: { value: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle
          cx={44}
          cy={44}
          r={radius}
          fill="none"
          stroke="#5F6368"
          strokeWidth={8}
        />
        <circle
          cx={44}
          cy={44}
          r={radius}
          fill="none"
          stroke="#4285F4"
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <text
          x={44}
          y={44}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontSize: 16, fontWeight: 700, fill: "#4285F4" }}
        >
          {clamped.toFixed(1)}
        </text>
      </svg>
      <div style={{ fontSize: 11, color: "#5F6368" }}>Puntuación total</div>
    </div>
  )
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "#5F6368",
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: "#34A853" }}>
          {clamped.toFixed(1)}%
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: "#5F6368",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${clamped}%`,
            background: "#34A853",
            borderRadius: 4,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  )
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #5F6368",
        borderRadius: 12,
        padding: 24,
        fontFamily: "var(--font-urbanist)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 24,
          marginBottom: 20,
        }}
      >
        <CircularGauge value={scenario.score_total} />
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: 20,
              fontWeight: 700,
              color: "#5F6368",
            }}
          >
            {scenario.name}
          </h3>
          <ProgressBar value={scenario.viability_score} label="Viabilidad" />
        </div>
      </div>

      {/* Strategy */}
      <p
        style={{
          fontSize: 14,
          color: "#5F6368",
          lineHeight: 1.6,
          marginBottom: 20,
        }}
      >
        {scenario.strategy}
      </p>

      {/* Pros / Cons */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#34A853",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Pros
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {scenario.pros.map((pro, i) => (
              <li
                key={i}
                style={{
                  fontSize: 13,
                  color: "#5F6368",
                  marginBottom: 6,
                  paddingLeft: 16,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    color: "#34A853",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
                {pro}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#EA4335",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Contras
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {scenario.cons.map((con, i) => (
              <li
                key={i}
                style={{
                  fontSize: 13,
                  color: "#5F6368",
                  marginBottom: 6,
                  paddingLeft: 16,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    color: "#EA4335",
                    fontWeight: 700,
                  }}
                >
                  ✗
                </span>
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Leverage Points */}
      {scenario.leverage_points.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#5F6368",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Puntos de apalancamiento
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {scenario.leverage_points.map((point, i) => (
              <span
                key={i}
                style={{
                  background: "#FBBC05",
                  color: "#5F6368",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 20,
                }}
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chain of Thought */}
      {scenario.chain_of_thought && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#5F6368",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Cadena de Razonamiento
          </div>
          <div
            style={{
              background: "#FFF8E1",
              borderLeft: "3px solid #FBBC05",
              padding: "12px 16px",
              borderRadius: 2,
              fontSize: 13,
              color: "#3C4043",
              lineHeight: 1.7,
              fontStyle: "italic",
            }}
          >
            {scenario.chain_of_thought}
          </div>
        </div>
      )}

      {/* Sources */}
      {scenario.sources.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#5F6368",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Fuentes
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {scenario.sources.map((source, i) => (
              <li key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#4285F4", textDecoration: "none" }}
                >
                  [{i + 1}] {source.title}
                </a>
                {source.date && (
                  <span style={{ color: "#5F6368", marginLeft: 8 }}>
                    ({source.date})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
