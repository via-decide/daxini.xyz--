export async function runZayvoraQuery(query) {
  console.log('Zayvora query:', query);

  const response = await fetch('https://logichub.app/api/reason', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  return response.json();
}
