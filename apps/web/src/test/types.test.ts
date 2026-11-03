import { describe, it, expect } from "vitest"
import type {
  DiplomaticNode,
  DiplomaticEdge,
  Role,
  GeopoliticRegion,
  TreatyLevel,
} from "@dipapp/types"

describe("DiplomaticNode type", () => {
  it("accepts a valid node", () => {
    const node: DiplomaticNode = {
      id: "node-1",
      type: "country",
      label: "United States",
      region: "americas",
      affinityScore: 0.75,
      clusterId: "cluster-1",
    }
    expect(node.id).toBe("node-1")
    expect(node.type).toBe("country")
    expect(node.region).toBe("americas")
  })
})

describe("DiplomaticEdge type", () => {
  it("accepts a valid edge", () => {
    const edge: DiplomaticEdge = {
      source: "node-1",
      target: "node-2",
      type: "bilateral_treaty",
      weight: 0.8,
      treatyLevel: 1,
    }
    expect(edge.source).toBe("node-1")
    expect(edge.type).toBe("bilateral_treaty")
    expect(edge.treatyLevel).toBe(1)
  })
})

describe("Role type", () => {
  it("accepts valid roles", () => {
    const roles: Role[] = ["superadmin", "editor", "viewer"]
    expect(roles).toHaveLength(3)
  })
})

describe("GeopoliticRegion type", () => {
  it("accepts valid regions", () => {
    const regions: GeopoliticRegion[] = [
      "americas",
      "europe",
      "asia_pacific",
      "africa",
      "middle_east",
      "oceania",
    ]
    expect(regions).toHaveLength(6)
  })
})

describe("TreatyLevel type", () => {
  it("accepts valid treaty levels", () => {
    const levels: TreatyLevel[] = [1, 2, 3]
    expect(levels).toHaveLength(3)
  })
})
