export async function runZayvoraQuery(query) {
  console.log("Zayvora query:", query);
  const response = await fetch("https://logichub.app/api/reason", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Zayvora error: ${response.status}`);
  return response.json();
}
