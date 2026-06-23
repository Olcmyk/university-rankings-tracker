const fs = require('fs');
const path = require('path');
const papa = require('papaparse');
const XLSX = require('xlsx');
const { parseRank } = require('../utils/rank_parser');
const { standardizeName } = require('../utils/name_standardizer');

/**
 * Parse QS Rankings data from multiple files with varying formats
 * @param {object} canonicalDict - Canonical names dictionary
 * @returns {Promise<{ records: Array, skipped: Array, reviewQueue: Array }>}
 */
async function parseQS(canonicalDict) {
  const records = [];
  const skipped = [];
  const reviewQueue = new Map();
  const seenPairs = new Set(); // Track (university, year) duplicates

  // File 1: 2017-2022 combined (has year column)
  await parseQSFile({
    path: 'qs-world-university-rankings-2017-to-2022-V2.csv',
    nameCol: 'university',
    rankCol: 'rank_display',
    yearCol: 'year',
    records, skipped, reviewQueue, canonicalDict, seenPairs
  });

  // File 2: 2023
  await parseQSFile({
    path: '2023 QS World University Rankings.csv',
    nameCol: 'institution',
    rankCol: 'Rank',
    year: 2023,
    records, skipped, reviewQueue, canonicalDict, seenPairs
  });

  // File 3: 2024
  await parseQSFile({
    path: '2024 QS World University Rankings 1.1 (For qs.com).csv',
    nameCol: 'Institution Name',
    rankCol: '2024 RANK',
    year: 2024,
    records, skipped, reviewQueue, canonicalDict, seenPairs
  });

  // File 4: 2025
  await parseQSFile({
    path: 'qs-world-rankings-2025.csv',
    nameCol: 'Institution Name',
    rankCol: '2025 Rank',
    year: 2025,
    records, skipped, reviewQueue, canonicalDict, seenPairs
  });

  // File 5: 2026
  await parseQSFile({
    path: '2026_QS_World University_Rankings.csv',
    nameCol: 'Name',
    rankCol: 'Rank',
    year: 2026,
    records, skipped, reviewQueue, canonicalDict, seenPairs
  });

  // File 6: 2027 (XLSX format)
  await parseQSXLSX({
    path: '2027 QS World University Rankings 1.1 (For qs.com).xlsx',
    year: 2027,
    records, skipped, reviewQueue, canonicalDict, seenPairs
  });

  return {
    records,
    skipped,
    reviewQueue: Array.from(reviewQueue.values())
  };
}

/**
 * Parse a single QS CSV file
 */
async function parseQSFile({ path: filePath, nameCol, rankCol, yearCol, year, records, skipped, reviewQueue, canonicalDict, seenPairs }) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf8');

    papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        for (const row of results.data) {
          const rawName = row[nameCol];
          const rawRank = row[rankCol];
          const recordYear = yearCol ? parseInt(row[yearCol]) : year;

          // Skip if missing name
          if (!rawName || !rawName.trim()) {
            skipped.push({ reason: 'missing_name', file: filePath, row });
            continue;
          }

          // Validate year
          if (!recordYear || recordYear < 2017 || recordYear > 2027) {
            skipped.push({ reason: 'invalid_year', file: filePath, row });
            continue;
          }

          // Parse rank
          const rankData = parseRank(rawRank);
          if (!rankData) {
            skipped.push({ reason: 'invalid_rank', file: filePath, row });
            continue;
          }

          // Validate rank is positive
          if (rankData.rank <= 0) {
            skipped.push({ reason: 'non_positive_rank', file: filePath, row });
            continue;
          }

          // Standardize name
          const nameData = standardizeName(rawName, canonicalDict);
          if (!nameData.canonical) {
            skipped.push({ reason: 'missing_name', file: filePath, row });
            continue;
          }

          if (nameData.needsReview) {
            const key = `${rawName}→${nameData.canonical}`;
            if (!reviewQueue.has(key)) {
              reviewQueue.set(key, {
                original: rawName,
                suggested: nameData.canonical,
                confidence: nameData.confidence
              });
            }
          }

          // Check for duplicates
          const pairKey = `${nameData.canonical}|${recordYear}`;
          if (seenPairs.has(pairKey)) {
            skipped.push({ reason: 'duplicate_pair', file: filePath, row });
            continue;
          }
          seenPairs.add(pairKey);

          records.push({
            university_name: nameData.canonical,
            year: recordYear,
            rank: rankData.rank,
            rank_display: rankData.rank_display,
            is_range: rankData.is_range
          });
        }
        resolve();
      },
      error: reject
    });
  });
}

/**
 * Parse QS XLSX file (2027)
 */
async function parseQSXLSX({ path: filePath, year, records, skipped, reviewQueue, canonicalDict, seenPairs }) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Find header row - look for row containing "Institution" and "Rank"
  let headerRowIdx = -1;
  let nameColIdx = -1;
  let rankColIdx = -1;

  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    const nameIdx = row.findIndex(h => h && String(h).toLowerCase().includes('institution'));
    const rankIdx = row.findIndex(h => h && (String(h).toLowerCase().includes('rank') || String(h).includes('2027')));

    if (nameIdx !== -1 && rankIdx !== -1) {
      headerRowIdx = i;
      nameColIdx = nameIdx;
      rankColIdx = rankIdx;
      break;
    }
  }

  if (headerRowIdx === -1 || nameColIdx === -1 || rankColIdx === -1) {
    throw new Error(`Cannot find name or rank columns in ${filePath}`);
  }

  // Parse data rows
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const rawName = row[nameColIdx];
    const rawRank = row[rankColIdx];

    // Skip if missing name
    if (!rawName || !String(rawName).trim()) {
      continue;
    }

    const rankData = parseRank(rawRank);
    if (!rankData) {
      skipped.push({ reason: 'invalid_rank', file: filePath, row });
      continue;
    }

    // Validate rank is positive
    if (rankData.rank <= 0) {
      skipped.push({ reason: 'non_positive_rank', file: filePath, row });
      continue;
    }

    const nameData = standardizeName(String(rawName), canonicalDict);
    if (!nameData.canonical) {
      skipped.push({ reason: 'missing_name', file: filePath, row });
      continue;
    }

    if (nameData.needsReview) {
      const key = `${rawName}→${nameData.canonical}`;
      if (!reviewQueue.has(key)) {
        reviewQueue.set(key, {
          original: String(rawName),
          suggested: nameData.canonical,
          confidence: nameData.confidence
        });
      }
    }

    // Check for duplicates
    const pairKey = `${nameData.canonical}|${year}`;
    if (seenPairs.has(pairKey)) {
      skipped.push({ reason: 'duplicate_pair', file: filePath, row });
      continue;
    }
    seenPairs.add(pairKey);

    records.push({
      university_name: nameData.canonical,
      year: year,
      rank: rankData.rank,
      rank_display: rankData.rank_display,
      is_range: rankData.is_range
    });
  }
}

module.exports = { parseQS };
