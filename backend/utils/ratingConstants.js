/**
 * Performance Rating Constants (Backend)
 * Standardized rating labels and codes for performance reviews
 */

const RATING_CODES = {
  DNM: 'DNM',   // Did Not Meet Expectation
  PME: 'PME',   // Partially Met Expectation
  ME: 'ME',     // Met Expectation
  EE: 'EE'      // Exceeded Expectation
};

// Map numeric ratings (1-4) to codes
const RATING_BY_NUMBER = {
  1: RATING_CODES.DNM,
  2: RATING_CODES.PME,
  3: RATING_CODES.ME,
  4: RATING_CODES.EE
};

// Reverse: Map codes back to numbers
const NUMBER_BY_RATING = {
  [RATING_CODES.DNM]: 1,
  [RATING_CODES.PME]: 2,
  [RATING_CODES.ME]: 3,
  [RATING_CODES.EE]: 4
};

// Detailed rating configuration
const RATING_CONFIG = {
  1: {
    code: RATING_CODES.DNM,
    shortLabel: 'DNM',
    fullLabel: 'Did Not Meet Expectation',
    description: 'Did not meet performance expectations',
    range: 'Below 50%'
  },
  2: {
    code: RATING_CODES.PME,
    shortLabel: 'PME',
    fullLabel: 'Partially Met Expectation',
    description: 'Partially met performance expectations',
    range: '50-75%'
  },
  3: {
    code: RATING_CODES.ME,
    shortLabel: 'ME',
    fullLabel: 'Met Expectation',
    description: 'Met performance expectations',
    range: '75-95%'
  },
  4: {
    code: RATING_CODES.EE,
    shortLabel: 'EE',
    fullLabel: 'Exceeded Expectation',
    description: 'Exceeded performance expectations',
    range: '95%+'
  }
};

/**
 * Get the full display label for a rating (e.g., "DNM — Did Not Meet Expectation")
 * @param {number} rating - 1, 2, 3, or 4
 * @returns {string}
 */
function getRatingDisplayLabel(rating) {
  const n = Number(rating);
  const config = RATING_CONFIG[n];
  if (!config) return 'Not rated';
  return `${config.shortLabel} — ${config.fullLabel}`;
}

/**
 * Get just the code and full label (e.g., "DNM — Did Not Meet Expectation")
 * @param {number} rating - 1, 2, 3, or 4
 * @returns {string}
 */
function getRatingCodeAndLabel(rating) {
  const n = Number(rating);
  const config = RATING_CONFIG[n];
  if (!config) return 'Not rated';
  return `${config.shortLabel} — ${config.fullLabel}`;
}

/**
 * Get all rating options for responses
 * @returns {Array} [{value, label, description}, ...]
 */
function getRatingOptions() {
  return [
    { value: 1, code: RATING_CODES.DNM, label: getRatingDisplayLabel(1), description: RATING_CONFIG[1].description },
    { value: 2, code: RATING_CODES.PME, label: getRatingDisplayLabel(2), description: RATING_CONFIG[2].description },
    { value: 3, code: RATING_CODES.ME,  label: getRatingDisplayLabel(3), description: RATING_CONFIG[3].description },
    { value: 4, code: RATING_CODES.EE,  label: getRatingDisplayLabel(4), description: RATING_CONFIG[4].description }
  ];
}

module.exports = {
  RATING_CODES,
  RATING_BY_NUMBER,
  NUMBER_BY_RATING,
  RATING_CONFIG,
  getRatingDisplayLabel,
  getRatingCodeAndLabel,
  getRatingOptions
};
