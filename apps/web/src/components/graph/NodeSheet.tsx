"use client"

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useGraphStore } from "@/lib/store/graphStore"

const TYPE_LABELS: Record<string, string> = {
  country: "Country",
  organization: "Organization",
  embassy: "Embassy",
  diplomat: "Diplomat",
}

const REGION_LABELS: Record<string, string> = {
  americas: "Americas",
  europe: "Europe",
  asia_pacific: "Asia-Pacific",
  africa: "Africa",
  middle_east: "Middle East",
  oceania: "Oceania",
}

const TYPE_COLORS: Record<string, string> = {
  country: "#4285F4",
  organization: "#34A853",
  embassy: "#FBBC05",
  diplomat: "#5F6368",
}

export default function NodeSheet() {
  const { selectedNode, clearSelection } = useGraphStore()

  return (
    <Sheet open={selectedNode !== null} onOpenChange={(open) => !open && clearSelection()}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{selectedNode?.label ?? ""}</SheetTitle>
            <SheetClose asChild>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full p-1.5 hover:bg-brand-gray/10 text-brand-gray hover:text-black transition-colors"
                aria-label="Close panel"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </SheetClose>
          </div>
        </SheetHeader>

        {selectedNode && (
          <div className="p-4 flex flex-col gap-4">
            {/* Type badge */}
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[selectedNode.type] ?? "#5F6368" }}
              />
              <span className="text-sm font-medium text-brand-gray">
                {TYPE_LABELS[selectedNode.type] ?? selectedNode.type}
              </span>
            </div>

            {/* Region */}
            <div>
              <p className="text-xs text-brand-gray uppercase tracking-wide mb-1">Region</p>
              <p className="text-sm text-black">
                {REGION_LABELS[selectedNode.region] ?? selectedNode.region}
              </p>
            </div>

            {/* Affinity score */}
            <div>
              <p className="text-xs text-brand-gray uppercase tracking-wide mb-1">
                Affinity Score
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-brand-gray/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedNode.affinityScore}%`,
                      backgroundColor:
                        selectedNode.affinityScore >= 70
                          ? "#34A853"
                          : selectedNode.affinityScore >= 45
                          ? "#FBBC05"
                          : "#EA4335",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-black tabular-nums w-10 text-right">
                  {selectedNode.affinityScore.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Cluster ID */}
            <div>
              <p className="text-xs text-brand-gray uppercase tracking-wide mb-1">
                Cluster
              </p>
              <p className="text-sm text-black font-mono">{selectedNode.clusterId}</p>
            </div>

            {/* Node ID */}
            <div>
              <p className="text-xs text-brand-gray uppercase tracking-wide mb-1">ID</p>
              <p className="text-xs text-brand-gray font-mono break-all">{selectedNode.id}</p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
