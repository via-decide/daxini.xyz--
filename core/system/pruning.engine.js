export function evaluateNode(node) {
  if (node.critical && node.userFacing) return "EXECUTE"
  if (node.userFacing && node.cost < 0.4) return "EXECUTE"
  if (node.userFacing && node.cost >= 0.4) return "DEFER"
  if (!node.userFacing && node.cost >= 0.3) return "REMOVE"
  return "HIDE"
}
