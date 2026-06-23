const {
  validateRecords,
  checkUniqueness,
  detectAnomalies,
  checkCoverage
} = require('./validator');

// Helper function to deep compare objects
function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

console.log('Testing checkUniqueness...');

// Test: detects duplicate (university, year) pairs
const duplicateRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2021, rank: 1 },
  { university_name: 'MIT', year: 2021, rank: 2 }, // duplicate
];
const duplicates1 = checkUniqueness(duplicateRecords);
console.assert(duplicates1.length === 1, 'Should detect 1 duplicate');
console.assert(duplicates1[0].university === 'MIT', 'Duplicate should be MIT');
console.assert(duplicates1[0].year === 2021, 'Duplicate year should be 2021');

// Test: returns empty array when no duplicates exist
const noDuplicateRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2021, rank: 1 },
  { university_name: 'Harvard', year: 2020, rank: 2 }
];
const duplicates2 = checkUniqueness(noDuplicateRecords);
console.assert(duplicates2.length === 0, 'Should find no duplicates');

// Test: handles empty array
console.assert(checkUniqueness([]).length === 0, 'Empty array should return empty array');

// Test: handles null/undefined input
console.assert(checkUniqueness(null).length === 0, 'Null should return empty array');
console.assert(checkUniqueness(undefined).length === 0, 'Undefined should return empty array');

// Test: detects multiple duplicates
const multiDuplicateRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2020, rank: 2 }, // duplicate 1
  { university_name: 'Harvard', year: 2021, rank: 3 },
  { university_name: 'Harvard', year: 2021, rank: 4 }, // duplicate 2
];
const duplicates3 = checkUniqueness(multiDuplicateRecords);
console.assert(duplicates3.length === 2, 'Should detect 2 duplicates');

console.log('Testing detectAnomalies...');

// Test: detects ranking jumps >200 positions
const anomalyRecords = [
  { university_name: 'Harvard', year: 2020, rank: 5 },
  { university_name: 'Harvard', year: 2021, rank: 300 }, // jump of 295
];
const anomalies1 = detectAnomalies(anomalyRecords);
console.assert(anomalies1.length === 1, 'Should detect 1 anomaly');
console.assert(anomalies1[0].university === 'Harvard', 'Anomaly should be Harvard');
console.assert(anomalies1[0].change === 295, 'Change should be 295');

// Test: ignores ranking changes <=200 positions
const noAnomalyRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2021, rank: 150 }, // jump of 149
];
const anomalies2 = detectAnomalies(noAnomalyRecords);
console.assert(anomalies2.length === 0, 'Should find no anomalies for changes <=200');

// Test: detects ranking improvements >200 positions
const improvementRecords = [
  { university_name: 'Stanford', year: 2020, rank: 500 },
  { university_name: 'Stanford', year: 2021, rank: 50 }, // improvement of 450
];
const anomalies3 = detectAnomalies(improvementRecords);
console.assert(anomalies3.length === 1, 'Should detect improvement anomaly');
console.assert(anomalies3[0].change === -450, 'Change should be -450');

// Test: only checks consecutive years
const gapYearRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2022, rank: 300 }, // gap year
];
const anomalies4 = detectAnomalies(gapYearRecords);
console.assert(anomalies4.length === 0, 'Should not detect anomalies for non-consecutive years');

// Test: handles empty array
console.assert(detectAnomalies([]).length === 0, 'Empty array should return empty array');

// Test: handles null/undefined input
console.assert(detectAnomalies(null).length === 0, 'Null should return empty array');
console.assert(detectAnomalies(undefined).length === 0, 'Undefined should return empty array');

// Test: handles records in any order
const unorderedRecords = [
  { university_name: 'MIT', year: 2022, rank: 1 },
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2021, rank: 300 }, // anomaly between 2020-2021 and 2021-2022
];
const anomalies5 = detectAnomalies(unorderedRecords);
console.assert(anomalies5.length === 2, 'Should detect both anomalies regardless of order');
console.assert(anomalies5[0].yearFrom === 2020, 'Should detect correct year from');
console.assert(anomalies5[0].yearTo === 2021, 'Should detect correct year to');

