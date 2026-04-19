export async function executeAction(task) {
  const res = await fetch('https://logichub.app/api/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(task)
  });

  return res.json();
}
