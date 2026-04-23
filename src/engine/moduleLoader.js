export function openModule(moduleName) {
  console.log('Launching module:', moduleName);

  const workspace = document.getElementById('panel-center');
  if (!workspace) {return;}

  workspace.innerHTML = `<iframe src="/modules/${moduleName}/index.html" style="width:100%;height:100%;border:none;"></iframe>`;
}
