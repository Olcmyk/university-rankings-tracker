import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csvParser from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Export helper functions for testing
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseCSVLine(line) {
  const [universityName, year, rank, displayRank, isRange] = line.split(',');
  return {
    universityName,
    year: parseInt(year, 10),
    rank: parseFloat(rank),
    displayRank,
    isRange: isRange === 'true'
  };
}

export function groupByUniversity(records) {
  const grouped = {};
  for (const record of records) {
    if (!grouped[record.universityName]) {
      grouped[record.universityName] = [];
    }
    grouped[record.universityName].push(record);
  }
  return grouped;
}

// Read CSV file and return records
function readCSV(filePath, systemName) {
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        records.push({
          universityName: row.university_name,
          year: parseInt(row.year, 10),
          rank: parseFloat(row.rank),
          displayRank: row.rank_display,
          system: systemName
        });
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

// Get year range from records
function getYearRange(records) {
  const years = records.map(r => r.year);
  return [Math.min(...years), Math.max(...years)];
}

// Main processing function
async function processData() {
  console.log('Starting data processing...');

  const inputDir = path.join(__dirname, 'output');
  const outputDir = path.join(__dirname, '..', 'public', 'data');

  // Read all three CSV files
  const [qsRecords, theRecords, arwuRecords] = await Promise.all([
    readCSV(path.join(inputDir, 'cleaned_qs_rankings.csv'), 'qs'),
    readCSV(path.join(inputDir, 'cleaned_the_rankings.csv'), 'the'),
    readCSV(path.join(inputDir, 'cleaned_arwu_rankings.csv'), 'arwu')
  ]);

  const allRecords = [...qsRecords, ...theRecords, ...arwuRecords];
  console.log(`✅ Processed ${allRecords.length} records`);

  // Group by university
  const universityMap = new Map();

  for (const record of allRecords) {
    if (!universityMap.has(record.universityName)) {
      universityMap.set(record.universityName, {
        id: slugify(record.universityName),
        name: record.universityName,
        rankings: {
          qs: [],
          the: [],
          arwu: []
        }
      });
    }

    const university = universityMap.get(record.universityName);
    university.rankings[record.system].push({
      year: record.year,
      rank: record.rank,
      displayRank: record.displayRank
    });
  }

  // Sort rankings by year and universities alphabetically
  const universities = Array.from(universityMap.values())
    .map(uni => ({
      ...uni,
      rankings: {
        qs: uni.rankings.qs.sort((a, b) => a.year - b.year),
        the: uni.rankings.the.sort((a, b) => a.year - b.year),
        arwu: uni.rankings.arwu.sort((a, b) => a.year - b.year)
      }
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`✅ Generated data for ${universities.length} universities`);

  // Build metadata
  const metadata = {
    totalUniversities: universities.length,
    dateGenerated: new Date().toISOString(),
    rankingSystems: {
      qs: {
        fullName: 'QS World University Rankings',
        years: getYearRange(qsRecords)
      },
      the: {
        fullName: 'Times Higher Education World University Rankings',
        years: getYearRange(theRecords)
      },
      arwu: {
        fullName: 'Academic Ranking of World Universities',
        years: getYearRange(arwuRecords)
      }
    }
  };

  // Create output
  const output = {
    universities,
    metadata
  };

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON file
  const outputPath = path.join(outputDir, 'rankings.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  const stats = fs.statSync(outputPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);

  console.log(`✅ Output written to ${outputPath}`);
  console.log(`✅ File size: ${fileSizeMB} MB`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processData().catch(error => {
    console.error('Error processing data:', error);
    process.exit(1);
  });
}
