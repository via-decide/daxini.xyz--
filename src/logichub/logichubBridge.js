export async function executeAction(task) {
  console.log("Logichub execute:", task);
  const res = await fetch("https://logichub.app/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error(`Logichub error: ${res.status}`);
  return res.json();
}
