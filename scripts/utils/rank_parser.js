/**
 * Parse ranking value from various formats to standardized form
 * @param {string|number} value - Raw ranking value
 * @returns {{ rank: number, rank_display: string, is_range: boolean } | null}
 */
function parseRank(value) {
  if (value === null || value === undefined) return null;

  // Clean input
  let cleaned = String(value).trim();
  if (!cleaned || cleaned === '' || cleaned === '–' || cleaned === 'NR' || cleaned === 'N/A' || cleaned === 'Not Ranked') {
    return null;
  }

  // Remove common prefixes and ordinal suffixes (st, nd, rd, th)
  cleaned = cleaned.replace(/^[=#]+/, '').replace(/(st|nd|rd|th)$/gi, '').trim();

  // Handle range (201-250, 201–250, 201 - 250)
  const rangeMatch = cleaned.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    return {
      rank: (start + end) / 2,
      rank_display: value.toString().trim(),
      is_range: true
    };
  }

  // Handle open-ended (501+)
  const plusMatch = cleaned.match(/^(\d+)\+$/);
  if (plusMatch) {
    const num = parseInt(plusMatch[1]);
    return {
      rank: num,
      rank_display: value.toString().trim(),
      is_range: true
    };
  }

  // Handle exact rank
  const exactMatch = cleaned.match(/^(\d+)$/);
  if (exactMatch) {
    const num = parseInt(exactMatch[1]);
    if (num < 0) return null;
    return {
      rank: num,
      rank_display: String(num),
      is_range: false
    };
  }

  // Invalid format
  return null;
}

module.exports = { parseRank };
