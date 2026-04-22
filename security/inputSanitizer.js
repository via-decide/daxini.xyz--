'use strict';

/**
 * inputSanitizer.js — Layer 8: Input & File Sanitization
 * 
 * Covers:
 *   - HTML/XSS sanitization (strips <script>, event handlers, etc.)
 *   - JSON validation and size enforcement
 *   - File type whitelisting
 *   - Request body size limits (1MB max)
 *   - Safe HTML subset allowance
 */

// ── Constants ──────────────────────────────────────────────
const MAX_PAYLOAD_BYTES = 1 * 1024 * 1024; // 1MB
const MAX_JSON_DEPTH = 10;

const ALLOWED_FILE_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.csv', '.xml',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.pdf', '.html', '.css', '.js', '.ts',
]);

const DANGEROUS_HTML_PATTERNS = [
  /<script[\s>]/gi,
  /<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,          // onclick=, onerror=, onload=, etc.
  /<iframe[\s>]/gi,
  /<\/iframe>/gi,
  /<object[\s>]/gi,
  /<embed[\s>]/gi,
  /<applet[\s>]/gi,
  /<form[\s>]/gi,
  /<input[\s>]/gi,
  /data:text\/html/gi,
  /expression\s*\(/gi,    // CSS expression()
  /url\s*\(\s*['"]?\s*javascript/gi,
  /<base[\s>]/gi,
  /<meta[\s>]/gi,
  /<link[\s>](?!.*rel\s*=\s*['"]stylesheet)/gi,
  /<!--/g,                 // HTML comments (can hide payloads)
];

const SAFE_HTML_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 'a',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img',
]);

const SAFE_ATTRIBUTES = new Set([
  'href', 'src', 'alt', 'title', 'class', 'id', 'width', 'height',
]);

// ── HTML Sanitization ──────────────────────────────────────

/**
 * Strip all dangerous HTML patterns from input.
 * Returns clean text safe for rendering.
 */
export function sanitizeHTML(input) {
  if (!input || typeof input !== 'string') return '';

  let clean = input;

  // Remove all dangerous patterns
  for (const pattern of DANGEROUS_HTML_PATTERNS) {
    clean = clean.replace(pattern, '');
  }

  // Remove any remaining tags not in safe list
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    if (SAFE_HTML_TAGS.has(tagName.toLowerCase())) {
      // Strip unsafe attributes from allowed tags
      return match.replace(/\s+(\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (attrMatch, attrName) => {
        if (SAFE_ATTRIBUTES.has(attrName.toLowerCase())) {
          // Validate href/src don't contain javascript:
          if ((attrName === 'href' || attrName === 'src') && /javascript:/i.test(attrMatch)) {
            return '';
          }
          return attrMatch;
        }
        return '';
      });
    }
    return ''; // Strip unsafe tags entirely
  });

  return clean;
}

/**
 * Escape all HTML entities — use when you want NO HTML at all.
 */
export function escapeHTML(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// ── JSON Validation ────────────────────────────────────────

/**
 * Validate and parse JSON safely with depth limits.
 */
export function validateJSON(input, maxDepth = MAX_JSON_DEPTH) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input must be a non-empty string', data: null };
  }

  if (Buffer.byteLength(input, 'utf8') > MAX_PAYLOAD_BYTES) {
    return { valid: false, error: `Payload exceeds ${MAX_PAYLOAD_BYTES} byte limit`, data: null };
  }

  try {
    const parsed = JSON.parse(input);
    const depth = measureJSONDepth(parsed);
    if (depth > maxDepth) {
      return { valid: false, error: `JSON depth ${depth} exceeds max ${maxDepth}`, data: null };
    }
    return { valid: true, error: null, data: parsed };
  } catch (e) {
    return { valid: false, error: `Malformed JSON: ${e.message}`, data: null };
  }
}

function measureJSONDepth(obj, currentDepth = 0) {
  if (obj === null || typeof obj !== 'object') return currentDepth;
  let maxDepth = currentDepth;
  for (const value of Object.values(obj)) {
    maxDepth = Math.max(maxDepth, measureJSONDepth(value, currentDepth + 1));
  }
  return maxDepth;
}

// ── File Validation ────────────────────────────────────────

/**
 * Validate a file upload by extension and size.
 */
export function validateFile(filename, sizeBytes) {
  if (!filename || typeof filename !== 'string') {
    return { allowed: false, reason: 'Invalid filename' };
  }

  const ext = '.' + filename.split('.').pop().toLowerCase();

  if (!ALLOWED_FILE_EXTENSIONS.has(ext)) {
    return { allowed: false, reason: `File type ${ext} is not allowed` };
  }

  if (sizeBytes > MAX_PAYLOAD_BYTES) {
    return { allowed: false, reason: `File exceeds 1MB limit (${sizeBytes} bytes)` };
  }

  return { allowed: true, reason: 'ok' };
}

// ── Request Body Validation Middleware ──────────────────────

/**
 * Validate an incoming request body.
 * Returns: { valid: boolean, error: string|null, body: any }
 */
export function validateRequestBody(req) {
  const contentType = req.headers?.['content-type'] || '';
  const contentLength = parseInt(req.headers?.['content-length'] || '0', 10);

  // Reject oversized payloads
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return {
      valid: false,
      error: `Payload too large: ${contentLength} bytes (max ${MAX_PAYLOAD_BYTES})`,
      body: null,
    };
  }

  // For JSON content, validate structure
  if (contentType.includes('application/json') && req.body) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    return validateJSON(bodyStr);
  }

  return { valid: true, error: null, body: req.body };
}
