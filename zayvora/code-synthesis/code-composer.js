import { extractPatterns } from '../code-patterns/pattern-extractor.js';
import { buildModuleArtifact } from './module-builder.js';

export function generateCodeFromPrompt(prompt) {
  const patterns = extractPatterns(prompt).map((entry) => entry.name);
  return buildModuleArtifact(prompt, { patterns });
}
