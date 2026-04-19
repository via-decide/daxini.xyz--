export async function runToolkitPlugin(name, input) {
  const module = await import(`/plugins/${name}.js`);
  return module.run(input);
}
