#!/usr/bin/env node

const chalk = require('chalk');
const { parseQS } = require('./parsers/parse_qs');
const { parseTHE } = require('./parsers/parse_the');
const { parseARWU } = require('./parsers/parse_arwu');
const { validateRecords } = require('./utils/validator');
const { generateValidationReport, writeReports } = require('./utils/report_generator');
const { writeCleanedCSV } = require('./utils/csv_writer');
const canonicalDict = require('./config/canonical_names.json');

const OUTPUT_DIR = 'scripts/output';

async function main() {
  console.log(chalk.bold.blue('\n🎓 University Rankings Data Cleaning Pipeline\n'));

  const startTime = Date.now();

  try {
    // Parse each ranking system
    console.log(chalk.yellow('📖 Parsing QS rankings...'));
    const qsData = await parseQS(canonicalDict);
    console.log(chalk.green(`✓ QS: ${qsData.records.length} records, ${qsData.skipped.length} skipped`));

    console.log(chalk.yellow('\n📖 Parsing THE rankings...'));
    const theData = await parseTHE(canonicalDict);
    console.log(chalk.green(`✓ THE: ${theData.records.length} records, ${theData.skipped.length} skipped`));

    console.log(chalk.yellow('\n📖 Parsing ARWU rankings...'));
    const arwuData = await parseARWU(canonicalDict);
    console.log(chalk.green(`✓ ARWU: ${arwuData.records.length} records, ${arwuData.skipped.length} skipped`));

    // Validate data
    console.log(chalk.yellow('\n🔍 Validating data quality...'));
    const qsValidation = validateRecords(qsData.records, 'QS');
    const theValidation = validateRecords(theData.records, 'THE');
    const arwuValidation = validateRecords(arwuData.records, 'ARWU');

    // Generate reports
    console.log(chalk.yellow('\n📝 Generating reports...'));
    const allResults = { QS: qsValidation, THE: theValidation, ARWU: arwuValidation };
    const allSkipped = { QS: qsData.skipped, THE: theData.skipped, ARWU: arwuData.skipped };
    const reviewQueues = { QS: qsData.reviewQueue, THE: theData.reviewQueue, ARWU: arwuData.reviewQueue };

    const validationReport = generateValidationReport(allResults, allSkipped, reviewQueues);
    console.log(validationReport);

    // Collect all items needing review
    const allReviewItems = [];
    for (const [system, queue] of Object.entries(reviewQueues)) {
      for (const item of queue) {
        allReviewItems.push({ system, ...item });
      }
    }

    // Collect all anomalies
    const allAnomalies = [];
    for (const [system, validation] of Object.entries(allResults)) {
      for (const anomaly of validation.anomalies) {
        allAnomalies.push({ system, ...anomaly });
      }
    }

    // Write reports
    writeReports(OUTPUT_DIR, {
      validation: validationReport,
      reviewList: allReviewItems,
      anomalies: allAnomalies
    });

    // Write cleaned CSV files
    console.log(chalk.yellow('\n💾 Writing cleaned CSV files...'));
    await writeCleanedCSV(qsData.records, `${OUTPUT_DIR}/cleaned_qs_rankings.csv`);
    await writeCleanedCSV(theData.records, `${OUTPUT_DIR}/cleaned_the_rankings.csv`);
    await writeCleanedCSV(arwuData.records, `${OUTPUT_DIR}/cleaned_arwu_rankings.csv`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.bold.green(`\n✨ Pipeline completed in ${duration}s\n`));

    // Check if review needed
    if (allReviewItems.length > 0) {
      console.log(chalk.yellow('⚠️  ACTION REQUIRED:'));
      console.log(chalk.yellow(`   ${allReviewItems.length} university names need manual review`));
      console.log(chalk.yellow(`   Review ${OUTPUT_DIR}/name_matches_review.txt`));
      console.log(chalk.yellow(`   Update scripts/config/canonical_names.json`));
      console.log(chalk.yellow(`   Re-run: npm run clean-data\n`));
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Pipeline failed:'), error);
    process.exit(1);
  }
}

main();
