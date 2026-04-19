export async function runToolkitPlugin(name, input) {
  console.log("Toolkit plugin:", name, input);
  const module = await import(`/plugins/${name}.js`);
  return module.run(input);
}
