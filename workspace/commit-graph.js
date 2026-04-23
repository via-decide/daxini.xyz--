function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderCommitGraph(targetId, graph) {
  const target = document.getElementById(targetId);
  if (!target) {return;}

  const timelineRows = graph.timeline
    .slice(0, 10)
    .map((item) => `<li><strong>${escapeHtml(item.date)}</strong> — ${escapeHtml(item.sha)} — ${escapeHtml(item.message)}</li>`)
    .join('');

  const maxCount = Math.max(...graph.topFiles.map((item) => item.count), 1);
  const freqRows = graph.topFiles
    .map((item) => {
      const width = Math.max(8, Math.round((item.count / maxCount) * 100));
      return `<div class="commit-row"><span>${escapeHtml(item.count.toString())}x</span><span>${escapeHtml(item.file)}</span><div class="freq-bar" style="width:${width}%"></div></div>`;
    })
    .join('');

  target.innerHTML = `
    <h4>Commit timeline</h4>
    <ol class="commit-list">${timelineRows || '<li>No commits loaded.</li>'}</ol>
    <h4>File change frequency</h4>
    <div>${freqRows || '<p>No file modification frequency available.</p>'}</div>
    <h4>Architecture changes</h4>
    <ul class="commit-list">${graph.majorArchitectureChanges.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No major architecture changes detected.</li>'}</ul>
  `;
}
