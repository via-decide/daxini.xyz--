export async function runResearch(query) {
  const res = await fetch('https://logichub.app/api/research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  return res.json();
}
