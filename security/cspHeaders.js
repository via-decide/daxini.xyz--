'use strict';

/**
 * cspHeaders.js — Layer 3: Content Security Policy & Browser Hardening
 * 
 * Enforces:
 *   - Strict CSP (no inline scripts, no eval)
 *   - HSTS (HTTP Strict Transport Security)
 *   - X-Frame-Options for clickjacking protection
 *   - X-Content-Type-Options for MIME sniffing prevention
 *   - Referrer-Policy for privacy
 *   - Permissions-Policy for feature restriction
 */

/**
 * Complete security headers for all responses.
 * Configurable per-route if needed.
 */
export function getSecurityHeaders(options = {}) {
  const {
    allowedScriptSources = ["'self'", 'https://cdn.jsdelivr.net'],
    allowedConnectSources = ["'self'"],
    allowedImageSources = ["'self'", 'data:', 'https://fonts.gstatic.com'],
    allowedFontSources = ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
    allowedStyleSources = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    frameAncestors = ["'none'"],
    reportUri = null,
  } = options;

  const csp = [
    `default-src 'self'`,
    `script-src ${allowedScriptSources.join(' ')}`,
    `style-src ${allowedStyleSources.join(' ')}`,
    `connect-src ${allowedConnectSources.join(' ')}`,
    `img-src ${allowedImageSources.join(' ')}`,
    `font-src ${allowedFontSources.join(' ')}`,
    `frame-ancestors ${frameAncestors.join(' ')}`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ];

  if (reportUri) {
    csp.push(`report-uri ${reportUri}`);
  }

  return {
    // Content Security Policy — blocks inline scripts, eval(), and unsafe DOM injection
    'Content-Security-Policy': csp.join('; '),

    // HSTS — force HTTPS for 1 year, include subdomains
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Clickjacking protection
    'X-Frame-Options': 'DENY',

    // Prevent MIME-type sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS Protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy — privacy-first
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy — restrict dangerous APIs
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=(self)',        // Allow USB for NFC hardware
      'serial=(self)',     // Allow serial for hardware tokens
    ].join(', '),

    // Cross-Origin policies
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
}

/**
 * Apply all security headers to an HTTP response.
 */
export function applySecurityHeaders(res, options = {}) {
  const headers = getSecurityHeaders(options);
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
}

/**
 * Generate a CSP meta tag string for static HTML pages.
 * Use this in <head> for pages served without the server middleware.
 */
export function generateCSPMetaTag(options = {}) {
  const headers = getSecurityHeaders(options);
  const csp = headers['Content-Security-Policy'];
  return `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
}
