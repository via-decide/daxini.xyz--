# Zayvora Engine Integration with Ollama UI

## Overview

This guide explains how to integrate Zayvora Engine as a first-class AI runtime option in the Ollama Web UI. Zayvora becomes a selectable model alongside Ollama's local models, with credit-based usage, GitHub repo import, and streaming responses.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Ollama Web UI (Modified)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Model Selector          Chat Handler      UI Components │
│  ┌──────────────┐       ┌──────────────┐  ┌────────────┐ │
│  │ + Zayvora    │────→  │ Route to:    │  │ Branding   │ │
│  │ + Ollama     │   ├→  │ - Zayvora    │  │ - Header   │ │
│  │   models     │   └→  │ - Ollama     │  │ - Credits  │ │
│  └──────────────┘       └──────────────┘  │ - Repo BTN │ │
│                                            └────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌────────────────────────────────────┐
        │   Zayvora Runtime Engine           │
        │ /runtime/zayvora-engine.js         │
        └────────────────────────────────────┘
                          ↓
        ┌────────────────────────────────────┐
        │   Zayvora Backend (localhost:3001) │
        │ - /api/zayvora-chat                │
        │ - /api/user-wallet                 │
        │ - /api/repo-analyze                │
        └────────────────────────────────────┘
```

---

## Files

### Runtime Modules (in `/runtime/`)

#### 1. `zayvora-engine.js`
Main inference engine that:
- Routes prompts to Zayvora backend
- Handles streaming responses
- Manages credit deduction
- Analyzes GitHub repositories

```javascript
const zayvora = new ZayvoraEngine();
for await (const chunk of zayvora.generateResponse(prompt, history)) {
  // Stream tokens to UI
}
```

#### 2. `model-selector.js`
Extends Ollama's model list:
- Adds Zayvora as model option
- Maintains separate Ollama models
- Provides model filtering and info

```javascript
const selector = new ZayvoraModelSelector();
const models = selector.getModelList(ollamaModels);
```

#### 3. `chat-handler.js`
Routes chat messages:
- Detects Zayvora vs Ollama selection
- Validates credits before sending
- Handles both Zayvora and Ollama responses

```javascript
const handler = new ZayvoraChatHandler();
for await (const msg of handler.handleMessage(text, modelId, history)) {
  // Render response
}
```

#### 4. `ui-components.js`
UI elements and styling:
- Credit wallet display
- Repo import button
- Header customization
- Branding for Zayvora

```javascript
const ui = new ZayvoraUIComponents();
ui.renderCreditBadge();
ui.renderRepoImportButton();
ui.updateHeaderForZayvora();
```

---

## Integration Steps

### Step 1: Include Zayvora Scripts

Add to Ollama UI HTML (in `<head>` or before `</body>`):

```html
<!-- Zayvora Runtime -->
<script src="/runtime/zayvora-engine.js"></script>
<script src="/runtime/model-selector.js"></script>
<script src="/runtime/chat-handler.js"></script>
<script src="/runtime/ui-components.js"></script>
```

### Step 2: Initialize on Page Load

```javascript
// Initialize Zayvora components
let zayvora, selector, chatHandler, uiComponents;

