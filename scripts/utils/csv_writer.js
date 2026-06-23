const fs = require('fs');
const { format } = require('@fast-csv/format');

/**
 * Write cleaned records to CSV file
 * @param {Array} records - Array of cleaned records
 * @param {string} outputPath - Output file path
 * @returns {Promise<void>}
 */
async function writeCleanedCSV(records, outputPath) {
  return new Promise((resolve, reject) => {
    const stream = format({ headers: true });
    const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

    stream.pipe(writeStream);

    // Sort records by university name, then year
    const sorted = records.slice().sort((a, b) => {
      if (a.university_name !== b.university_name) {
        return a.university_name.localeCompare(b.university_name);
      }
      return a.year - b.year;
    });

    // Write records
    for (const record of sorted) {
      stream.write({
        university_name: record.university_name,
        year: record.year,
        rank: record.rank,
        rank_display: record.rank_display,
        is_range: record.is_range
      });
    }

    stream.end();

    writeStream.on('finish', () => {
      console.log(`✓ Written ${records.length} records to ${outputPath}`);
      resolve();
    });

    writeStream.on('error', reject);
    stream.on('error', reject);
  });
}

module.exports = { writeCleanedCSV };