console.log('Testing checkCoverage...');

// Test: identifies universities with <3 years of data
const coverageRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2021, rank: 1 },
  { university_name: 'MIT', year: 2022, rank: 1 },
  { university_name: 'Harvard', year: 2020, rank: 2 }, // only 2 years
  { university_name: 'Harvard', year: 2021, rank: 2 },
];
const coverage1 = checkCoverage(coverageRecords);
console.assert(coverage1.totalUniversities === 2, 'Should count 2 universities');
console.assert(coverage1.sparse.length === 1, 'Should find 1 sparse university');
console.assert(coverage1.sparse[0].university === 'Harvard', 'Harvard should be sparse');
console.assert(coverage1.sparse[0].years === 2, 'Harvard should have 2 years');

// Test: calculates average years per university
const avgRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2021, rank: 1 },
  { university_name: 'Harvard', year: 2020, rank: 2 },
  { university_name: 'Harvard', year: 2021, rank: 2 },
];
const coverage2 = checkCoverage(avgRecords);
console.assert(coverage2.averageYears === 2, 'Average years should be 2');

// Test: handles empty array
const coverage3 = checkCoverage([]);
console.assert(coverage3.totalUniversities === 0, 'Empty should have 0 universities');
console.assert(coverage3.sparse.length === 0, 'Empty should have no sparse');
console.assert(coverage3.averageYears === 0, 'Empty should have 0 average');

// Test: handles null/undefined input
const coverage4 = checkCoverage(null);
console.assert(coverage4.totalUniversities === 0, 'Null should return 0 universities');
const coverage5 = checkCoverage(undefined);
console.assert(coverage5.totalUniversities === 0, 'Undefined should return 0 universities');

// Test: identifies multiple universities with sparse data
const sparseRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'Harvard', year: 2020, rank: 2 },
  { university_name: 'Stanford', year: 2020, rank: 3 },
];
const coverage6 = checkCoverage(sparseRecords);
console.assert(coverage6.sparse.length === 3, 'Should find 3 sparse universities');

console.log('Testing validateRecords...');

// Test: returns comprehensive validation results
const testRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2021, rank: 1 },
  { university_name: 'MIT', year: 2021, rank: 2 }, // duplicate
  { university_name: 'Harvard', year: 2020, rank: 5 },
  { university_name: 'Harvard', year: 2021, rank: 300 }, // anomaly
];
const result1 = validateRecords(testRecords, 'TEST');
console.assert(result1.system === 'TEST', 'System should be TEST');
console.assert(result1.totalRecords === 5, 'Total records should be 5');
console.assert(result1.valid === 4, 'Valid records should be 4');
console.assert(result1.duplicates.length === 1, 'Should have 1 duplicate');
console.assert(result1.anomalies.length === 1, 'Should have 1 anomaly');
console.assert(result1.coverage.totalUniversities === 2, 'Should have 2 universities');

// Test: handles empty array
const result2 = validateRecords([], 'QS');
console.assert(result2.system === 'QS', 'System should be QS');
console.assert(result2.totalRecords === 0, 'Total records should be 0');
console.assert(result2.valid === 0, 'Valid records should be 0');
console.assert(result2.duplicates.length === 0, 'Should have no duplicates');
console.assert(result2.anomalies.length === 0, 'Should have no anomalies');

// Test: handles null/undefined input
const result3 = validateRecords(null, 'THE');
console.assert(result3.totalRecords === 0, 'Null should return 0 records');
console.assert(result3.valid === 0, 'Null should return 0 valid');

// Test: counts valid records correctly (total - duplicates)
const multiDupRecords = [
  { university_name: 'MIT', year: 2020, rank: 1 },
  { university_name: 'MIT', year: 2020, rank: 2 }, // duplicate
  { university_name: 'MIT', year: 2020, rank: 3 }, // duplicate
];
const result4 = validateRecords(multiDupRecords, 'ARWU');
console.assert(result4.totalRecords === 3, 'Total records should be 3');
console.assert(result4.valid === 1, 'Valid records should be 1');
console.assert(result4.duplicates.length === 2, 'Should have 2 duplicates');

console.log('All validator tests passed!');
