import { loadUpdates } from './updates.js';

function getLastVisit() {
  const lastVisit = Number(localStorage.getItem('lastVisit'));
  return Number.isFinite(lastVisit) ? lastVisit : 0;
}

function hasNewUpdates(updates, lastVisit) {
  return updates.some((update) => {
    const updateTime = Date.parse(update.date);
    return Number.isFinite(updateTime) && updateTime > lastVisit;
  });
}

function renderBadge(show) {
  const badge = document.getElementById('updates-badge');
  if (!badge) {return;}
  badge.hidden = !show;
}

export async function renderUpdates() {
  const panel = document.getElementById('whats-new');
  if (!panel) {return;}

  panel.innerHTML = '';

  try {
    const updates = await loadUpdates();
    const lastVisit = getLastVisit();

    updates.forEach((update) => {
      const card = document.createElement('div');
      card.className = 'update-card';
      card.innerHTML = `
        <h3>${update.title}</h3>
        <p>${update.description}</p>
        <span class="update-date">${update.date}</span>
      `;
      panel.appendChild(card);
    });

    renderBadge(hasNewUpdates(updates, lastVisit));
  } catch (_error) {
    const fallback = document.createElement('div');
    fallback.className = 'update-card';
    fallback.textContent = 'Unable to load updates right now.';
    panel.appendChild(fallback);
    renderBadge(false);
  } finally {
    localStorage.setItem('lastVisit', String(Date.now()));
  }
}
