# University Rankings Data Cleaning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean and standardize university ranking data from QS, THE, and ARWU systems into three unified CSV files with consistent formatting and validated data quality.

**Architecture:** Node.js script-based pipeline that reads multiple CSV files, standardizes university names across systems using fuzzy matching and manual review, parses various ranking formats, validates data integrity, and outputs three clean CSV files with comprehensive quality reports.

**Tech Stack:** Node.js, papaparse (CSV parsing), fast-csv (CSV writing), string-similarity (fuzzy matching), chalk (console output)

## Global Constraints

- Node.js version >= 16.0.0
- Output CSV encoding: UTF-8
- University names must use English canonical forms
- All rank values must be positive numbers
- No duplicate (university, year) pairs within each output file
- Validation report must show <5% skipped records
- All name matching conflicts must be resolved before final output

---

### Task 1: Project Setup and Dependencies

**Files:**
- Create: `package.json`
- Create: `scripts/clean_data.js`
- Create: `.gitignore`

**Interfaces:**
- Produces: Node.js project with installed dependencies

- [ ] **Step 1: Initialize Node.js project**

```bash
cd /Users/booffaoex/code/university_candles
npm init -y
```

Expected: `package.json` created

- [ ] **Step 2: Install dependencies**

```bash
npm install papaparse fast-csv string-similarity chalk
```

Expected: Dependencies installed, `node_modules/` and `package-lock.json` created

- [ ] **Step 3: Create .gitignore**

```bash
cat > .gitignore << 'EOF'
node_modules/
scripts/output/
*.log
.DS_Store
EOF
```

- [ ] **Step 4: Update package.json scripts**

```bash
npm pkg set scripts.clean-data="node scripts/clean_data.js"
```

Expected: package.json now has `"clean-data"` script

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p scripts/{parsers,utils,config,output}
```

Expected: Directory structure created

- [ ] **Step 6: Verify setup**

```bash
ls -la scripts/
npm list --depth=0
```

Expected: Directories exist, all 4 dependencies listed


---

### Task 2: Rank Parser Utility

**Files:**
- Create: `scripts/utils/rank_parser.js`
- Create: `scripts/utils/rank_parser.test.js`

**Interfaces:**
- Consumes: None (pure utility)
- Produces: `parseRank(value: string): { rank: number, rank_display: string, is_range: boolean } | null`

- [ ] **Step 1: Write failing tests**

Create `scripts/utils/rank_parser.test.js`:

```javascript
const { parseRank } = require('./rank_parser');

// Test exact ranks
console.assert(JSON.stringify(parseRank('1')) === JSON.stringify({ rank: 1, rank_display: '1', is_range: false }), 'Exact rank 1 failed');
console.assert(JSON.stringify(parseRank('#50')) === JSON.stringify({ rank: 50, rank_display: '50', is_range: false }), 'Rank with # failed');
console.assert(JSON.stringify(parseRank('1st')) === JSON.stringify({ rank: 1, rank_display: '1', is_range: false }), 'Rank with ordinal failed');

// Test range ranks
console.assert(JSON.stringify(parseRank('201-250')) === JSON.stringify({ rank: 225.5, rank_display: '201-250', is_range: true }), 'Range rank failed');
console.assert(JSON.stringify(parseRank('201 - 250')) === JSON.stringify({ rank: 225.5, rank_display: '201 - 250', is_range: true }), 'Range with spaces failed');

// Test open-ended
console.assert(JSON.stringify(parseRank('501+')) === JSON.stringify({ rank: 501, rank_display: '501+', is_range: true }), 'Open-ended rank failed');

// Test invalid
console.assert(parseRank('') === null, 'Empty string should return null');
console.assert(parseRank('NR') === null, 'Not Ranked should return null');
console.assert(parseRank('N/A') === null, 'N/A should return null');

