/**
 * ui/preview/preview-router.js
 * 
 * Zayvora Preview Routing Engine (Step 12)
 * 
 * Routes different output types to the corresponding rendering components:
 * html → browser preview
 * image → canvas preview
 * code → code viewer
 */

import { ZayvoraState } from '../state/zayvora-state.js';

export class PreviewRouter {
  static route(output) {
    if (output.type === 'html') {
      ZayvoraState.setPreview({ type: 'html', content: output.content, urlPath: output.url });
    } else if (output.type === 'image') {
      ZayvoraState.setPreview({ type: 'image', content: output.content });
    } else if (output.type === 'code') {
      ZayvoraState.setPreview({ type: 'code', content: output.content });
    }
  }
}
