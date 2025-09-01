/**
 * String matching utility for fuzzy and partial license plate search
 * 
 * This module provides efficient string matching algorithms for finding
 * license plates using partial matches, fuzzy matching, and similarity scoring.
 * 
 * @module StringMatcher
 */

import type { ValidationResult } from '../types/models';

// Additional types for string matching
export interface FuzzyMatch {
  value: string;
  score: number;
}

export interface FuzzyMatchOptions {
  threshold?: number;
  maxResults?: number;
  exactFirst?: boolean;
}

export interface LicensePlateSearchOptions {
  mode?: 'exact' | 'partial' | 'fuzzy' | 'all';
  threshold?: number;
  maxResults?: number;
}

export interface LicensePlateMatch {
  licensePlate: string;
  score: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
}

export type SearchMode = 'exact' | 'partial' | 'fuzzy' | 'all';

/**
 * Calculate Levenshtein distance between two strings
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
  
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
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a?.length ?? 0, b?.length ?? 0);
  
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
}

/**
 * Check if target contains search term (case insensitive)
 * @param target - Target string
 * @param search - Search term
 * @returns True if target contains search
 */
export function containsPartial(target: string, search: string): boolean {
  if (!target || !search) return false;
  return target.toUpperCase().includes(search.toUpperCase());
}

/**
 * Check if target starts with search term (case insensitive)
 * @param target - Target string
 * @param search - Search term
 * @returns True if target starts with search
 */
export function startsWith(target: string, search: string): boolean {
  if (!target || !search) return false;
  return target.toUpperCase().startsWith(search.toUpperCase());
}

/**
 * Check if target ends with search term (case insensitive)
 * @param target - Target string
 * @param search - Search term
 * @returns True if target ends with search
 */
export function endsWith(target: string, search: string): boolean {
  if (!target || !search) return false;
  return target.toUpperCase().endsWith(search.toUpperCase());
}

/**
 * Find fuzzy matches for a search term in a list of candidates
 * @param search - Search term
 * @param candidates - List of candidate strings
 * @param options - Search options
 * @returns Sorted matches
 */
export function findFuzzyMatches(
  search: string, 
  candidates: string[], 
  options: FuzzyMatchOptions = {}
): FuzzyMatch[] {
  const {
    threshold = 0.3,
    maxResults = 50,
    exactFirst = true
  } = options;
  
  if (!search || !candidates?.length) return [];
  
  const searchUpper = search.toUpperCase();
  const matches: FuzzyMatch[] = [];
  
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
 * @param search - Search term
 * @param licensePlates - List of license plates
 * @param options - Search options
 * @returns Search results
 */
export function searchLicensePlates(
  search: string, 
  licensePlates: string[], 
  options: LicensePlateSearchOptions = {}
): LicensePlateMatch[] {
  const {
    mode = 'all',
    threshold = 0.6,
    maxResults = 20
  } = options;
  
  if (!search || !licensePlates?.length) return [];
  
  const searchUpper = search.toUpperCase();
  const results: LicensePlateMatch[] = [];
  
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
 * @param licensePlate - License plate to normalize
 * @returns Normalized license plate
 */
export function normalizeLicensePlate(licensePlate: string | unknown): string {
  if (!licensePlate) return '';
  
  return String(licensePlate)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Remove non-alphanumeric characters
}

/**
 * Validate search term for license plate search
 * @param search - Search term to validate
 * @returns Validation result
 */
export function validateSearchTerm(search: unknown): ValidationResult & { normalized: string | null } {
  const errors: string[] = [];
  
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

/**
 * Type guard to check if a value is a valid SearchMode
 */
export function isValidSearchMode(mode: unknown): mode is SearchMode {
  return typeof mode === 'string' && ['exact', 'partial', 'fuzzy', 'all'].includes(mode);
}

/**
 * Create search suggestions based on partial input
 * @param input - Partial input string
 * @param candidates - List of candidate strings to suggest from
 * @param maxSuggestions - Maximum number of suggestions to return
 * @returns Array of suggested strings
 */
export function createSearchSuggestions(
  input: string,
  candidates: string[],
  maxSuggestions: number = 5
): string[] {
  if (!input || input.length < 2) return [];
  
  const matches = findFuzzyMatches(input, candidates, {
    threshold: 0.4,
    maxResults: maxSuggestions,
    exactFirst: true
  });
  
  return matches.map(match => match.value);
}

/**
 * Highlight matching portions of a string
 * @param text - Text to highlight
 * @param search - Search term to highlight
 * @param highlightStart - String to insert before matches
 * @param highlightEnd - String to insert after matches
 * @returns String with highlighted matches
 */
export function highlightMatches(
  text: string,
  search: string,
  highlightStart: string = '<mark>',
  highlightEnd: string = '</mark>'
): string {
  if (!text || !search) return text;
  
  const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, `${highlightStart}$1${highlightEnd}`);
}

/**
 * Get search statistics for performance monitoring
 * @param searchTerm - The search term used
 * @param results - Search results
 * @param executionTimeMs - Time taken to execute search in milliseconds
 * @returns Search statistics
 */
export function getSearchStatistics(
  searchTerm: string,
  results: LicensePlateMatch[],
  executionTimeMs: number
): {
  searchTerm: string;
  resultCount: number;
  executionTime: number;
  exactMatches: number;
  partialMatches: number;
  fuzzyMatches: number;
  averageScore: number;
} {
  const exactMatches = results.filter(r => r.matchType === 'exact').length;
  const partialMatches = results.filter(r => r.matchType === 'partial').length;
  const fuzzyMatches = results.filter(r => r.matchType === 'fuzzy').length;
  
  const averageScore = results.length > 0 
    ? results.reduce((sum, r) => sum + r.score, 0) / results.length
    : 0;
  
  return {
    searchTerm,
    resultCount: results.length,
    executionTime: executionTimeMs,
    exactMatches,
    partialMatches,
    fuzzyMatches,
    averageScore: Math.round(averageScore * 100) / 100
  };
}