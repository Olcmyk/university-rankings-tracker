const fs = require('fs');
const path = require('path');
const papa = require('papaparse');
const { parseRank } = require('../utils/rank_parser');
const { standardizeName } = require('../utils/name_standardizer');

/**
 * Parse Times Higher Education Rankings data
 * @param {object} canonicalDict - Canonical names dictionary
 * @returns {Promise<{ records: Array, skipped: Array, reviewQueue: Array }>}
 */
async function parseTHE(canonicalDict) {
  const baseDir = 'times2011-2026/outputs/csv';
  const records = [];
  const skipped = [];
  const reviewMap = new Map(); // Deduplicate review entries
  const seenPairs = new Set(); // Track (university, year) duplicates

  // Get all ranking files (not key_statistics)
  const files = fs.readdirSync(baseDir)
    .filter(f => f.includes('rankings.csv'))
    .sort();

  for (const file of files) {
    const filePath = path.join(baseDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    await new Promise((resolve, reject) => {
      papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          for (const row of results.data) {
            // Extract fields (columns: year, Rank, Name, ...)
            const year = parseInt(row.year);
            const rawName = row.Name;
            const rawRank = row.Rank;

            // Validate year
            if (!year || year < 2011 || year > 2026) {
              skipped.push({ reason: 'invalid_year', file, row });
              continue;
            }

            // Parse rank
            const rankData = parseRank(rawRank);
            if (!rankData) {
              skipped.push({ reason: 'invalid_rank', file, row });
              continue;
            }

            // Validate rank is positive
            if (rankData.rank <= 0) {
              skipped.push({ reason: 'non_positive_rank', file, row });
              continue;
            }

            // Standardize name
            const nameData = standardizeName(rawName, canonicalDict);
            if (!nameData.canonical) {
              skipped.push({ reason: 'missing_name', file, row });
              continue;
            }

            // Check for duplicates
            const pairKey = `${nameData.canonical}|${year}`;
            if (seenPairs.has(pairKey)) {
              skipped.push({ reason: 'duplicate', file, row });
              continue;
            }
            seenPairs.add(pairKey);

            // Queue for review if needed (deduplicate)
            if (nameData.needsReview) {
              const reviewKey = `${rawName}→${nameData.canonical}`;
              if (!reviewMap.has(reviewKey)) {
                reviewMap.set(reviewKey, {
                  original: rawName,
                  suggested: nameData.canonical,
                  confidence: nameData.confidence
                });
              }
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
          resolve();
        },
        error: (error) => reject(error)
      });
    });
  }

  return {
    records,
    skipped,
    reviewQueue: Array.from(reviewMap.values())
  };
}

module.exports = { parseTHE };