document.addEventListener('DOMContentLoaded', async () => {
  // Create instances
  zayvora = new ZayvoraEngine();
  selector = new ZayvoraModelSelector();
  chatHandler = new ZayvoraChatHandler();
  uiComponents = new ZayvoraUIComponents();

  // Initialize
  await selector.initialize();
  await chatHandler.initialize(zayvora, selector);
  await uiComponents.initialize(zayvora);

  // Get all available models
  const ollamaModels = await fetch('/api/tags').then(r => r.json());
  const allModels = selector.getModelList(ollamaModels.models || []);

  // Enhance model selector UI
  uiComponents.enhanceModelSelector(allModels);

  // Render UI components
  uiComponents.renderRepoImportButton();
});
```

### Step 3: Modify Chat Submit Handler

Replace the existing chat submission handler:

```javascript
// Original Ollama chat handler
async function handleChatSubmit(message, modelId) {
  // Route based on model selection
  if (selector.isZayvoraModel(modelId)) {
    // Use Zayvora
    for await (const response of chatHandler.handleMessage(
      message,
      modelId,
      chatHistory
    )) {
      renderMessage(response);
    }

    // Update header
    uiComponents.updateHeaderForZayvora();
  } else {
    // Use Ollama (original behavior)
    for await (const response of chatHandler.handleMessage(
      message,
      modelId,
      chatHistory
    )) {
      renderMessage(response);
    }

    // Reset header
    uiComponents.resetHeaderForOllama();
  }

  // Update credit display
  await uiComponents.updateCredits();
}
```

### Step 4: Handle Model Selection Change

```javascript
// When user selects a model
document.querySelector('select[name="model"]').addEventListener('change', (e) => {
  const modelId = e.target.value;

  if (selector.isZayvoraModel(modelId)) {
    // Show Zayvora-specific UI
    uiComponents.updateHeaderForZayvora();
    uiComponents.renderRepoImportButton();
    uiComponents.updateCredits();

    console.log('[UI] Zayvora Engine selected');
  } else {
    // Show Ollama UI
    uiComponents.resetHeaderForOllama();
    console.log('[UI] Ollama model selected:', modelId);
  }
});
```

---

## Message Flow

### Sending a Prompt

```
User types message
    ↓
Model selector = "zayvora"?
    ├─ YES:
    │   ├─ Check credits
    │   ├─ If 0: Show purchase modal → stop
    │   ├─ Deduct 1 credit
    │   └─ Send to: zayvora-engine.generateResponse()
    │         ↓
    │       Fetch POST /api/zayvora-chat
    │         ↓
    │       Stream tokens back
    │         ↓
    │       Render to chat bubble
    │
    └─ NO:
        └─ Send to: Ollama /api/generate
              ↓
            Stream tokens back
              ↓
            Render to chat bubble
```

### Response Rendering

```javascript
function renderMessage(response) {
  const messageBubble = document.createElement('div');
  messageBubble.className = 'message-bubble';

  switch (response.type) {
    case 'token':
      // Append token to current bubble
      messageBubble.textContent += response.content;
      break;

    case 'done':
      // Mark message complete
      messageBubble.classList.add('complete');
      messageBubble.dataset.duration = response.metadata?.eval_duration;
      break;

    case 'error':
      // Show error
      messageBubble.classList.add('error');
      messageBubble.textContent = response.content;

      if (response.action === 'show-purchase-modal') {
        uiComponents.showNoCreditAlert();
      }
      break;
  }

  document.querySelector('.messages').appendChild(messageBubble);
}
```

---

## API Endpoints (Zayvora Backend)

### Inference
- **POST** `/api/zayvora-chat`
  - Request: `{ prompt, chat_history, user_id, options }`
  - Response: Stream of `{ type, token|message|error }`

### Credits
- **GET** `/api/user-wallet/{user_id}`
  - Response: `{ available_credits, total_credits, pending_credits }`
- **POST** `/api/deduct-credit`
  - Request: `{ user_id, amount }`
  - Response: `{ success, new_balance }`

### Repository Analysis
- **POST** `/api/repo-analyze`
  - Request: `{ repo_url }`
  - Response: `{ success, structure: { files, folders, language, ... } }`

---

## Credit System

### Display
- Badge in header shows available credits
- Updated after each message
- Styled with purple gradient

### Validation
- Check credits before sending message
- If 0: Show purchase modal
- User can click "Buy Credits" → `/zayvora-pricing`

### Deduction
- 1 credit per inference request
- Deducted BEFORE sending prompt
- Prevents duplicate charges on retry

### Purchase
- Redirect to `/zayvora-pricing`
- User buys credits
- Wallet updated in API
- UI refreshes on return

---

## Repository Import

### Workflow
```
User clicks "Import GitHub Repo"
    ↓
