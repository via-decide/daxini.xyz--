export function updateSkill(skill, value) {
  console.log("SkillHex update:", skill, value);
  const stored = JSON.parse(localStorage.getItem("skillhex_local") || "{}");
  stored[skill] = (stored[skill] || 0) + value;
  localStorage.setItem("skillhex_local", JSON.stringify(stored));
  return fetch("https://skillhex.app/api/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill, value }),
  }).catch((err) => console.warn("SkillHex remote update failed:", err));
}
