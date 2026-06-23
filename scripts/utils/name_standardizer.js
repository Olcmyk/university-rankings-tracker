const stringSimilarity = require('string-similarity');

/**
 * Basic name cleaning - removes extra spaces, special chars, standardizes punctuation
 * @param {string} rawName
 * @returns {string}
 */
function cleanName(rawName) {
  if (!rawName) return '';

  return rawName
    .trim()
    .replace(/\s+/g, ' ')           // Multiple spaces to single
    .replace(/[\t\n\r]/g, '')       // Remove control chars
    .replace(/\s*,\s*/g, ', ')      // Standardize comma spacing
    .replace(/\s*-\s*/g, '-');      // Standardize hyphen spacing
}

/**
 * Extract abbreviation from parentheses
 * @param {string} name - e.g., "Massachusetts Institute of Technology (MIT)"
 * @returns {string|null} - e.g., "MIT" or null
 */
function extractAbbreviation(name) {
  const match = name.match(/\(([^)]+)\)$/);
  return match ? match[1].trim() : null;
}

/**
 * Standardize university name using canonical dictionary
 * @param {string} rawName
 * @param {object} canonicalDict - { "Canonical Name": ["alias1", "alias2"] }
 * @returns {{ canonical: string, confidence: number, needsReview: boolean }}
 */
function standardizeName(rawName, canonicalDict) {
  const cleaned = cleanName(rawName);

  if (!cleaned) {
    return { canonical: '', confidence: 0, needsReview: true };
  }

  // Step 1: Exact match in canonical names
  if (canonicalDict[cleaned]) {
    return { canonical: cleaned, confidence: 1.0, needsReview: false };
  }

  // Step 2: Exact match in aliases
  for (const [canonical, aliases] of Object.entries(canonicalDict)) {
    if (aliases && aliases.includes(cleaned)) {
      return { canonical, confidence: 1.0, needsReview: false };
    }
  }

  // Step 3: Fuzzy match against canonical names
  const canonicalNames = Object.keys(canonicalDict);
  if (canonicalNames.length > 0) {
    const matches = stringSimilarity.findBestMatch(cleaned, canonicalNames);
    const bestMatch = matches.bestMatch;

    // High confidence auto-match (>=90%)
    if (bestMatch.rating >= 0.90) {
      return { canonical: bestMatch.target, confidence: bestMatch.rating, needsReview: false };
    }

    // Medium confidence needs review (80-90%)
    if (bestMatch.rating >= 0.80) {
      return { canonical: bestMatch.target, confidence: bestMatch.rating, needsReview: true };
    }
  }

  // Step 4: No good match found
  return { canonical: cleaned, confidence: 0, needsReview: true };
}

module.exports = {
  cleanName,
  extractAbbreviation,
  standardizeName
};