Prompt for repo URL
    ↓
Analyze via zayvora.analyzeRepository(url)
    ↓
Display analysis card in chat
    ↓
Option to include context in next prompt
```

### Analysis Card
Shows:
- Repository URL
- File/folder count
- Primary language
- Test & docs presence
- Complexity estimate

### Context Injection
- Formatted repo analysis prepended to prompt
- Zayvora understands codebase structure
- Enables smarter engineering recommendations

---

## Error Handling

### Backend Unavailable
```javascript
// If Zayvora backend doesn't respond:
if (!zayvora.isAvailable) {
  yield {
    type: 'error',
    content: 'Zayvora backend unavailable. Falling back to Ollama model.',
    fallback: true
  };
  // Continue with Ollama
}
```

### Insufficient Credits
```javascript
const credits = await zayvora.checkCredits();
if (credits.available === 0) {
  // Show purchase modal
  uiComponents.showNoCreditAlert();
  return; // Stop message sending
}
```

### Network Errors
```javascript
try {
  // Send prompt
} catch (error) {
  yield {
    type: 'error',
    content: `Zayvora error: ${error.message}`,
    retry: true
  };
}
```

---

## Styling & Branding

### Zayvora Colors
- Primary: `#667eea` (purple)
- Accent: `#764ba2` (dark purple)
- Success: `#4CAF50` (green)
- Alert: `#f44336` (red)

### Header When Zayvora Selected
```
┌─────────────────────────────────┐
│ ◈ Zayvora Engine                │
│ India's Sovereign AI Agent      │
│                    💎 120 Credits│
└─────────────────────────────────┘
```

### Chat Bubble Styling
- Zayvora responses: Purple left border
- Ollama responses: Default styling
- Error messages: Red background

---

## Testing Checklist

- [ ] Zayvora appears in model selector
- [ ] Can select Zayvora model
- [ ] Header updates for Zayvora
- [ ] Credit badge displays
- [ ] Message routes to Zayvora endpoint
- [ ] Response streams in real-time
- [ ] Credit deducted after message
- [ ] No credits → purchase modal
- [ ] Repo import button appears
- [ ] Can import GitHub repo
- [ ] Analysis displays in chat
- [ ] Can switch back to Ollama
- [ ] Ollama still works normally
- [ ] Fallback if backend down

---

## Configuration

### Zayvora Backend
```javascript
const ZAYVORA_API = 'http://localhost:3001';
```
Modify if backend runs on different host/port.

### Model Options
```javascript
const ZAYVORA_MODEL = {
  temperature: 0.2,      // Lower = more focused
  top_p: 0.95,
  top_k: 40,
  context_length: 8192
};
```

### UI Refresh Interval
```javascript
// Update credits every 30 seconds
setInterval(() => uiComponents.updateCredits(), 30000);
```

---

## Security Notes

- Never expose Zayvora backend on public internet
- Keep localhost:3001 internal only
- Validate user_id from authentication token
- Rate-limit credit deduction (1 per request)
- Log all inference requests

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Zayvora not in dropdown | Check script loading order, verify `ZayvoraEngine` defined |
| No response | Check backend at `http://localhost:3001/health` |
| Credits not updating | Verify `/api/user-wallet/{user_id}` endpoint working |
| Repo import fails | Check repo URL is public, not private |
| Stream broken | Ensure response includes proper SSE format |

---

## Performance Tips

1. **Cache model list** on page load, don't refetch
2. **Lazy load** repo import UI only when Zayvora selected
3. **Throttle** credit updates (every 30s not every message)
4. **Minimize** header updates (only on model change)
5. **Stream** responses for low latency feel

---

## Future Enhancements

- [ ] Model-specific system prompts
- [ ] Custom model parameters UI
- [ ] Prompt templates for engineering tasks
- [ ] Response quality ratings
- [ ] Credit usage analytics
- [ ] Team credit pools
- [ ] Scheduled tasks

