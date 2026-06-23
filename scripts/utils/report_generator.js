const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Generate validation report for a ranking system
 * @param {object} validation - Validation results from validator
 * @param {Array} skipped - Skipped records
 * @param {Array} excluded - Excluded records (intentional, e.g., Reporter status)
 * @returns {string} - Formatted report
 */
function generateSystemReport(validation, skipped, excluded = []) {
  const lines = [];

  lines.push(`\n${'═'.repeat(50)}`);
  lines.push(`${validation.system} Rankings`);
  lines.push(`${'═'.repeat(50)}`);
  lines.push(`${chalk.green('✓')} Total records processed: ${validation.totalRecords + skipped.length + excluded.length}`);
  lines.push(`${chalk.green('✓')} Valid records: ${validation.valid}`);

  // Excluded records (intentional)
  if (excluded.length > 0) {
    const byReason = {};
    for (const e of excluded) {
      byReason[e.reason] = (byReason[e.reason] || 0) + 1;
    }
    for (const [reason, count] of Object.entries(byReason)) {
      lines.push(`${chalk.blue('ℹ')} Excluded (${reason}): ${count}`);
    }
  }

  // Skipped records breakdown
  if (skipped.length > 0) {
    const byReason = {};
    for (const s of skipped) {
      byReason[s.reason] = (byReason[s.reason] || 0) + 1;
    }
    for (const [reason, count] of Object.entries(byReason)) {
      lines.push(`${chalk.red('✗')} Skipped (${reason}): ${count}`);
    }
  }

  lines.push(`${chalk.green('✓')} Unique universities: ${validation.coverage.totalUniversities}`);

  // Duplicates
  if (validation.duplicates.length > 0) {
    lines.push(`${chalk.red('✗')} Duplicate records: ${validation.duplicates.length}`);
  }

  // Anomalies
  if (validation.anomalies.length > 0) {
    lines.push(`${chalk.yellow('⚠')} Anomalous rank jumps: ${validation.anomalies.length}`);
  }

  // Coverage
  lines.push(`${chalk.blue('ℹ')} Average years per university: ${validation.coverage.averageYears.toFixed(1)}`);
  if (validation.coverage.sparse.length > 0) {
    lines.push(`${chalk.yellow('⚠')} Universities with sparse data (<3 years): ${validation.coverage.sparse.length}`);
  }

  return lines.join('\n');
}

/**
 * Generate name matching review report
 * @param {object} reviewQueues - { QS: [...], THE: [...], ARWU: [...] }
 * @returns {string} - Formatted report
 */
function generateReviewReport(reviewQueues) {
  const lines = [];

  lines.push(`\n${'═'.repeat(50)}`);
  lines.push('Name Matching Review Required');
  lines.push(`${'═'.repeat(50)}`);

  let totalReviews = 0;
  for (const [system, queue] of Object.entries(reviewQueues)) {
    if (queue.length > 0) {
      totalReviews += queue.length;
      lines.push(`\n${chalk.yellow(system)}: ${queue.length} matches need review`);

      // Show first 10
      const sample = queue.slice(0, 10);
      for (const item of sample) {
        lines.push(`  "${item.original}" → "${item.suggested}" (${(item.confidence * 100).toFixed(0)}% confidence)`);
      }

      if (queue.length > 10) {
        lines.push(`  ... and ${queue.length - 10} more`);
      }
    }
  }

  if (totalReviews === 0) {
    lines.push(`${chalk.green('✓')} No matches need review - all names mapped successfully!`);
  } else {
    lines.push(`\n${chalk.yellow('⚠')} Total requiring review: ${totalReviews}`);
    lines.push(`\nAction: Review name_matches_review.txt and update canonical_names.json`);
  }

  return lines.join('\n');
}

/**
 * Generate complete validation report
 * @param {object} allResults - { QS: {...}, THE: {...}, ARWU: {...} }
 * @param {object} allSkipped - { QS: [...], THE: [...], ARWU: [...] }
 * @param {object} reviewQueues - { QS: [...], THE: [...], ARWU: [...] }
 * @param {object} allExcluded - { QS: [...], THE: [...], ARWU: [...] }
 * @returns {string} - Complete formatted report
 */
function generateValidationReport(allResults, allSkipped, reviewQueues, allExcluded = {}) {
  const lines = [];

  lines.push(chalk.bold('\n📊 DATA VALIDATION REPORT'));
  lines.push(chalk.gray(`Generated: ${new Date().toISOString()}`));

  // Each system
  for (const system of ['QS', 'THE', 'ARWU']) {
    if (allResults[system]) {
      lines.push(generateSystemReport(allResults[system], allSkipped[system] || [], allExcluded[system] || []));
    }
  }

  // Name matching
  lines.push(generateReviewReport(reviewQueues));

  // Summary
  const totalValid = Object.values(allResults).reduce((sum, r) => sum + r.valid, 0);
  const totalSkipped = Object.values(allSkipped).reduce((sum, arr) => sum + arr.length, 0);
  const totalExcluded = Object.values(allExcluded).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  const skipRate = (totalSkipped / (totalValid + totalSkipped) * 100).toFixed(2);

  lines.push(`\n${'═'.repeat(50)}`);
  lines.push('SUMMARY');
  lines.push(`${'═'.repeat(50)}`);
  lines.push(`Total valid records: ${totalValid}`);
  lines.push(`Total excluded (intentional): ${totalExcluded}`);
  lines.push(`Total skipped (errors): ${totalSkipped}`);
  lines.push(`Skip rate: ${skipRate}%`);

  if (parseFloat(skipRate) > 5) {
    lines.push(chalk.red(`\n⚠️  Skip rate exceeds 5% threshold!`));
  } else {
    lines.push(chalk.green(`\n✓ Skip rate within acceptable range (<5%)`));
  }

  return lines.join('\n');
}

/**
 * Write reports to files
 * @param {string} outputDir
 * @param {object} reports - { validation: string, reviewList: Array, anomalies: Array }
 */
function writeReports(outputDir, reports) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Validation report
  fs.writeFileSync(
    path.join(outputDir, 'data_validation_report.txt'),
    reports.validation
  );

  // Review list
  if (reports.reviewList && reports.reviewList.length > 0) {
    const lines = reports.reviewList.map(item =>
      `${item.system} | "${item.original}" | "${item.suggested}" | Confidence: ${(item.confidence * 100).toFixed(0)}%`
    );
    fs.writeFileSync(
      path.join(outputDir, 'name_matches_review.txt'),
      lines.join('\n')
    );
  }

  // Anomalies
  if (reports.anomalies && reports.anomalies.length > 0) {
    const lines = reports.anomalies.map(a =>
      `${a.system} | ${a.university} | ${a.yearFrom}→${a.yearTo} | Rank ${a.rankFrom}→${a.rankTo} | Change: ${a.change > 0 ? '+' : ''}${a.change}`
    );
    fs.writeFileSync(
      path.join(outputDir, 'ranking_anomalies.txt'),
      lines.join('\n')
    );
  }

  console.log(chalk.green(`\n✓ Reports written to ${outputDir}/`));
}

module.exports = {
  generateValidationReport,
  generateSystemReport,
  generateReviewReport,
  writeReports
};
