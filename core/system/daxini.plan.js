export const daxiniPlan = [
  { name: "edge-routing", critical: true, userFacing: false, cost: 0.1 },
  { name: "deployment", critical: true, userFacing: true, cost: 0.2 },
  { name: "domain-mapping", critical: true, userFacing: true, cost: 0.2 },
  { name: "runtime-isolation", critical: true, userFacing: false, cost: 0.3 },

  { name: "analytics-dashboard", critical: false, userFacing: true, cost: 0.7 },
  { name: "graphql-analytics", critical: false, userFacing: false, cost: 0.8 },
  { name: "advanced-ci", critical: false, userFacing: false, cost: 0.6 },

  { name: "elk-stack", critical: false, userFacing: false, cost: 0.9 },
  { name: "zero-trust-full", critical: false, userFacing: false, cost: 0.9 },
]
