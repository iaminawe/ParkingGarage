/**
 * String matching utility for fuzzy and partial license plate search
 * 
 * This module provides efficient string matching algorithms for finding
 * license plates using partial matches, fuzzy matching, and similarity scoring.
 * 
 * @module StringMatcher
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(a, b) {
  const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + 1  // substitution
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1, 1 = identical)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score
 */
function calculateSimilarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
}

/**
 * Check if target contains search term (case insensitive)
 * @param {string} target - Target string
 * @param {string} search - Search term
 * @returns {boolean} True if target contains search
 */
function containsPartial(target, search) {
  if (!target || !search) return false;
  return target.toUpperCase().includes(search.toUpperCase());
}

/**
 * Check if target starts with search term (case insensitive)
 * @param {string} target - Target string
 * @param {string} search - Search term
 * @returns {boolean} True if target starts with search
 */
function startsWith(target, search) {
  if (!target || !search) return false;
  return target.toUpperCase().startsWith(search.toUpperCase());
}

/**
 * Check if target ends with search term (case insensitive)
 * @param {string} target - Target string
 * @param {string} search - Search term
 * @returns {boolean} True if target ends with search
 */
function endsWith(target, search) {
  if (!target || !search) return false;
  return target.toUpperCase().endsWith(search.toUpperCase());
}

/**
 * Find fuzzy matches for a search term in a list of candidates
 * @param {string} search - Search term
 * @param {string[]} candidates - List of candidate strings
 * @param {Object} options - Search options
 * @param {number} options.threshold - Minimum similarity threshold (0-1)
 * @param {number} options.maxResults - Maximum number of results
 * @param {boolean} options.exactFirst - Prioritize exact matches
 * @returns {Array<{value: string, score: number}>} Sorted matches
 */
function findFuzzyMatches(search, candidates, options = {}) {
  const {
    threshold = 0.3,
    maxResults = 50,
    exactFirst = true
  } = options;
  
  if (!search || !candidates?.length) return [];
  
  const searchUpper = search.toUpperCase();
  const matches = [];
  
  for (const candidate of candidates) {
    if (!candidate) continue;
    
    const candidateUpper = candidate.toUpperCase();
    let score = 0;
    
    // Exact match gets highest score
    if (candidateUpper === searchUpper) {
      score = 1;
    }
    // Starts with gets high score
    else if (candidateUpper.startsWith(searchUpper)) {
      score = 0.9;
    }
    // Contains gets medium-high score
    else if (candidateUpper.includes(searchUpper)) {
      score = 0.8;
    }
    // Fuzzy similarity for partial matches
    else {
      score = calculateSimilarity(searchUpper, candidateUpper);
    }
    
    if (score >= threshold) {
      matches.push({ value: candidate, score });
    }
  }
  
  // Sort by score (descending)
  matches.sort((a, b) => {
    if (exactFirst && a.score === 1 && b.score !== 1) return -1;
    if (exactFirst && b.score === 1 && a.score !== 1) return 1;
    return b.score - a.score;
  });
  
  return matches.slice(0, maxResults);
}

/**
 * Search license plates with various matching strategies
 * @param {string} search - Search term
 * @param {string[]} licensePlates - List of license plates
 * @param {Object} options - Search options
 * @param {string} options.mode - Search mode: 'exact', 'partial', 'fuzzy', 'all'
 * @param {number} options.threshold - Fuzzy match threshold
 * @param {number} options.maxResults - Maximum results
 * @returns {Array<{licensePlate: string, score: number, matchType: string}>} Search results
 */
function searchLicensePlates(search, licensePlates, options = {}) {
  const {
    mode = 'all',
    threshold = 0.6,
    maxResults = 20
  } = options;
  
  if (!search || !licensePlates?.length) return [];
  
  const searchUpper = search.toUpperCase();
  const results = [];
  
  for (const plate of licensePlates) {
    if (!plate) continue;
    
    const plateUpper = plate.toUpperCase();
    
    // Exact match
    if (mode === 'exact' || mode === 'all') {
      if (plateUpper === searchUpper) {
        results.push({
          licensePlate: plate,
          score: 1,
          matchType: 'exact'
        });
        continue;
      }
    }
    
    // Partial match
    if (mode === 'partial' || mode === 'all') {
      if (plateUpper.includes(searchUpper)) {
        const score = plateUpper.startsWith(searchUpper) ? 0.9 : 0.8;
        results.push({
          licensePlate: plate,
          score,
          matchType: 'partial'
        });
        continue;
      }
    }
    
    // Fuzzy match
    if (mode === 'fuzzy' || mode === 'all') {
      const similarity = calculateSimilarity(searchUpper, plateUpper);
      if (similarity >= threshold) {
        results.push({
          licensePlate: plate,
          score: similarity,
          matchType: 'fuzzy'
        });
      }
    }
  }
  
  // Sort by score and match type priority
  results.sort((a, b) => {
    // Prioritize match type
    const typeOrder = { exact: 0, partial: 1, fuzzy: 2 };
    if (typeOrder[a.matchType] !== typeOrder[b.matchType]) {
      return typeOrder[a.matchType] - typeOrder[b.matchType];
    }
    // Then by score
    return b.score - a.score;
  });
  
  return results.slice(0, maxResults);
}

/**
 * Normalize license plate for consistent searching
 * @param {string} licensePlate - License plate to normalize
 * @returns {string} Normalized license plate
 */
function normalizeLicensePlate(licensePlate) {
  if (!licensePlate) return '';
  
  return licensePlate
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Remove non-alphanumeric characters
}

/**
 * Validate search term for license plate search
 * @param {string} search - Search term to validate
 * @returns {Object} Validation result
 */
function validateSearchTerm(search) {
  const errors = [];
  
  if (!search || typeof search !== 'string') {
    errors.push('Search term is required and must be a string');
  } else {
    const trimmed = search.trim();
    
    if (trimmed.length === 0) {
      errors.push('Search term cannot be empty');
    }
    
    if (trimmed.length > 20) {
      errors.push('Search term cannot exceed 20 characters');
    }
    
    // Check for valid license plate characters (allow partial searches)
    if (!/^[A-Za-z0-9\s\-]*$/.test(trimmed)) {
      errors.push('Search term contains invalid characters for license plates');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    normalized: errors.length === 0 ? normalizeLicensePlate(search) : null
  };
}

module.exports = {
  levenshteinDistance,
  calculateSimilarity,
  containsPartial,
  startsWith,
  endsWith,
  findFuzzyMatches,
  searchLicensePlates,
  normalizeLicensePlate,
  validateSearchTerm
};