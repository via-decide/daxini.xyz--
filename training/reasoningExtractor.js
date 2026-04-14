/*
  training/reasoningExtractor.js
  Converts PR diffs into architectural reasoning traces using zayvora:axiom.
*/

import fs from 'fs';
import path from 'path';

const TEACHER_MODEL = 'zayvora:axiom';
const OLLAMA_API = 'http://localhost:11434/api/generate';

const INPUT_PATH = path.join(process.cwd(), 'training/data/pr_dataset.json');
const OUTPUT_PATH = path.join(process.cwd(), 'training/data/zayvora_reasoning_traces.json');

async function generateReasoning(pr) {
    const prompt = `
You are Zayvora-Axiom, a senior AI systems engineer.
Analyze the following Pull Request (PR) from repo ${pr.repo} and its associated code changes (diff).

PR Title: ${pr.title}
PR Description: ${pr.body || 'No description provided.'}

DIFF:
${pr.diff.substring(0, 3000)} ... [diff truncated for length]

### TASK
Convert this engineering change into a high-fidelity reasoning trace for model training.
Focus on:
1. The core architectural problem addressed.
2. The logic used to decide on this specific solution.
3. The verification steps taken or required.

### OUTPUT FORMAT (JSON ONLY)
{
  "problem": "Briefly state the engineering or architectural issue.",
  "reasoning_steps": "A chronological trace of the logic (Decompose -> Reflect -> Synthesize).",
  "solution": "The technical implementation detail and its impact."
}
`;

    try {
        const response = await fetch(OLLAMA_API, {
            method: 'POST',
            body: JSON.stringify({
                model: TEACHER_MODEL,
                prompt: prompt,
                stream: false,
                format: 'json'
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const reasoning = JSON.parse(data.response);
        
        return {
            instruction: `How would you approach the following task in the ${pr.repo} repository: ${pr.title}?`,
            reasoning_trace: reasoning.reasoning_steps,
            answer: reasoning.solution,
            metadata: {
                repo: pr.repo,
                pr_number: pr.number,
                orig_problem: reasoning.problem
            }
        };
    } catch (err) {
        console.error(`[EXTRACTOR] Error processing PR ${pr.number}:`, err.message);
        return null;
    }
}

async function run() {
    if (!fs.existsSync(INPUT_PATH)) {
        console.error(`[ERROR] Dataset not found at ${INPUT_PATH}`);
        return;
    }

    const prs = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    console.log(`[EXTRACTOR] Processing ${prs.length} PRs...`);

    const traces = [];
    for (const pr of prs) {
        process.stdout.write(`[EXTRACTOR] Analyzing PR #${pr.number} in ${pr.repo}... `);
        const trace = await generateReasoning(pr);
        if (trace) {
            traces.push(trace);
            console.log('DONE');
        } else {
            console.log('FAILED');
        }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(traces, null, 2));
    console.log(`[EXTRACTOR] Extracted ${traces.length} reasoning traces to ${OUTPUT_PATH}`);
}

run();
