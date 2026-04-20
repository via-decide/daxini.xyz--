const VIA_TEMPLATE_SOURCES = [
  'https://raw.githubusercontent.com/via-decide/VIA/main/templates/workspace-templates.json',
  'https://raw.githubusercontent.com/via-decide/VIA/main/templates/index.json'
];

const TEMPLATE_FALLBACK = {
  research: {
    label: 'Research',
    examples: ['Investigate a technical topic', 'Compare technologies', 'Explore a research paper']
  },
  creative: {
    label: 'Create',
    examples: ['Generate story outline', 'Create video script', 'Design creative concept']
  },
  game: {
    label: 'Game Dev',
    examples: ['Generate game mechanic', 'Balance gameplay system', 'Create worldbuilding lore']
  },
  analysis: {
    label: 'Analyze',
    examples: ['Analyze performance regressions', 'Review telemetry trends', 'Compare product metrics']
  },
  problem: {
    label: 'Solve',
    examples: ['Debug integration errors', 'Propose architecture fixes', 'Design mitigation plans']
  },
  docs: {
    label: 'Documents',
    examples: ['Draft technical spec', 'Summarize release notes', 'Create onboarding guide']
  },
  research_deep: {
    label: 'Research (NEX)',
    examples: ['Analyze WebGPU adoption in game engines', 'Build deep literature map', 'Run long horizon synthesis']
  }
};

let templateCache = null;

function normalizeTemplateShape(payload) {
  if (!payload || typeof payload !== 'object') return TEMPLATE_FALLBACK;
  if (payload.templates && typeof payload.templates === 'object') return payload.templates;
  return payload;
}

export async function loadTemplates() {
  if (templateCache) return templateCache;

  for (const source of VIA_TEMPLATE_SOURCES) {
    try {
      const response = await fetch(source, { headers: { Accept: 'application/json' } });
      if (!response.ok) continue;
      const json = await response.json();
      templateCache = normalizeTemplateShape(json);
      return templateCache;
    } catch (error) {
      console.warn('VIA template source unavailable:', source, error.message);
    }
  }

  templateCache = TEMPLATE_FALLBACK;
  return templateCache;
}

export async function getTemplateByCategory(category) {
  const templates = await loadTemplates();
  return templates[category] || null;
}

export async function executeTemplate({ category, query, metadata = {} }) {
  const template = await getTemplateByCategory(category);

  return {
    category,
    template,
    query,
    metadata,
    source: templateCache === TEMPLATE_FALLBACK ? 'fallback' : 'via'
  };
}
