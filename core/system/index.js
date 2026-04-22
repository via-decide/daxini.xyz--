import { generateSystemReport } from "./pruning.report.js"

export function runSystemPruning() {
  const report = generateSystemReport()
  console.log("[SYSTEM PRUNING] Output:", report)
  return report
}
