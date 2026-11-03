"use client"

import type { DiplomaticNode, GeopoliticRegion } from "@dipapp/types"
import { useState } from "react"
import { useGraphStore } from "@/lib/store/graphStore"

const ALL_REGIONS: GeopoliticRegion[] = [
  "americas",
  "europe",
  "asia_pacific",
  "africa",
  "middle_east",
  "oceania",
]

const ALL_TYPES: DiplomaticNode["type"][] = [
  "country",
  "organization",
  "embassy",
  "diplomat",
]

const REGION_LABELS: Record<GeopoliticRegion, string> = {
  americas: "Americas",
  europe: "Europe",
  asia_pacific: "Asia-Pacific",
  africa: "Africa",
  middle_east: "Middle East",
  oceania: "Oceania",
}

const TYPE_LABELS: Record<DiplomaticNode["type"], string> = {
  country: "Country",
  organization: "Organization",
  embassy: "Embassy",
  diplomat: "Diplomat",
}

const TYPE_COLORS: Record<DiplomaticNode["type"], string> = {
  country: "#FF6600",
  organization: "#003087",
  embassy: "#0078C1",
  diplomat: "#6D6E71",
}

export default function GraphFilters() {
  const { filters, setFilters, nodes, requestPath, clearPath } = useGraphStore()
  const [pathSrc, setPathSrc] = useState("")
  const [pathTgt, setPathTgt] = useState("")
  const [pathError, setPathError] = useState("")

  function handleFindPath() {
    if (!pathSrc || !pathTgt) { setPathError("Selecciona nodo origen y destino"); return }
    if (pathSrc === pathTgt) { setPathError("Origen y destino deben ser distintos"); return }
    setPathError("")
    requestPath(pathSrc, pathTgt)
  }

  const toggleRegion = (region: GeopoliticRegion) => {
    const current = filters.regions
    const next = current.includes(region)
      ? current.filter((r) => r !== region)
      : [...current, region]
    setFilters({ regions: next })
  }

  const toggleType = (type: DiplomaticNode["type"]) => {
    const current = filters.types
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    setFilters({ types: next })
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-brand-gray/30 rounded-lg shadow-sm">
      <div>
        <p className="text-xs font-semibold text-brand-gray uppercase tracking-wide mb-2">
          Regions
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_REGIONS.map((region) => {
            const active = filters.regions.includes(region)
            return (
              <button
                key={region}
                type="button"
                onClick={() => toggleRegion(region)}
                className={[
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  active
                    ? "bg-[#FF6600] text-white border-[#FF6600]"
                    : "bg-white text-brand-gray border-brand-gray/30 hover:border-[#FF6600] hover:text-[#FF6600]",
                ].join(" ")}
              >
                {REGION_LABELS[region]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-brand-gray uppercase tracking-wide mb-2">
          Min Affinity Score:{" "}
          <span className="text-black font-bold">{filters.minAffinityScore}</span>
        </p>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.minAffinityScore}
          onChange={(e) =>
            setFilters({ minAffinityScore: Number(e.target.value) })
          }
          className="w-full h-2 rounded-full accent-[#FF6600]"
          aria-label="Minimum affinity score filter"
        />
        <div className="flex justify-between text-xs text-brand-gray mt-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-brand-gray uppercase tracking-wide mb-2">
          Node Types
        </p>
        <div className="flex flex-wrap gap-3">
          {ALL_TYPES.map((type) => {
            const checked = filters.types.includes(type)
            return (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer text-sm text-brand-gray"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleType(type)}
                  className="rounded border-brand-gray/30"
                  style={{ accentColor: TYPE_COLORS[type] }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: TYPE_COLORS[type] }}
                />
                {TYPE_LABELS[type]}
              </label>
            )
          })}
        </div>
      </div>

      {/* Dijkstra shortest path */}
      <div>
        <p className="text-xs font-semibold text-brand-gray uppercase tracking-wide mb-2">
          Camino más corto (Dijkstra)
        </p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-brand-gray">Origen</label>
            <select
              value={pathSrc}
              onChange={(e) => setPathSrc(e.target.value)}
              className="border border-brand-gray/30 rounded px-2 py-1 text-xs text-brand-gray bg-white"
              style={{ minWidth: 140 }}
            >
              <option value="">— seleccionar —</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>{n.label} ({n.id})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-brand-gray">Destino</label>
            <select
              value={pathTgt}
              onChange={(e) => setPathTgt(e.target.value)}
              className="border border-brand-gray/30 rounded px-2 py-1 text-xs text-brand-gray bg-white"
              style={{ minWidth: 140 }}
            >
              <option value="">— seleccionar —</option>
              {nodes.filter((n) => n.id !== pathSrc).map((n) => (
                <option key={n.id} value={n.id}>{n.label} ({n.id})</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleFindPath}
            disabled={!pathSrc || !pathTgt}
            className="px-3 py-1 rounded text-xs font-semibold text-white"
            style={{ background: pathSrc && pathTgt ? "#FF6600" : "#555555", cursor: pathSrc && pathTgt ? "pointer" : "default" }}
          >
            Trazar ruta
          </button>
          <button
            type="button"
            onClick={() => { clearPath(); setPathSrc(""); setPathTgt(""); setPathError("") }}
            className="px-3 py-1 rounded text-xs font-semibold text-brand-gray border border-brand-gray/30"
          >
            Limpiar
          </button>
        </div>
        {pathError && <p className="text-xs text-[#E85500] mt-1">{pathError}</p>}
        <p className="text-xs text-brand-gray mt-1">
          El camino resaltado en rojo es la ruta de menor costo entre los nodos seleccionados.
        </p>
      </div>
    </div>
  )
}
