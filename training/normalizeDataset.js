/*
  training/normalizeDataset.js
  Converts extracted reasoning traces into JSONL format for LoRA training.
  Also updates the Nex knowledge index.
*/

import fs from 'fs';
import path from 'path';

const TRACES_PATH = path.join(process.cwd(), 'training/data/zayvora_reasoning_traces.json');
const JSONL_PATH = path.join(process.cwd(), 'training/data/zayvora_update_dataset.jsonl');
const NEX_PATH = '/Users/dharamdaxini/Downloads/via/nex/knowledge/pr_logs';

async function run() {
    if (!fs.existsSync(TRACES_PATH)) {
        console.error(`[ERROR] Reasoning traces not found at ${TRACES_PATH}`);
        return;
    }

    const traces = JSON.parse(fs.readFileSync(TRACES_PATH, 'utf8'));
    console.log(`[NORMALIZER] Normalizing ${traces.length} traces...`);

    // 1. Generate JSONL for Training
    const jsonlContent = traces.map(t => JSON.stringify({
        instruction: t.instruction,
        reasoning_trace: t.reasoning_trace,
        answer: t.answer
    })).join('\n');

    fs.writeFileSync(JSONL_PATH, jsonlContent);
    console.log(`[NORMALIZER] Saved JSONL to ${JSONL_PATH}`);

    // 2. Update Nex Knowledge Index
    console.log(`[NORMALIZER] Syncing to Nex knowledge index...`);
    for (const t of traces) {
        const fileName = `PR_${t.metadata.repo}_${t.metadata.pr_number}.md`;
        const filePath = path.join(NEX_PATH, fileName);
        
        const content = `
# Engineering Log: ${t.metadata.repo} PR #${t.metadata.pr_number}
**Problem**: ${t.metadata.orig_problem}
**Reasoning**: ${t.reasoning_trace}
**Solution**: ${t.answer}
---
*Automated Log Entry - Zayvora Continuous Learning*
`;
        fs.writeFileSync(filePath, content);
    }
    console.log(`[NORMALIZER] Knowledge sync complete.`);
}

run();
