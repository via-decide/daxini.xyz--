'use strict';

/**
 * honeypotMutator.js — v3 Structural Response Deception (ESM).
 */

export function mutateHoneypotResponse(originalData, seed = Date.now()) {
    // Determine mutation cycle (changes every 6 hours)
    const cycle = Math.floor(seed / (6 * 60 * 60 * 1000));
    const mutationType = cycle % 3;

    let mutated = { ...originalData };

    switch (mutationType) {
        case 0: // Key Rotation
            if (mutated.id) {
                mutated.target_uid = mutated.id;
                delete mutated.id;
            }
            break;
        case 1: // Value obfuscation
            if (mutated.status) {mutated.status = "active_mirror_sync";}
            break;
        case 2: // Structure wrap
            mutated = { data: mutated, metadata: { sync_cycle: cycle } };
            break;
    }

    return mutated;
}

export function getDecoyEndpoint(originalPath, seed = Date.now()) {
    const cycle = Math.floor(seed / (6 * 60 * 60 * 1000));
    const suffixes = ['_v3', '_legacy', '_sync', '_internal'];
    const suffix = suffixes[cycle % suffixes.length];
    
    if (originalPath === '/api/models' || originalPath === '/models') {
        return `/mirror/models${suffix}`;
    }
    return originalPath;
}
