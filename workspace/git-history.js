function parseGitHubRepo(repoUrl) {
  const match = repoUrl.trim().match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) throw new Error('Please provide a valid GitHub repository URL.');
  return { owner: match[1], repo: match[2].replace(/\.git$/i, '') };
}

function classifyChanges(files = []) {
  const names = files.map((file) => file.filename.toLowerCase());
  const text = names.join(' ');
  const additions = files.reduce((sum, file) => sum + (file.additions || 0), 0);
  const deletions = files.reduce((sum, file) => sum + (file.deletions || 0), 0);
  const patterns = [];

  if (additions + deletions > 800) patterns.push('large refactor');
  if (text.includes('security') || text.includes('auth') || text.includes('policy')) patterns.push('security layer changes');
  if (text.includes('package.json') || text.includes('requirements') || text.includes('lock')) patterns.push('dependency changes');
  if (files.some((file) => file.status === 'added')) patterns.push('new module added');

  return [...new Set(patterns)];
}

export async function loadRepoHistory(repoUrl) {
  const { owner, repo } = parseGitHubRepo(repoUrl);
  const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=25`);
  if (!commitsResponse.ok) throw new Error('Unable to load commit history for this repository.');
  const commits = await commitsResponse.json();

  const commitDetails = await Promise.all(
    commits.slice(0, 15).map(async (commit) => {
      const response = await fetch(commit.url);
      if (!response.ok) return null;
      return response.json();
    })
  );

  return {
    owner,
    repo,
    commits,
    details: commitDetails.filter(Boolean)
  };
}

export function parseCommitGraph(repoHistory) {
  const frequency = new Map();
  const timeline = repoHistory.commits.map((commit) => ({
    sha: commit.sha.slice(0, 7),
    message: commit.commit?.message?.split('\n')[0] || 'No message',
    date: commit.commit?.author?.date?.slice(0, 10) || 'unknown'
  }));

  const changeSignals = [];
  repoHistory.details.forEach((detail) => {
    (detail.files || []).forEach((file) => {
      frequency.set(file.filename, (frequency.get(file.filename) || 0) + 1);
    });
    changeSignals.push(...classifyChanges(detail.files || []));
  });

  const topFiles = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([file, count]) => ({ file, count }));

  return {
    timeline,
    topFiles,
    majorArchitectureChanges: [...new Set(changeSignals)]
  };
}

export function generateSummary(graph) {
  const highlights = graph.majorArchitectureChanges.length
    ? graph.majorArchitectureChanges.map((change) => `- ${change}`).join('\n')
    : '- No major architecture shifts detected in sampled commits.';

  return `Repository Evolution

Major changes detected:
${highlights}

Top modified files:
${graph.topFiles.map((item) => `- ${item.file} (${item.count} commits)`).join('\n') || '- No file-level detail available.'}`;
}
