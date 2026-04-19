export function updateSkill(skill, value) {
  fetch('https://skillhex.app/api/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ skill, value })
  });
}
