# Zayvora Engine Onboarding Guide

## Overview

Zayvora Engine now includes a guided 4-step onboarding experience that users must complete before accessing the chat interface. The onboarding system is designed to:

- Welcome new users to Zayvora Engine
- Showcase key capabilities
- Help users connect their workspace
- Explain credit usage and balance
- Store completion state in localStorage for persistence

---

## File Structure

```
zayvora-onboarding/
├── index.html          # Main onboarding HTML
├── onboarding.js       # Step navigation & state management
├── styles.css          # Dark theme styling with animations
└── route-guard.js      # Route protection helper script
```

---

## The 4-Step Flow

### Step 1: Welcome
- **Title:** Welcome to Zayvora Engine
- **Subtitle:** India's Sovereign AI Engineering Agent
- **Content:** Introduction and key benefits
- **Action:** "Start Setup" button to proceed

### Step 2: Capabilities
- **Title:** What Can Zayvora Do?
- **Cards:** AI Code Generation, Repository Analysis, Infrastructure Design, Autonomous Tasks
- **Interactions:** Hover animations on capability cards
- **Actions:** Back/Continue navigation

### Step 3: Connect Workspace
- **Title:** Connect Your Workspace
- **Options:**
  - **Import GitHub Repo** — Analyze existing repositories via `/api/repo-analyze`
  - **Upload Project Files** — Upload project for analysis
  - **Start Empty Workspace** — Begin with fresh workspace
- **Features:**
  - Workspace selection with visual feedback
  - GitHub repo URL input validation
  - API integration for repo analysis
- **Actions:** Back/Continue navigation

### Step 4: Credits & Usage
- **Title:** Your Credits & Usage
- **Display:**
  - Large credit balance (fetched from `/api/user-wallet/{user_id}`)
  - Credit explanation cards
- **Content:**
  - 1 credit per request
  - Track usage in real-time
  - Purchase additional credits
- **Action:** "Enter Workspace" button (completes onboarding)

---

## State Management

### LocalStorage Keys

#### `zayvora_onboarding`
Marks whether the user has completed onboarding.

```javascript
{
  "completed": true,
  "completedAt": "2026-04-04T16:45:00.000Z",
  "workspace": "repo"  // "repo", "files", or "empty"
}
```

#### `zayvora_workspace`
Stores workspace configuration and settings.

```javascript
{
  "type": "repo",
  "url": "https://github.com/owner/repo",
  "structure": { /* repo analysis result */ },
  "analyzedAt": "2026-04-04T16:45:00.000Z"
}
```

#### `zayvora_token`
Authentication token (from login page).

```javascript
{
  "user_id": "user123",
  "email": "user@example.com",
  "timestamp": 1712249100000,
  "signature": "hash"
}
```

---

## Route Protection

### Protecting the Chat Page

Add this script to `/zayvora-chat/index.html` to enforce onboarding:

```html
<!-- In <head> or before </body> -->
<script src="/zayvora-onboarding/route-guard.js"></script>
```

The guard automatically:
1. Checks for authentication token (`zayvora_token`)
2. Checks for onboarding completion (`zayvora_onboarding`)
3. Redirects to login if not authenticated
4. Redirects to onboarding if not completed
5. Allows access only if both conditions are met

### Manual Route Checks

You can manually check onboarding status:

```javascript
// In any JavaScript file after route-guard.js loads
const isAuthorized = window.checkOnboardingStatus();

if (isAuthorized) {
  // User is authenticated and onboarding complete
}
```

---

## API Integration

### GitHub Repo Analysis

**Endpoint:** `POST /api/repo-analyze`

**Request:**
```json
{
  "repo_url": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "success": true,
  "repo_url": "https://github.com/owner/repo",
  "structure": {
    "files": 142,
    "folders": 23,
    "main_language": "JavaScript",
    "has_tests": true,
    "has_docs": true,
    "estimated_complexity": "medium"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Repository not found or is private"
}
```

### User Wallet / Credits

**Endpoint:** `GET /api/user-wallet/{user_id}`

**Response:**
```json
{
  "success": true,
  "user_id": "user123",
  "total_credits": 120,
  "available_credits": 120,
  "pending_credits": 0
}
```

---

## UI Features

### Progress Bar
- Top progress indicator showing Step N/4
- Animated fill with gradient color
- Smooth transitions between steps

### Animations
- **Slide In:** Step container enters with 0.5s animation
- **Fade In:** Content fades in on step change
- **Float:** Logo icon floats up/down
- **Pulse:** Credit amount pulses gently
- **Hover:** Capability cards lift and glow on hover
- **Selection:** Workspace options highlight when selected

### Responsive Design
- Mobile-optimized layouts
- Touch-friendly buttons and inputs
- Single-column layout on phones
- Adaptive grid for capability cards and workspace options

---

## Visual Design

