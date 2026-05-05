# UI/UX Reasoning Dataset (Gold Standard)

This directory contains the training data for the **Zayvora OS UI/UX Evolution**.

## Purpose
To train Zayvora to understand the **logic and physics** behind the Daxini/Kinetic UI system, rather than just copying styles.

## Dataset Structure (`os-ui-reasoning.jsonl`)
Each entry includes:
1. **Instruction**: The UI task.
2. **Reasoning Trace**: The "why" — physics, spatial continuity, and SOP compliance.
3. **Output Code**: The high-precision implementation.

## Instructions for Claude
- Use the existing 5 "Gold Standard" entries as a baseline for tone and precision.
- Audit the `/workspace/via/alchemist_app/` and `/workspace/via/zayvora-kernel/` directories to extract real logic.
- Ensure every reasoning trace mentions **Alchemist Physics** or **Sovereign Aesthetics**.
- Generate 245 more entries to reach the target of 250.
