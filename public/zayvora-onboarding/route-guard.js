// ============================================================================
// ZAYVORA ONBOARDING - ROUTE PROTECTION GUARD
// ============================================================================
// Include this script in /zayvora-chat and other protected pages
// <script src="/zayvora-onboarding/route-guard.js"></script>

(function() {
  const ONBOARDING_KEY = 'zayvora_onboarding';
  const AUTH_TOKEN_KEY = 'zayvora_token';

  // Check if user is authenticated AND completed onboarding
  function checkAccess() {
    const authToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const onboardingComplete = localStorage.getItem(ONBOARDING_KEY);

    // If not authenticated, redirect to login
    if (!authToken) {
      window.location.href = '/zayvora-login';
      return false;
    }

    // If authenticated but onboarding not complete, redirect to onboarding
    if (!onboardingComplete) {
      window.location.href = '/zayvora-onboarding';
      return false;
    }

    // User is authenticated and onboarding complete
    return true;
  }

  // Run check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAccess);
  } else {
    checkAccess();
  }

  // Export for manual checks
  window.checkOnboardingStatus = checkAccess;
})();
