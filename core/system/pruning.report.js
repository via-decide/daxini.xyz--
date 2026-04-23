import { daxiniPlan } from "./daxini.plan.js"
import { evaluateNode } from "./pruning.engine.js"

export function generateSystemReport() {
  const result = {
    execute: [],
    defer: [],
    hide: [],
    remove: [],
  }

  daxiniPlan.forEach((node) => {
    const decision = evaluateNode(node)

    if (decision === "EXECUTE") {result.execute.push(node.name)}
    if (decision === "DEFER") {result.defer.push(node.name)}
    if (decision === "HIDE") {result.hide.push(node.name)}
    if (decision === "REMOVE") {result.remove.push(node.name)}
  })

  return result
}
