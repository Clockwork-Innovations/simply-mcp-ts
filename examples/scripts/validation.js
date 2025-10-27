/**
 * Input Validation Utilities
 *
 * Provides reusable validation functions for user input.
 * This file is loaded before catalog.js to make utilities available.
 */

/**
 * Validate search query
 *
 * @param {string} query - Search query to validate
 * @returns {{ valid: boolean; error?: string }}
 */
function validateSearchQuery(query) {
  if (typeof query !== 'string') {
    return { valid: false, error: 'Query must be a string' };
  }

  const trimmed = query.trim();

  // Empty query is valid (returns all products)
  if (trimmed.length === 0) {
    return { valid: true };
  }

  // Check length constraints
  if (trimmed.length > 100) {
    return { valid: false, error: 'Query too long (max 100 characters)' };
  }

  // Check for invalid characters (allow alphanumeric, spaces, and basic punctuation)
  const validPattern = /^[a-zA-Z0-9\s\-.,!?'"]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Query contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Validate category selection
 *
 * @param {string} category - Category to validate
 * @returns {{ valid: boolean; error?: string }}
 */
function validateCategory(category) {
  const validCategories = ['', 'Electronics', 'Clothing', 'Home', 'Fitness'];

  if (!validCategories.includes(category)) {
    return { valid: false, error: 'Invalid category selected' };
  }

  return { valid: true };
}

/**
 * Sanitize HTML to prevent XSS
 *
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Format price as USD currency
 *
 * @param {number} price - Price to format
 * @returns {string} Formatted price string
 */
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

/**
 * Debounce function to limit rate of function calls
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Log that validation utilities are loaded
console.log('[Validation] Input validation utilities loaded');
