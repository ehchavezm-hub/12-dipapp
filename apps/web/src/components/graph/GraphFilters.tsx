"use client"

import type { DiplomaticNode, GeopoliticRegion } from "@dipapp/types"
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
  country: "#4285F4",
  organization: "#34A853",
  embassy: "#FBBC05",
  diplomat: "#5F6368",
}

export default function GraphFilters() {
  const { filters, setFilters } = useGraphStore()

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
    <div className="flex flex-col gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
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
                    ? "bg-[#4285F4] text-white border-[#4285F4]"
                    : "bg-white text-gray-700 border-gray-300 hover:border-[#4285F4] hover:text-[#4285F4]",
                ].join(" ")}
              >
                {REGION_LABELS[region]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Min Affinity Score:{" "}
          <span className="text-gray-900 font-bold">{filters.minAffinityScore}</span>
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
          className="w-full h-2 rounded-full accent-[#4285F4]"
          aria-label="Minimum affinity score filter"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Node Types
        </p>
        <div className="flex flex-wrap gap-3">
          {ALL_TYPES.map((type) => {
            const checked = filters.types.includes(type)
            return (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleType(type)}
                  className="rounded border-gray-300"
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
    </div>
  )
}
