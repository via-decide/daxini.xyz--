// ============================================================================
// ZAYVORA ONBOARDING - Step Navigation & State Management
// ============================================================================

const ONBOARDING_KEY = 'zayvora_onboarding';
const WORKSPACE_KEY = 'zayvora_workspace';
let currentStep = 1;
let selectedWorkspace = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Check if onboarding already completed
  if (localStorage.getItem(ONBOARDING_KEY)) {
    window.location.href = '/zayvora-chat';
    return;
  }

  // Initialize step 1
  showStep(1);
  updateProgressBar();

  // Set user's current credit balance (mock - replace with API call)
  fetchUserCredits();
});

// ============================================================================
// STEP NAVIGATION
// ============================================================================

function nextStep() {
  if (currentStep < 4) {
    currentStep++;
    showStep(currentStep);
    updateProgressBar();
    scrollToTop();
  }
}

function previousStep() {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
    updateProgressBar();
    scrollToTop();
  }
}

function showStep(stepNum) {
  // Hide all steps
  document.querySelectorAll('.step').forEach(step => {
    step.classList.add('hidden');
  });

  // Show current step with animation
  const currentStepEl = document.getElementById(`step-${stepNum}`);
  if (currentStepEl) {
    currentStepEl.classList.remove('hidden');
    currentStepEl.style.animation = 'slideIn 0.4s ease-out';
  }

  // Update step counter
  document.getElementById('stepCounter').textContent = `Step ${stepNum} of 4`;
}

function updateProgressBar() {
  const percentage = (currentStep / 4) * 100;
  document.getElementById('progressFill').style.width = percentage + '%';
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// SECTION 3: WORKSPACE SELECTION
// ============================================================================

function selectWorkspaceOption(option) {
  // Remove previous selection styling
  document.querySelectorAll('.workspace-option').forEach(opt => {
    opt.classList.remove('selected');
  });

  // Add selection styling
  event.currentTarget.classList.add('selected');
  selectedWorkspace = option;

  // Show repo input if importing repo
  const repoInput = document.getElementById('repoInput');
  const repoStatus = document.getElementById('repoStatus');

  if (option === 'repo') {
    repoInput.classList.remove('hidden');
    repoInput.focus();
  } else {
    repoInput.classList.add('hidden');
    repoStatus.classList.add('hidden');
  }

  // Enable continue button
  document.getElementById('continueBtn').disabled = false;
}

async function continueWorkspace() {
  if (!selectedWorkspace) return;

  const continueBtn = document.getElementById('continueBtn');
  continueBtn.disabled = true;
  continueBtn.textContent = 'Processing...';

  try {
    if (selectedWorkspace === 'repo') {
      // Import GitHub repo
      const repoUrl = document.getElementById('repoInput').value.trim();
      if (!repoUrl) {
        showError('Please enter a repository URL');
        continueBtn.disabled = false;
        continueBtn.textContent = 'Continue →';
        return;
      }

      // Analyze repo via API
      const result = await analyzeRepository(repoUrl);
      if (!result.success) {
        showError('Failed to analyze repository: ' + result.error);
        continueBtn.disabled = false;
        continueBtn.textContent = 'Continue →';
        return;
      }

      // Save workspace info
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify({
        type: 'repo',
        url: repoUrl,
        structure: result.structure,
        analyzedAt: new Date().toISOString()
      }));
    } else if (selectedWorkspace === 'files') {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify({
        type: 'files',
        createdAt: new Date().toISOString()
      }));
    } else {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify({
        type: 'empty',
        createdAt: new Date().toISOString()
      }));
    }

    nextStep();
  } catch (error) {
    console.error('Workspace setup error:', error);
    showError('Error setting up workspace');
  } finally {
    continueBtn.disabled = false;
    continueBtn.textContent = 'Continue →';
  }
}

function showError(message) {
  const statusEl = document.getElementById('repoStatus');
  statusEl.textContent = '❌ ' + message;
  statusEl.classList.remove('hidden');
  statusEl.style.color = '#f44336';
}

// ============================================================================
// SECTION 8: REPO ANALYSIS
// ============================================================================

async function analyzeRepository(repoUrl) {
  try {
    const response = await fetch('/api/repo-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repo_url: repoUrl
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Repo analysis error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// CREDITS & USAGE
// ============================================================================

async function fetchUserCredits() {
  try {
    // Get user_id from zayvora_token if available
    const tokenStr = localStorage.getItem('zayvora_token');
    if (!tokenStr) {
      // Default demo credits
      document.getElementById('creditsAmount').textContent = '120';
      return;
    }

    const token = JSON.parse(tokenStr);
    const response = await fetch(`/api/user-wallet/${token.user_id}`);

    if (response.ok) {
      const data = await response.json();
      document.getElementById('creditsAmount').textContent = data.available_credits || 120;
    }
  } catch (error) {
    console.error('Error fetching credits:', error);
    // Fallback to demo amount
    document.getElementById('creditsAmount').textContent = '120';
  }
}

// ============================================================================
// SECTION 3: ONBOARDING COMPLETION
// ============================================================================

function completeOnboarding() {
  // Save onboarding completion state
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
    completed: true,
    completedAt: new Date().toISOString(),
    workspace: selectedWorkspace
  }));

  // Log analytics (optional)
  console.log('✓ Onboarding completed');
  console.log('Workspace selected:', selectedWorkspace);

  // Redirect to chat
  setTimeout(() => {
    window.location.href = '/zayvora-chat';
  }, 500);
}

// ============================================================================
// ROUTE PROTECTION (Include in chat page)
// ============================================================================

// This should be called in /zayvora-chat to protect the route
function checkOnboardingStatus() {
  const onboardingComplete = localStorage.getItem(ONBOARDING_KEY);

  if (!onboardingComplete) {
    // Redirect to onboarding if not complete
    window.location.href = '/zayvora-onboarding';
    return false;
  }

  return true;
}

// Export for use in other pages
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkOnboardingStatus };
}
