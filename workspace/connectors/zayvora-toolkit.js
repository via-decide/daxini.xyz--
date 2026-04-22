import {
  toolkitPlan,
  toolkitSearch,
  toolkitReason,
  toolkitVerify,
  toolkitNexResearch
} from './toolkit-api.js';
import { runCodeSearch } from '../../zayvora/code-search/search-query.js';
import { extractPatterns } from '../../zayvora/code-patterns/pattern-extractor.js';

function emit(handlers, type, payload) {
  const handler = handlers?.[type];
  if (typeof handler === 'function') {
    handler(payload);
  }
}

export async function runToolkitTask(query, options = {}) {
  const mode = options.mode === 'research' ? 'research' : 'standard';

  emit(options, 'onLog', '[TOOLKIT] planning task');
  emit(options, 'onStep', 'planning');

  const plan = await toolkitPlan(query);

  if (mode === 'research') {
    emit(options, 'onLog', '[TOOLKIT] NEX research execution');
    emit(options, 'onStep', 'search');
    const researchResult = await toolkitNexResearch(query);
    emit(options, 'onStep', 'output');
    return {
      mode,
      plan,
      research: researchResult,
      result: researchResult.result ?? researchResult
    };
  }

  emit(options, 'onLog', '[TOOLKIT] searching corpus + codebase');
  emit(options, 'onStep', 'search');
  const codeMatches = runCodeSearch(query);
  const codePatterns = extractPatterns(query);
  const toolkitKnowledge = await toolkitSearch(query);
  const knowledge = {
    ...toolkitKnowledge,
    codebase: {
      matches: codeMatches,
      patterns: codePatterns
    }
  };

  emit(options, 'onLog', '[TOOLKIT] reasoning');
  emit(options, 'onStep', 'reason');
  const reasoning = await toolkitReason(query, knowledge);

  emit(options, 'onLog', '[TOOLKIT] verify');
  emit(options, 'onStep', 'verify');
  const verification = await toolkitVerify(query, reasoning);

  emit(options, 'onStep', 'output');

  return {
    mode,
    plan,
    knowledge,
    reasoning,
    verification,
    result: reasoning.result ?? reasoning
  };
}
