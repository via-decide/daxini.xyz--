async function runToolkit(task) {
  if (typeof window.runToolkit === 'function') {
    return window.runToolkit(task);
  }

  if (typeof window.runToolkitPlugin === 'function') {
    return window.runToolkitPlugin('default-tool', task);
  }

  return {
    text: `Local runtime executed task:
${JSON.stringify(task, null, 2)}`
  };
}

window.addEventListener('zayvora-execute', async (event) => {
  const task = event.detail;

  console.log('Executing locally:', task);

  try {
    const result = await runToolkit(task);

    window.dispatchEvent(
      new CustomEvent('zayvora-result', {
        detail: result
      })
    );
  } catch (error) {
    window.dispatchEvent(
      new CustomEvent('zayvora-result', {
        detail: {
          error: error instanceof Error ? error.message : String(error)
        }
      })
    );
  }
});
