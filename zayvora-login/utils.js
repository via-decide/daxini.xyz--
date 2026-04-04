/**
 * @file utils.js
 * @description A collection of utility functions for common tasks, designed for easy use by non-technical users within applications.
 */

/**
 * Capitalizes the first letter of a string.
 * @param {string} str The input string.
 * @returns {string} The string with its first letter capitalized.
 */
export function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a Date object or a date string into a user-friendly format.
 * Defaults to 'MM/DD/YYYY' if no format is provided.
 * @param {Date|string} dateInput The date to format. Can be a Date object or a string parseable by Date.
 * @param {string} [format='MM/DD/YYYY'] The desired format string (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY HH:mm').
 *                                       Supported tokens: YYYY (year), MM (month), DD (day), HH (hours), mm (minutes), ss (seconds).
 * @returns {string} The formatted date string, or an empty string if the date is invalid.
 */
export function formatDate(dateInput, format = 'MM/DD/YYYY') {
  if (!dateInput) return '';

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return ''; // Invalid date

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace(/YYYY/g, year)
    .replace(/MM/g, month)
    .replace(/DD/g, day)
    .replace(/HH/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds);
}

/**
 * Converts a string into a URL-friendly slug.
 * - Converts to lowercase.
 * - Replaces non-alphanumeric characters (except spaces, hyphens) with a hyphen.
 * - Trims hyphens from the start and end.
 * @param {string} str The input string.
 * @returns {string} The slugified string.
 */
export function slugify(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/[\s_-]+/g, '-')     // Collapse whitespace and underscore to a single hyphen
    .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
}

/**
 * Truncates a string to a specified maximum length, adding a suffix if truncated.
 * @param {string} str The input string.
 * @param {number} maxLength The maximum length of the string before truncation.
 * @param {string} [suffix='...'] The suffix to add if the string is truncated.
 * @returns {string} The truncated string.
 */
export function truncate(str, maxLength, suffix = '...') {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Basic email validation. Checks for a common email pattern.
 * Note: This is not a perfect validator but covers most common cases.
 * @param {string} email The email string to validate.
 * @returns {boolean} True if the email matches a basic pattern, false otherwise.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // Regex from HTML5 specification for email input type
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validates if an email belongs to an Indian University (.ac.in or .edu.in).
 * @param {string} email The email string to validate.
 * @returns {boolean} True if it's an Indian university email, false otherwise.
 */
export function isIndianUniversityEmail(email) {
  if (!isValidEmail(email)) return false;
  const lowerEmail = email.toLowerCase();
  return lowerEmail.endsWith('.ac.in') || lowerEmail.endsWith('.edu.in');
}

/**
 * Debounces a function call, ensuring it's only called after a specified delay
 * since the last invocation. Useful for performance-sensitive events like
 * window resizing, scrolling, or rapid key presses.
 * @param {Function} func The function to debounce.
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {Function} A new debounced function.
 */
export function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

/**
 * Retrieves an item from localStorage and optionally parses it as JSON.
 * @param {string} key The key of the item to retrieve.
 * @param {boolean} [parseJson=false] Whether to attempt parsing the stored string as JSON.
 * @returns {any|null} The retrieved item, parsed JSON, or null if not found/error.
 */
export function getLocalStorageItem(key, parseJson = false) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    return parseJson ? JSON.parse(item) : item;
  } catch (error) {
    console.error(`Error retrieving or parsing localStorage item '${key}':`, error);
    return null;
  }
}

/**
 * Stores an item in localStorage, optionally stringifying it as JSON.
 * @param {string} key The key under which to store the item.
 * @param {any} value The value to store.
 * @param {boolean} [stringifyJson=false] Whether to stringify the value to JSON before storing.
 * @returns {boolean} True if the item was stored successfully, false otherwise.
 */
export function setLocalStorageItem(key, value, stringifyJson = false) {
  try {
    const itemToStore = stringifyJson ? JSON.stringify(value) : String(value);
    localStorage.setItem(key, itemToStore);
    return true;
  } catch (error) {
    console.error(`Error storing localStorage item '${key}':`, error);
    return false;
  }
}

/**
 * Removes an item from localStorage.
 * @param {string} key The key of the item to remove.
 */
export function removeLocalStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing localStorage item '${key}':`, error);
  }
}
