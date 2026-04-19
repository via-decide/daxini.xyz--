export async function runResearch(query) {
  console.log("NEX research:", query);
  const res = await fetch("https://logichub.app/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`NEX error: ${res.status}`);
  return res.json();
}
