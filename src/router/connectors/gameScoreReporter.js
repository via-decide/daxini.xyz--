import { emit } from '../events/eventBus.js';

export function reportGameScore(game, score) {
  emit('game-score', { game, score });
}
