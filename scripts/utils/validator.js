/**
 * Validate cleaned records for data quality issues
 */

/**
 * Check for duplicate (university, year) pairs
 * @param {Array} records
 * @returns {Array} - Array of duplicate records
 */
function checkUniqueness(records) {
  if (!records || records.length === 0) {
    return [];
  }

  const seen = new Map();
  const duplicates = [];

  for (const record of records) {
    const key = `${record.university_name}|${record.year}`;
    if (seen.has(key)) {
      duplicates.push({
        university: record.university_name,
        year: record.year,
        first: seen.get(key),
        duplicate: record
      });
    } else {
      seen.set(key, record);
    }
  }

  return duplicates;
}

/**
 * Detect anomalous ranking jumps (>200 positions year-over-year)
 * @param {Array} records - Must be sorted by university and year
 * @returns {Array} - Array of anomalies
 */
function detectAnomalies(records) {
  if (!records || records.length === 0) {
    return [];
  }

  const anomalies = [];

  // Group by university
  const byUniversity = {};
  for (const record of records) {
    if (!byUniversity[record.university_name]) {
      byUniversity[record.university_name] = [];
    }
    byUniversity[record.university_name].push(record);
  }

  // Check each university's year-over-year changes
  for (const [university, uniRecords] of Object.entries(byUniversity)) {
    // Sort by year
    uniRecords.sort((a, b) => a.year - b.year);

    for (let i = 1; i < uniRecords.length; i++) {
      const prev = uniRecords[i - 1];
      const curr = uniRecords[i];

      // Check if consecutive years
      if (curr.year === prev.year + 1) {
        const rankChange = Math.abs(curr.rank - prev.rank);

        if (rankChange > 200) {
          anomalies.push({
            university,
            yearFrom: prev.year,
            yearTo: curr.year,
            rankFrom: prev.rank,
            rankTo: curr.rank,
            change: curr.rank - prev.rank
          });
        }
      }
    }
  }

  return anomalies;
}

/**
 * Check coverage - universities with sparse data
 * @param {Array} records
 * @returns {object} - Coverage statistics
 */
function checkCoverage(records) {
  if (!records || records.length === 0) {
    return {
      totalUniversities: 0,
      sparse: [],
      averageYears: 0
    };
  }

  const byUniversity = {};

  for (const record of records) {
    if (!byUniversity[record.university_name]) {
      byUniversity[record.university_name] = 0;
    }
    byUniversity[record.university_name]++;
  }

  const sparse = Object.entries(byUniversity)
    .filter(([name, count]) => count < 3)
    .map(([name, count]) => ({ university: name, years: count }));

  const totalUniversities = Object.keys(byUniversity).length;

  return {
    totalUniversities,
    sparse: sparse,
    averageYears: totalUniversities > 0 ? records.length / totalUniversities : 0
  };
}

/**
 * Validate all records
 * @param {Array} records
 * @param {string} system - 'QS', 'THE', or 'ARWU'
 * @returns {object} - Validation results
 */
function validateRecords(records, system) {
  if (!records || records.length === 0) {
    return {
      system,
      totalRecords: 0,
      valid: 0,
      duplicates: [],
      anomalies: [],
      coverage: {
        totalUniversities: 0,
        sparse: [],
        averageYears: 0
      }
    };
  }

  const duplicates = checkUniqueness(records);
  const anomalies = detectAnomalies(records);
  const coverage = checkCoverage(records);

  return {
    system,
    totalRecords: records.length,
    valid: records.length - duplicates.length,
    duplicates,
    anomalies,
    coverage
  };
}

module.exports = {
  validateRecords,
  checkUniqueness,
  detectAnomalies,
  checkCoverage
};
