'use strict';

/**
 * appSandbox.js — Layer 5: Deployment Security / App Isolation
 * 
 * For Zayvora as a hosting platform:
 *   - Every deployed app served in sandboxed iframe
 *   - Isolated origin enforcement
 *   - Prevents cross-app script access
 *   - Prevents DOM injection into parent system
 *   - CSP enforcement per-app
 */

/**
 * Generate sandbox attributes for hosted app iframes.
 * These are the MINIMUM restrictions for any hosted app.
 */
export function getSandboxAttributes() {
  return [
    'allow-scripts',              // Allow JS execution within sandbox
    'allow-same-origin',          // Needed for API calls (but isolated via CSP)
    'allow-forms',                // Allow form submission
    'allow-popups',               // Allow window.open (controlled)
    // NOT included:
    // 'allow-top-navigation'     — Prevents navigating parent window
    // 'allow-modals'             — Prevents alert/confirm/prompt abuse
    // 'allow-pointer-lock'       — Prevents pointer hijacking
    // 'allow-storage-access-by-user-activation' — Prevents silent cookie access
  ].join(' ');
}

/**
 * Generate the iframe HTML for a sandboxed hosted app.
 */
export function generateAppFrame(appUrl, appId, options = {}) {
  const {
    width = '100%',
    height = '100%',
    allowedOrigins = [],
  } = options;

  const sandbox = getSandboxAttributes();

  // CSP for the iframe content
  const frameCsp = [
    `default-src 'self' ${appUrl}`,
    `script-src 'self'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `connect-src 'self'`,
    `frame-ancestors 'self'`,
    `form-action 'self'`,
  ].join('; ');

  return {
    html: `<iframe 
      id="app-frame-${escapeAttr(appId)}" 
      src="${escapeAttr(appUrl)}" 
      sandbox="${sandbox}" 
      width="${width}" 
      height="${height}" 
      style="border:none;" 
      loading="lazy"
      referrerpolicy="no-referrer"
      csp="${frameCsp}"
      title="Hosted App: ${escapeAttr(appId)}"
    ></iframe>`,
    securityPolicy: {
      sandbox,
      csp: frameCsp,
      allowedOrigins,
    },
  };
}

/**
 * Validate that a hosted app's content doesn't try to escape the sandbox.
 * Checks for dangerous patterns in app HTML.
 */
export function validateAppContent(htmlContent) {
  const violations = [];

  // Check for attempts to access parent/top window
  if (/(?:parent|top|opener)\s*\.\s*(?:document|location|postMessage)/gi.test(htmlContent)) {
    violations.push('parent_access_attempt');
  }

  // Check for attempts to break out of iframe
  if (/(?:window\.top|window\.parent|parent\.document)/gi.test(htmlContent)) {
    violations.push('iframe_escape_attempt');
  }

  // Check for storage access attempts
  if (/(?:document\.cookie|localStorage|sessionStorage)\s*(?:=|\[)/gi.test(htmlContent)) {
    violations.push('storage_access_attempt');
  }

  // Check for external script loading
  if (/<script[^>]+src\s*=\s*["']https?:\/\/(?!cdn\.jsdelivr\.net)/gi.test(htmlContent)) {
    violations.push('external_script_load');
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}

/**
 * Generate message passing interface for parent-child communication.
 * Uses postMessage with strict origin validation.
 */
export function generateMessageBridge(appId, allowedOrigin) {
  return `
    // Zayvora App Message Bridge (auto-injected)
    (function() {
      'use strict';
      const ALLOWED_ORIGIN = '${escapeAttr(allowedOrigin)}';
      const APP_ID = '${escapeAttr(appId)}';
      
      window.addEventListener('message', function(event) {
        // STRICT origin check
        if (event.origin !== ALLOWED_ORIGIN) {
          console.warn('[SANDBOX] Rejected message from unauthorized origin:', event.origin);
          return;
        }
        
        // Only accept structured messages
        if (!event.data || typeof event.data !== 'object' || !event.data.type) {
          return;
        }
        
        // Handle approved message types only
        const ALLOWED_TYPES = ['config', 'theme', 'resize'];
        if (!ALLOWED_TYPES.includes(event.data.type)) {
          console.warn('[SANDBOX] Rejected unauthorized message type:', event.data.type);
          return;
        }
        
        // Dispatch to app handler
        window.dispatchEvent(new CustomEvent('zayvora-message', { detail: event.data }));
      });
      
      // Safe way to send messages back to parent
      window.zayvoraSend = function(type, payload) {
        const ALLOWED_SEND_TYPES = ['status', 'error', 'ready'];
        if (!ALLOWED_SEND_TYPES.includes(type)) return;
        
        parent.postMessage({ appId: APP_ID, type, payload }, ALLOWED_ORIGIN);
      };
    })();
  `;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
