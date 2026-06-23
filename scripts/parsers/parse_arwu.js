const fs = require('fs');
const papa = require('papaparse');
const { parseRank } = require('../utils/rank_parser');
const { standardizeName } = require('../utils/name_standardizer');

/**
 * Parse ARWU/Shanghai Rankings data
 * @param {object} canonicalDict - Canonical names dictionary
 * @returns {Promise<{ records: Array, skipped: Array, reviewQueue: Array }>}
 */
async function parseARWU(canonicalDict) {
  const filePath = 'arwu_all_years_combined_2003-2025.csv';

  return new Promise((resolve, reject) => {
    const records = [];
    const skipped = [];
    const reviewQueue = [];
    const seenPairs = new Set(); // Track (university, year) duplicates

    const fileContent = fs.readFileSync(filePath, 'utf8');

    papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        for (const row of results.data) {
          // Extract fields
          const rawName = row.name;
          const year = parseInt(row.year);
          const rawRank = row.rank;

          // Validate year
          if (!year || year < 2003 || year > 2025) {
            skipped.push({ reason: 'invalid_year', row });
            continue;
          }

          // Parse rank
          const rankData = parseRank(rawRank);
          if (!rankData) {
            skipped.push({ reason: 'invalid_rank', row });
            continue;
          }

          // Validate rank is positive
          if (rankData.rank <= 0) {
            skipped.push({ reason: 'non_positive_rank', row });
            continue;
          }

          // Standardize name
          const nameData = standardizeName(rawName, canonicalDict);
          if (!nameData.canonical) {
            skipped.push({ reason: 'missing_name', row });
            continue;
          }

          // Check for duplicates
          const pairKey = `${nameData.canonical}|${year}`;
          if (seenPairs.has(pairKey)) {
            skipped.push({ reason: 'duplicate', row });
            continue;
          }
          seenPairs.add(pairKey);

          // Queue for review if needed
          if (nameData.needsReview) {
            reviewQueue.push({
              original: rawName,
              suggested: nameData.canonical,
              confidence: nameData.confidence
            });
          }

          // Add record
          records.push({
            university_name: nameData.canonical,
            year: year,
            rank: rankData.rank,
            rank_display: rankData.rank_display,
            is_range: rankData.is_range
          });
        }

        resolve({ records, skipped, reviewQueue });
      },
      error: (error) => reject(error)
    });
  });
}

module.exports = { parseARWU };