### Color Scheme
- **Primary Gradient:** `#667eea` to `#764ba2` (purple)
- **Background:** `#0f0f0f` to `#1a1a2e` (dark gradient)
- **Text Primary:** `#e0e0e0` (light gray)
- **Text Secondary:** `#999` (medium gray)
- **Accent:** `#667eea` (bright purple)

### Typography
- **Font Family:** System fonts (SF Pro Display, Segoe UI, etc.)
- **Headings:** 42px (welcome), 28px (sections)
- **Body:** 15px
- **Small:** 13px

### Spacing
- **Container:** Max 800px width, 40px padding (20px mobile)
- **Section Margins:** 50px between major sections
- **Button Groups:** 12px gap, flex layout

---

## Integration Checklist

- [ ] Files created in `/zayvora-onboarding/`
- [ ] `vercel.json` updated with `/zayvora-onboarding` and `/zayvora-chat` rewrites
- [ ] Route guard script added to `/zayvora-chat/index.html`
- [ ] `/api/repo-analyze` endpoint implemented (optional but recommended)
- [ ] `/api/user-wallet/{user_id}` endpoint functional
- [ ] Testing: Complete onboarding flow end-to-end
- [ ] Testing: Verify localStorage persistence
- [ ] Testing: Test route protection on chat page
- [ ] Testing: Mobile responsiveness

---

## Testing Procedures

### Full Onboarding Flow
```bash
# 1. Clear localStorage (simulates new user)
localStorage.clear()

# 2. Navigate to onboarding
window.location.href = '/zayvora-onboarding'

# 3. Complete all 4 steps
# Step 1: Click "Start Setup"
# Step 2: Click "Continue"
# Step 3: Select workspace option and click "Continue"
# Step 4: Click "Enter Workspace"

# 4. Verify redirect to /zayvora-chat
# Page should load without re-redirecting

# 5. Verify localStorage saved
localStorage.getItem('zayvora_onboarding')
// Should return object with completed: true
```

### Route Protection
```bash
# 1. Clear onboarding flag
localStorage.removeItem('zayvora_onboarding')

# 2. Try to access chat directly
window.location.href = '/zayvora-chat'

# 3. Should redirect to /zayvora-onboarding automatically
```

### GitHub Repo Import
```bash
# 1. In Step 3, select "Import GitHub Repo"
# 2. Enter: https://github.com/via-decide/daxini.xyz
# 3. Should show success or error message
# 4. Click "Continue" to proceed

# 5. Verify workspace saved
localStorage.getItem('zayvora_workspace')
// Should contain repo URL and analysis
```

---

## Customization

### Change Credit Amount Display
In `onboarding.js`, modify the `fetchUserCredits()` function to adjust API endpoint or default values.

### Adjust Step Duration
In `styles.css`, modify animation durations:
```css
.step {
  animation: slideIn 0.5s cubic-bezier(...);  /* Change 0.5s */
}
```

### Modify Capability Cards
Edit Step 2 in `index.html` to change the 4 capability cards or add more.

### Customize Progress Bar Color
In `styles.css`:
```css
.progress-fill {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);  /* Change colors */
}
```

---

## Troubleshooting

### Onboarding Not Appearing
1. Check that `/zayvora-onboarding/` files are deployed
2. Verify `vercel.json` includes the rewrite rule
3. Clear browser cache and localStorage
4. Check browser console for JavaScript errors

### Route Guard Not Redirecting
1. Verify `route-guard.js` is included in chat page
2. Check that localStorage keys are being set correctly
3. Ensure no JavaScript errors in console
4. Verify redirect is not blocked by CSP headers

### GitHub Repo Analysis Fails
1. Check that `/api/repo-analyze` endpoint exists and is working
2. Verify repo URL is public and valid
3. Check for CORS issues in browser console
4. Ensure proper error handling in response

### Credit Amount Shows Wrong Value
1. Verify `/api/user-wallet/{user_id}` endpoint is returning correct data
2. Check that `zayvora_token` is stored in localStorage
3. Ensure user_id is extracted correctly from token
4. Check for API errors in browser console

---

## Future Enhancements

- [ ] **Workspace Templates:** Pre-built workspace configurations
- [ ] **Onboarding Variants:** A/B test different onboarding flows
- [ ] **Skip Option:** Allow experienced users to skip steps
- [ ] **Analytics:** Track onboarding completion rates and drop-off points
- [ ] **Interactive Tutorial:** In-app tutorial overlay for chat features
- [ ] **Workspace Management:** Switch between multiple workspaces after onboarding
- [ ] **Custom Branding:** Theme customization during onboarding

---

## See Also

- [Payment System Documentation](PAYMENT_INFRASTRUCTURE.md)
- [Authentication Guide](zayvora-login/README.md)
- [Chat Interface Documentation](zayvora-chat/README.md)
