/**
 * Performance Rating Constants
 * Standardized rating labels and codes for performance reviews
 */

export const RATING_CODES = {
  DNM: 'DNM',   // Did Not Meet Expectation
  PME: 'PME',   // Partially Met Expectation
  ME: 'ME',     // Met Expectation
  EE: 'EE'      // Exceeded Expectation
};

// Map numeric ratings (1-4) to codes
export const RATING_BY_NUMBER = {
  1: RATING_CODES.DNM,
  2: RATING_CODES.PME,
  3: RATING_CODES.ME,
  4: RATING_CODES.EE
};

// Reverse: Map codes back to numbers
export const NUMBER_BY_RATING = {
  [RATING_CODES.DNM]: 1,
  [RATING_CODES.PME]: 2,
  [RATING_CODES.ME]: 3,
  [RATING_CODES.EE]: 4
};

// Detailed rating configuration
export const RATING_CONFIG = {
  1: {
    code: RATING_CODES.DNM,
    shortLabel: 'DNM',
    fullLabel: 'Did Not Meet Expectation',
    description: 'Did not meet performance expectations',
    color: 'red',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-200'
  },
  2: {
    code: RATING_CODES.PME,
    shortLabel: 'PME',
    fullLabel: 'Partially Met Expectation',
    description: 'Partially met performance expectations',
    color: 'orange',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-200'
  },
  3: {
    code: RATING_CODES.ME,
    shortLabel: 'ME',
    fullLabel: 'Met Expectation',
    description: 'Met performance expectations',
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-200'
  },
  4: {
    code: RATING_CODES.EE,
    shortLabel: 'EE',
    fullLabel: 'Exceeded Expectation',
    description: 'Exceeded performance expectations',
    color: 'green',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-200'
  }
};

/**
 * Get the full display label for a rating (e.g., "DNM — Did Not Meet Expectation")
 * @param {number} rating - 1, 2, 3, or 4
 * @returns {string}
 */
export function getRatingDisplayLabel(rating) {
  const n = Number(rating);
  const config = RATING_CONFIG[n];
  if (!config) return 'Not rated';
  return `${config.fullLabel}`;
}

/**
 * Get just the code and full label (e.g., "DNM — Did Not Meet Expectation")
 * @param {number} rating - 1, 2, 3, or 4
 * @returns {string}
 */
export function getRatingCodeAndLabel(rating) {
  const n = Number(rating);
  const config = RATING_CONFIG[n];
  if (!config) return 'Not rated';
  return `${config.shortLabel} ${config.fullLabel}`;
}

/**
 * Get all rating options for a select dropdown
 * @returns {Array} [{value, label}, ...]
 */
export function getRatingOptions() {
  return [
    { value: 1, label: getRatingDisplayLabel(1) },
    { value: 2, label: getRatingDisplayLabel(2) },
    { value: 3, label: getRatingDisplayLabel(3) },
    { value: 4, label: getRatingDisplayLabel(4) }
  ];
}