console.log('All tests defined');
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node scripts/utils/rank_parser.test.js
```

Expected: Error "Cannot find module './rank_parser'"

- [ ] **Step 3: Implement rank parser**

Create `scripts/utils/rank_parser.js`:

```javascript
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
  
  // Remove common prefixes and ordinal suffixes
  cleaned = cleaned.replace(/^[=#]+/, '').replace(/[stndrd]+$/gi, '').trim();
  
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node scripts/utils/rank_parser.test.js
```

Expected: "All tests defined" (no assertion errors)

- [ ] **Step 5: Test edge cases manually**

```bash
node -e "const {parseRank} = require('./scripts/utils/rank_parser'); console.log(parseRank('=50')); console.log(parseRank('  201-250  ')); console.log(parseRank('0'));"
```

Expected: Should handle = prefix, whitespace, and zero rank

---

### Task 3: Name Standardizer Utility

**Files:**
- Create: `scripts/utils/name_standardizer.js`
- Create: `scripts/config/canonical_names.json`

**Interfaces:**
- Consumes: None initially (config file created empty)
- Produces: 
  - `cleanName(rawName: string): string` - Basic cleaning
  - `standardizeName(rawName: string, canonicalDict: object): { canonical: string, confidence: number, needsReview: boolean }`

- [ ] **Step 1: Create empty canonical names config**

Create `scripts/config/canonical_names.json`:

```json
{
  "_comment": "Canonical university names mapping. Format: 'Canonical Name': ['alias1', 'alias2']",
  "Massachusetts Institute of Technology": [
    "MIT",
    "Massachusetts Institute of Technology (MIT)"
  ],
  "Harvard University": [
    "Harvard"
  ]
}
```

- [ ] **Step 2: Write name standardizer implementation**

Create `scripts/utils/name_standardizer.js`:

```javascript
const stringSimilarity = require('string-similarity');

/**
 * Basic name cleaning - removes extra spaces, special chars, standardizes punctuation
 * @param {string} rawName
 * @returns {string}
 */
function cleanName(rawName) {
  if (!rawName) return '';
  
  return rawName
    .trim()
    .replace(/\s+/g, ' ')           // Multiple spaces to single
    .replace(/[\t\n\r]/g, '')       // Remove control chars
    .replace(/\s*,\s*/g, ', ')      // Standardize comma spacing
    .replace(/\s*-\s*/g, '-');      // Standardize hyphen spacing
}

/**
 * Extract abbreviation from parentheses
 * @param {string} name - e.g., "Massachusetts Institute of Technology (MIT)"
 * @returns {string|null} - e.g., "MIT" or null
 */
function extractAbbreviation(name) {
  const match = name.match(/\(([^)]+)\)$/);
  return match ? match[1].trim() : null;
}

/**
 * Standardize university name using canonical dictionary
 * @param {string} rawName
 * @param {object} canonicalDict - { "Canonical Name": ["alias1", "alias2"] }
 * @returns {{ canonical: string, confidence: number, needsReview: boolean }}
 */
function standardizeName(rawName, canonicalDict) {
  const cleaned = cleanName(rawName);
  
  if (!cleaned) {
    return { canonical: '', confidence: 0, needsReview: true };
  }
  
  // Step 1: Exact match in canonical names
  if (canonicalDict[cleaned]) {
    return { canonical: cleaned, confidence: 1.0, needsReview: false };
  }
  
  // Step 2: Exact match in aliases
  for (const [canonical, aliases] of Object.entries(canonicalDict)) {
    if (aliases && aliases.includes(cleaned)) {
      return { canonical, confidence: 1.0, needsReview: false };
    }
  }
  
  // Step 3: Fuzzy match against canonical names
  const canonicalNames = Object.keys(canonicalDict);
  if (canonicalNames.length > 0) {
    const matches = stringSimilarity.findBestMatch(cleaned, canonicalNames);
    const bestMatch = matches.bestMatch;
    
    // High confidence auto-match (>=90%)
    if (bestMatch.rating >= 0.90) {
      return { canonical: bestMatch.target, confidence: bestMatch.rating, needsReview: false };
    }
    
    // Medium confidence needs review (80-90%)
    if (bestMatch.rating >= 0.80) {
      return { canonical: bestMatch.target, confidence: bestMatch.rating, needsReview: true };
    }
  }
  
  // Step 4: No good match found
  return { canonical: cleaned, confidence: 0, needsReview: true };
}

module.exports = {
  cleanName,
  extractAbbreviation,
  standardizeName
};
```

- [ ] **Step 3: Test name standardizer manually**

```bash
node -e "
const {cleanName, standardizeName} = require('./scripts/utils/name_standardizer');
const dict = require('./scripts/config/canonical_names.json');
console.log(cleanName('  MIT  '));
console.log(standardizeName('MIT', dict));
console.log(standardizeName('Harvard', dict));
console.log(standardizeName('Some Unknown University', dict));
"
```

Expected: Clean outputs, MIT maps to full name, Harvard maps correctly, unknown flagged for review

---

### Task 4: ARWU Parser

**Files:**
- Create: `scripts/parsers/parse_arwu.js`

**Interfaces:**
- Consumes: 
  - `parseRank(value)` from rank_parser.js
  - `standardizeName(name, dict)` from name_standardizer.js
- Produces: `parseARWU(canonicalDict): Promise<Array<{ university_name, year, rank, rank_display, is_range }>>`

- [ ] **Step 1: Write ARWU parser implementation**

Create `scripts/parsers/parse_arwu.js`:

```javascript
const fs = require('fs');
const papa = require('papaparse');
const { parseRank } = require('../utils/rank_parser');
const { standardizeName } = require('../utils/name_standardizer');

/**
 * Parse ARWU/Shanghai Rankings data
 * @param {object} canonicalDict - Canonical names dictionary
 * @returns {Promise<Array>} - Array of cleaned records
 */
async function parseARWU(canonicalDict) {
  const filePath = 'arwu_all_years_combined_2003-2025.csv';
  
  return new Promise((resolve, reject) => {
    const records = [];
    const skipped = [];
    const reviewQueue = [];
    
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
          
          // Standardize name
          const nameData = standardizeName(rawName, canonicalDict);
          if (!nameData.canonical) {
            skipped.push({ reason: 'missing_name', row });
            continue;
          }
          
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
```

- [ ] **Step 2: Test ARWU parser**

```bash
node -e "
const {parseARWU} = require('./scripts/parsers/parse_arwu');
const dict = require('./scripts/config/canonical_names.json');
parseARWU(dict).then(result => {
  console.log('Records:', result.records.length);
  console.log('Skipped:', result.skipped.length);
  console.log('Need review:', result.reviewQueue.length);
  console.log('Sample:', result.records[0]);
});
"
```

Expected: Shows counts and sample record from ARWU data

---

### Task 5: THE Parser

**Files:**
- Create: `scripts/parsers/parse_the.js`

**Interfaces:**
- Consumes: 
  - `parseRank(value)` from rank_parser.js
  - `standardizeName(name, dict)` from name_standardizer.js
- Produces: `parseTHE(canonicalDict): Promise<Array<{ university_name, year, rank, rank_display, is_range }>>`

- [ ] **Step 1: Write THE parser implementation**

Create `scripts/parsers/parse_the.js`:

```javascript
const fs = require('fs');
const path = require('path');
const papa = require('papaparse');
const { parseRank } = require('../utils/rank_parser');
const { standardizeName } = require('../utils/name_standardizer');

/**
 * Parse Times Higher Education Rankings data
 * @param {object} canonicalDict - Canonical names dictionary
 * @returns {Promise<Array>} - Array of cleaned records
 */
async function parseTHE(canonicalDict) {
  const baseDir = 'times2011-2026/outputs/csv';
  const records = [];
  const skipped = [];
  const reviewQueue = new Map(); // Use Map to deduplicate review entries
  
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
            
            // Standardize name
            const nameData = standardizeName(rawName, canonicalDict);
            if (!nameData.canonical) {
              skipped.push({ reason: 'missing_name', file, row });
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
    reviewQueue: Array.from(reviewQueue.values())
  };
}

module.exports = { parseTHE };
```

- [ ] **Step 2: Test THE parser**

```bash
node -e "
const {parseTHE} = require('./scripts/parsers/parse_the');
const dict = require('./scripts/config/canonical_names.json');
parseTHE(dict).then(result => {
  console.log('Records:', result.records.length);
  console.log('Skipped:', result.skipped.length);
  console.log('Need review:', result.reviewQueue.length);
  console.log('Sample:', result.records[0]);
});
"
```

Expected: Shows counts and sample record from THE data

---

### Task 6: QS Parser

**Files:**
- Create: `scripts/parsers/parse_qs.js`

**Interfaces:**
- Consumes: 
  - `parseRank(value)` from rank_parser.js
  - `standardizeName(name, dict)` from name_standardizer.js
- Produces: `parseQS(canonicalDict): Promise<Array<{ university_name, year, rank, rank_display, is_range }>>`

- [ ] **Step 1: Write QS parser implementation**

Create `scripts/parsers/parse_qs.js`:

```javascript
const fs = require('fs');
const papa = require('papaparse');
const XLSX = require('xlsx');
const { parseRank } = require('../utils/rank_parser');
const { standardizeName } = require('../utils/name_standardizer');

/**
 * Parse QS Rankings data from multiple files with varying formats
 * @param {object} canonicalDict - Canonical names dictionary
 * @returns {Promise<Array>} - Array of cleaned records
 */
async function parseQS(canonicalDict) {
  const records = [];
  const skipped = [];
  const reviewQueue = new Map();
  
  // File 1: 2017-2022 combined (has year column)
  await parseQSFile({
    path: 'qs-world-university-rankings-2017-to-2022-V2.csv',
    nameCol: 'university',
    rankCol: 'rank_display',
    yearCol: 'year',
    records, skipped, reviewQueue, canonicalDict
  });
  
  // File 2: 2023
  await parseQSFile({
    path: '2023 QS World University Rankings.csv',
    nameCol: 'institution',
    rankCol: 'Rank',
    year: 2023,
    records, skipped, reviewQueue, canonicalDict
  });
  
  // File 3: 2024
  await parseQSFile({
    path: '2024 QS World University Rankings 1.1 (For qs.com).csv',
    nameCol: 'Institution Name',
    rankCol: '2024 RANK',
    year: 2024,
    records, skipped, reviewQueue, canonicalDict
  });
  
  // File 4: 2025
  await parseQSFile({
    path: 'qs-world-rankings-2025.csv',
    nameCol: 'Institution Name',
    rankCol: '2025 Rank',
    year: 2025,
    records, skipped, reviewQueue, canonicalDict
  });
  
  // File 5: 2026
  await parseQSFile({
    path: '2026_QS_World University_Rankings.csv',
    nameCol: 'Name',
    rankCol: 'Rank',
    year: 2026,
    records, skipped, reviewQueue, canonicalDict
  });
  
  // File 6: 2027 (XLSX format)
  await parseQSXLSX({
    path: '2027 QS World University Rankings 1.1 (For qs.com).xlsx',
    year: 2027,
    records, skipped, reviewQueue, canonicalDict
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
async function parseQSFile({ path, nameCol, rankCol, yearCol, year, records, skipped, reviewQueue, canonicalDict }) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(path, 'utf8');
    
    papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        for (const row of results.data) {
          const rawName = row[nameCol];
          const rawRank = row[rankCol];
          const recordYear = yearCol ? parseInt(row[yearCol]) : year;
          
          // Validate year
          if (!recordYear || recordYear < 2017 || recordYear > 2027) {
            skipped.push({ reason: 'invalid_year', file: path, row });
            continue;
          }
          
          // Parse rank
          const rankData = parseRank(rawRank);
          if (!rankData) {
            skipped.push({ reason: 'invalid_rank', file: path, row });
            continue;
          }
          
          // Standardize name
          const nameData = standardizeName(rawName, canonicalDict);
          if (!nameData.canonical) {
            skipped.push({ reason: 'missing_name', file: path, row });
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
async function parseQSXLSX({ path, year, records, skipped, reviewQueue, canonicalDict }) {
  const workbook = XLSX.readFile(path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Skip header rows (first 3 rows are headers/notes)
  const headers = data[2]; // Row 3 should be column headers
  const nameColIdx = headers.findIndex(h => h && h.includes('Institution'));
  const rankColIdx = headers.findIndex(h => h && (h.includes('Rank') || h.includes('2027')));
  
  if (nameColIdx === -1 || rankColIdx === -1) {
    throw new Error(`Cannot find name or rank columns in ${path}`);
  }
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const rawName = row[nameColIdx];
    const rawRank = row[rankColIdx];
    
    if (!rawName) continue;
    
    const rankData = parseRank(rawRank);
    if (!rankData) {
      skipped.push({ reason: 'invalid_rank', file: path, row });
      continue;
    }
    
    const nameData = standardizeName(rawName, canonicalDict);
    if (!nameData.canonical) {
      skipped.push({ reason: 'missing_name', file: path, row });
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
```

- [ ] **Step 2: Install XLSX library for Excel support**

```bash
npm install xlsx
```

- [ ] **Step 3: Test QS parser**

```bash
node -e "
const {parseQS} = require('./scripts/parsers/parse_qs');
const dict = require('./scripts/config/canonical_names.json');
parseQS(dict).then(result => {
  console.log('Records:', result.records.length);
  console.log('Skipped:', result.skipped.length);
  console.log('Need review:', result.reviewQueue.length);
  console.log('Sample:', result.records[0]);
});
"
```

Expected: Shows counts and sample record from QS data


---

### Task 7: Data Validator

**Files:**
- Create: `scripts/utils/validator.js`

**Interfaces:**
- Consumes: Array of records from parsers
- Produces: 
  - `validateRecords(records, system): { valid, duplicates, anomalies, coverage }`
  - `checkUniqueness(records): Array<duplicates>`
  - `detectAnomalies(records): Array<anomalies>`

- [ ] **Step 1: Write validator implementation**

Create `scripts/utils/validator.js`:

```javascript
/**
 * Validate cleaned records for data quality issues
 */

/**
 * Check for duplicate (university, year) pairs
 * @param {Array} records
 * @returns {Array} - Array of duplicate records
 */
function checkUniqueness(records) {
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
  
  return {
    totalUniversities: Object.keys(byUniversity).length,
    sparse: sparse,
    averageYears: records.length / Object.keys(byUniversity).length
  };
}

/**
 * Validate all records
 * @param {Array} records
 * @param {string} system - 'QS', 'THE', or 'ARWU'
 * @returns {object} - Validation results
 */
function validateRecords(records, system) {
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
```

- [ ] **Step 2: Test validator**

```bash
node -e "
const {validateRecords} = require('./scripts/utils/validator');
const testRecords = [
  { university_name: 'MIT', year: 2020, rank: 1, rank_display: '1', is_range: false },
  { university_name: 'MIT', year: 2021, rank: 1, rank_display: '1', is_range: false },
  { university_name: 'MIT', year: 2021, rank: 2, rank_display: '2', is_range: false }, // duplicate
  { university_name: 'Harvard', year: 2020, rank: 5, rank_display: '5', is_range: false },
  { university_name: 'Harvard', year: 2021, rank: 300, rank_display: '300', is_range: false }, // anomaly
];
const result = validateRecords(testRecords, 'TEST');
console.log('Duplicates:', result.duplicates.length);
console.log('Anomalies:', result.anomalies.length);
console.log(JSON.stringify(result, null, 2));
"
```

Expected: Shows 1 duplicate and 1 anomaly detected

---

### Task 8: Report Generator

**Files:**
- Create: `scripts/utils/report_generator.js`

**Interfaces:**
- Consumes: Validation results, review queues, skipped records
- Produces: 
  - `generateValidationReport(results): string`
  - `generateReviewReport(reviewQueues): string`
  - `writeReports(outputDir, reports): void`

- [ ] **Step 1: Write report generator implementation**

Create `scripts/utils/report_generator.js`:

```javascript
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Generate validation report for a ranking system
 * @param {object} validation - Validation results from validator
 * @param {Array} skipped - Skipped records
 * @returns {string} - Formatted report
 */
function generateSystemReport(validation, skipped) {
  const lines = [];
  
  lines.push(`\n${'═'.repeat(50)}`);
  lines.push(`${validation.system} Rankings`);
  lines.push(`${'═'.repeat(50)}`);
  lines.push(`${chalk.green('✓')} Total records processed: ${validation.totalRecords + skipped.length}`);
  lines.push(`${chalk.green('✓')} Valid records: ${validation.valid}`);
  
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
 * @returns {string} - Complete formatted report
 */
function generateValidationReport(allResults, allSkipped, reviewQueues) {
  const lines = [];
  
  lines.push(chalk.bold('\n📊 DATA VALIDATION REPORT'));
  lines.push(chalk.gray(`Generated: ${new Date().toISOString()}`));
  
  // Each system
  for (const system of ['QS', 'THE', 'ARWU']) {
    if (allResults[system]) {
      lines.push(generateSystemReport(allResults[system], allSkipped[system] || []));
    }
  }
  
  // Name matching
  lines.push(generateReviewReport(reviewQueues));
  
  // Summary
  const totalValid = Object.values(allResults).reduce((sum, r) => sum + r.valid, 0);
  const totalSkipped = Object.values(allSkipped).reduce((sum, arr) => sum + arr.length, 0);
  const skipRate = (totalSkipped / (totalValid + totalSkipped) * 100).toFixed(2);
  
  lines.push(`\n${'═'.repeat(50)}`);
  lines.push('SUMMARY');
  lines.push(`${'═'.repeat(50)}`);
  lines.push(`Total valid records: ${totalValid}`);
  lines.push(`Total skipped: ${totalSkipped}`);
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
```

- [ ] **Step 2: Test report generator**

```bash
node -e "
const {generateValidationReport} = require('./scripts/utils/report_generator');
const mockResults = {
  QS: { system: 'QS', totalRecords: 100, valid: 98, duplicates: [], anomalies: [{university: 'Test', yearFrom: 2020, yearTo: 2021, rankFrom: 5, rankTo: 500, change: 495}], coverage: { totalUniversities: 50, sparse: [], averageYears: 2 } },
  THE: { system: 'THE', totalRecords: 200, valid: 195, duplicates: [], anomalies: [], coverage: { totalUniversities: 100, sparse: [], averageYears: 2 } },
  ARWU: { system: 'ARWU', totalRecords: 300, valid: 298, duplicates: [], anomalies: [], coverage: { totalUniversities: 150, sparse: [], averageYears: 2 } }
};
const mockSkipped = { QS: [{reason: 'invalid_rank'}], THE: [], ARWU: [{reason: 'missing_name'}, {reason: 'invalid_year'}] };
const mockReview = { QS: [], THE: [{original: 'MIT', suggested: 'Massachusetts Institute of Technology', confidence: 0.85}], ARWU: [] };
console.log(generateValidationReport(mockResults, mockSkipped, mockReview));
"
```

Expected: Displays formatted validation report with color coding

---

### Task 9: CSV Writer

**Files:**
- Create: `scripts/utils/csv_writer.js`

**Interfaces:**
- Consumes: Array of cleaned records
- Produces: `writeCleanedCSV(records, outputPath): Promise<void>`

- [ ] **Step 1: Write CSV writer implementation**

Create `scripts/utils/csv_writer.js`:

```javascript
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
    const writeStream = fs.createWriteStream(outputPath);
    
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
  });
}

module.exports = { writeCleanedCSV };
```

- [ ] **Step 2: Test CSV writer**

```bash
node -e "
const {writeCleanedCSV} = require('./scripts/utils/csv_writer');
const testRecords = [
  { university_name: 'MIT', year: 2020, rank: 1, rank_display: '1', is_range: false },
  { university_name: 'Harvard University', year: 2020, rank: 5, rank_display: '5', is_range: false }
];
writeCleanedCSV(testRecords, 'scripts/output/test_output.csv').then(() => {
  const fs = require('fs');
  console.log(fs.readFileSync('scripts/output/test_output.csv', 'utf8'));
});
"
```

Expected: Creates test CSV file and displays its contents

---

### Task 10: Main Orchestration Script

**Files:**
- Create: `scripts/clean_data.js`

**Interfaces:**
- Consumes: All parsers, validator, report generator, CSV writer
- Produces: Complete data cleaning pipeline

- [ ] **Step 1: Write main orchestration script**

Create `scripts/clean_data.js`:

```javascript
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
```

- [ ] **Step 2: Make script executable**

```bash
chmod +x scripts/clean_data.js
```

- [ ] **Step 3: Run the complete pipeline**

```bash
npm run clean-data
```

Expected: Complete pipeline runs, processes all data, generates reports and CSV files

- [ ] **Step 4: Review output files**

```bash
ls -lh scripts/output/
head -20 scripts/output/cleaned_qs_rankings.csv
cat scripts/output/data_validation_report.txt
```

Expected: Three cleaned CSV files, validation report, and potentially review/anomaly files

- [ ] **Step 5: Check if manual review needed**

If `name_matches_review.txt` exists:

```bash
cat scripts/output/name_matches_review.txt
```

Review the name matches, then update `scripts/config/canonical_names.json` with confirmed mappings.

- [ ] **Step 6: Iterative refinement**

If manual review was needed:
1. Update `scripts/config/canonical_names.json` with approved name mappings
2. Re-run: `npm run clean-data`
3. Repeat until `name_matches_review.txt` is empty

---

### Task 11: Quality Verification

**Files:**
- None (manual verification steps)

**Interfaces:**
- Consumes: All output files from Task 10
- Produces: Verified, production-ready cleaned data

- [ ] **Step 1: Verify file generation**

```bash
ls -lh scripts/output/
```

Expected output:
- `cleaned_qs_rankings.csv` (exists, size > 0)
- `cleaned_the_rankings.csv` (exists, size > 0)
- `cleaned_arwu_rankings.csv` (exists, size > 0)
- `data_validation_report.txt` (exists)

- [ ] **Step 2: Verify data structure**

```bash
head -5 scripts/output/cleaned_qs_rankings.csv
head -5 scripts/output/cleaned_the_rankings.csv
head -5 scripts/output/cleaned_arwu_rankings.csv
```

Expected: Each file has header row with columns: `university_name,year,rank,rank_display,is_range`

- [ ] **Step 3: Verify no duplicates**

```bash
# Check QS for duplicates
awk -F, 'NR>1 {print $1","$2}' scripts/output/cleaned_qs_rankings.csv | sort | uniq -d
```

Expected: No output (no duplicates)

Repeat for THE and ARWU files.

- [ ] **Step 4: Sample top universities**

```bash
grep -E "(Harvard|MIT|Stanford|Oxford|Cambridge)" scripts/output/cleaned_qs_rankings.csv | head -10
grep -E "(Harvard|MIT|Stanford|Oxford|Cambridge)" scripts/output/cleaned_the_rankings.csv | head -10
grep -E "(Harvard|MIT|Stanford|Oxford|Cambridge)" scripts/output/cleaned_arwu_rankings.csv | head -10
```

Expected: Famous universities appear with consistent naming across all three files

- [ ] **Step 5: Verify cross-system name consistency**

```bash
# Extract unique university names from each system
awk -F, 'NR>1 {print $1}' scripts/output/cleaned_qs_rankings.csv | sort -u > /tmp/qs_names.txt
awk -F, 'NR>1 {print $1}' scripts/output/cleaned_the_rankings.csv | sort -u > /tmp/the_names.txt
awk -F, 'NR>1 {print $1}' scripts/output/cleaned_arwu_rankings.csv | sort -u > /tmp/arwu_names.txt

# Find common universities
comm -12 /tmp/qs_names.txt /tmp/the_names.txt | head -20
```

Expected: Same university names appear identically across systems

- [ ] **Step 6: Verify year ranges**

```bash
# QS: should be 2017-2027
awk -F, 'NR>1 {print $2}' scripts/output/cleaned_qs_rankings.csv | sort -u

# THE: should be 2011-2026
awk -F, 'NR>1 {print $2}' scripts/output/cleaned_the_rankings.csv | sort -u

# ARWU: should be 2003-2025
awk -F, 'NR>1 {print $2}' scripts/output/cleaned_arwu_rankings.csv | sort -u
```

Expected: Year ranges match specifications

- [ ] **Step 7: Verify rank values are positive**

```bash
# Check for negative or zero ranks
awk -F, 'NR>1 && $3 <= 0 {print}' scripts/output/cleaned_qs_rankings.csv
```

Expected: No output (all ranks are positive)

Repeat for THE and ARWU files.

- [ ] **Step 8: Review validation report**

```bash
cat scripts/output/data_validation_report.txt
```

Expected:
- Skip rate < 5%
- No duplicates
- Anomalies documented (if any)
- No items in review queue

- [ ] **Step 9: Spot check range ranks**

```bash
grep "true" scripts/output/cleaned_qs_rankings.csv | head -5
```

Expected: Records with `is_range=true` have rank values that are midpoints (e.g., 225.5 for "201-250")

- [ ] **Step 10: Generate summary statistics**

```bash
echo "QS: $(wc -l < scripts/output/cleaned_qs_rankings.csv) total lines, $(($(wc -l < scripts/output/cleaned_qs_rankings.csv) - 1)) records"
echo "THE: $(wc -l < scripts/output/cleaned_the_rankings.csv) total lines, $(($(wc -l < scripts/output/cleaned_the_rankings.csv) - 1)) records"
echo "ARWU: $(wc -l < scripts/output/cleaned_arwu_rankings.csv) total lines, $(($(wc -l < scripts/output/cleaned_arwu_rankings.csv) - 1)) records"
```

Expected: Record counts match validation report

---

## Self-Review Checklist

**Spec Coverage:**
- ✓ Consolidate multiple CSV files → Task 10
- ✓ Standardize university names → Task 3, all parsers
- ✓ Clean ranking formats → Task 2
- ✓ Validate data quality → Task 7
- ✓ Output three clean CSV files → Task 9, 10
- ✓ Fuzzy name matching → Task 3
- ✓ Manual review process → Task 8, 10
- ✓ Anomaly detection → Task 7, 8
- ✓ Quality assurance → Task 11

**Placeholder Check:**
- ✓ No TBD/TODO items
- ✓ All code blocks complete
- ✓ Exact file paths provided
- ✓ Specific commands with expected output

**Type Consistency:**
- ✓ `parseRank()` returns consistent structure across all uses
- ✓ `standardizeName()` returns consistent structure across all uses
- ✓ Record structure `{ university_name, year, rank, rank_display, is_range }` consistent throughout
- ✓ Parser functions all return `{ records, skipped, reviewQueue }` structure

**Missing Items:**
- None identified

