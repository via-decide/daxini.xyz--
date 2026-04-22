// Workspace generated artifact example
export function createVoxelTerrain({ width = 32, height = 32, seed = 1 } = {}) {
  const map = [];
  for (let x = 0; x < width; x += 1) {
    const row = [];
    for (let y = 0; y < height; y += 1) {
      const noise = Math.sin((x + seed) * 0.19) + Math.cos((y + seed) * 0.23);
      row.push(Math.round((noise + 2) * 8));
    }
    map.push(row);
  }
  return map;
}
