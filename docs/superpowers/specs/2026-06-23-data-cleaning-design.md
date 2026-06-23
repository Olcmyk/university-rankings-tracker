# University Rankings Data Cleaning Design

**Date:** 2026-06-23  
**Project:** University Rankings Tracker - Data Processing Phase

## Overview

Clean and standardize university ranking data from three major ranking systems (QS, Times Higher Education, ARWU/Shanghai Ranking) into three unified CSV files, one per ranking system, containing all historical years with consistent formatting.

## Goals

1. **Consolidate** multiple CSV files per ranking system into single files
2. **Standardize** university names across different systems and years
3. **Clean** ranking data formats (handle ranges, special values, missing data)
4. **Validate** data quality and flag anomalies
5. **Output** three clean CSV files ready for visualization

## Input Data

### QS Rankings (2017-2027)
- **Files:** 6 CSV files
  - `qs-world-university-rankings-2017-to-2022-V2.csv` (2017-2022)
  - `2023 QS World University Rankings.csv`
  - `2024 QS World University Rankings 1.1 (For qs.com).csv`
  - `qs-world-rankings-2025.csv`
  - `2026_QS_World University_Rankings.csv`
  - `2027 QS World University Rankings 1.1 (For qs.com).xlsx`
- **Column names vary** - need to map different column names to standard fields
- **Key columns to extract:** university name, year, rank
- Total records: ~13,915

### Times Higher Education (2011-2026)
- **Files:** 32 CSV files in `times2011-2026/outputs/csv/`
  - 2 files per year: `THE_YYYY_rankings.csv` and `THE_YYYY_key_statistics.csv`
  - Only need the rankings file for this phase
- **Consistent structure:** `year`, `Rank`, `Name` columns
- **Years covered:** 2011-2026 (16 years)
- Total records: ~43,938

### ARWU/Shanghai Rankings (2003-2025)
- **File:** `arwu_all_years_combined_2003-2025.csv`
- **Already consolidated** - single file with all years
- **Key columns:** `name`, `year`, `rank`
- **Years covered:** 2003-2025 (23 years)
- Total records: ~15,816

## Output Data

### Three Clean CSV Files

**`cleaned_qs_rankings.csv`**
```csv
university_name,year,rank,rank_display,is_range
Massachusetts Institute of Technology,2017,1,1,false
Massachusetts Institute of Technology,2018,1,1,false
University of Oxford,2024,201-250,225.5,true
```

**`cleaned_the_rankings.csv`**
```csv
university_name,year,rank,rank_display,is_range
Harvard University,2011,2,2,false
Harvard University,2012,2,2,false
```

**`cleaned_arwu_rankings.csv`**
```csv
university_name,year,rank,rank_display,is_range
Harvard University,2003,1,1,false
Harvard University,2004,1,1,false
```

### Columns Definition

- **university_name**: Standardized English name (canonical form)
- **year**: Integer year (2003-2027)
- **rank**: Numeric rank value (middle point for ranges)
- **rank_display**: Original ranking string as displayed (e.g., "1", "201-250", "501+")
- **is_range**: Boolean - true if rank is a range/approximate value

## Data Cleaning Strategy

### Phase 1: University Name Standardization

**Challenge:** Same university has different names across systems and years.

**Examples:**
- "MIT" / "Massachusetts Institute of Technology (MIT)" / "Massachusetts Institute of Technology"
- "Tsinghua University" / "Tsinghua Univ" / "Tsinghua"
- "University of California, Berkeley" / "University of California at Berkeley" / "UC Berkeley"

**Critical Importance:** This is the foundation of the entire project. If names don't match across systems, users cannot see cross-system comparison charts. Every mismatch means broken data. This phase requires the most attention and manual verification.

**Solution:**

1. **Create Canonical Names Dictionary** (`canonical_names.json`)
   ```json
   {
     "Massachusetts Institute of Technology": [
       "MIT",
       "Massachusetts Institute of Technology (MIT)",
       "Mass Inst Technology"
     ],
     "Tsinghua University": [
       "Tsinghua Univ",
       "Tsinghua"
     ]
   }
   ```

2. **Name Normalization Pipeline:**
   ```
   Raw Name → Clean → Match Against Dictionary → Fuzzy Match → Manual Review Queue
   ```

3. **Cleaning Rules:**
   - Remove leading/trailing whitespace
   - Normalize multiple spaces to single space
   - Remove special characters: `\t`, `\n`, `\r`
   - Extract abbreviations in parentheses as aliases
   - Standardize punctuation: "," vs "." vs "-"

4. **Fuzzy Matching:**
   - Use Levenshtein Distance algorithm
   - Threshold: 90% similarity for automatic match
   - Match first 3-5 words for long names
   - Flag matches between 80-90% for manual review

5. **Manual Review Process:**
   - Script outputs `name_matches_review.txt`
   - Format: `System1_Name | System2_Name | Similarity: 85%`
   - Human confirms or rejects match
   - Approved matches added to `canonical_names.json`

6. **Iterative Approach:**
   - Run 1: Auto-match high confidence (>90%)
   - Review output, add manual mappings
   - Run 2: Re-run with updated dictionary
   - Repeat until review queue is empty
   - Goal: 100% of universities have canonical names

**Special Cases to Handle:**
- **Name changes over time:** (e.g., "Imperial College London" was formerly "Imperial College of Science, Technology and Medicine")
- **Merged institutions:** Decide which name to use as canonical
- **Campus vs parent:** (e.g., "UC Berkeley" vs "University of California System")
- **Non-Latin characters:** Ensure consistent romanization (e.g., "Peking University" vs "Beijing University")

### Phase 2: Rank Value Processing

**Input Formats Encountered:**

| Format | Examples | Processing |
|--------|----------|------------|
| Exact rank | "1", "#1", "1st", "001" | Parse to integer |
| Range | "201-250", "201–250", "201 - 250" | Calculate midpoint (225.5), flag as range |
| Open-ended | "501+", "500+" | Use start value (501), flag as range |
| Unranked | "NR", "Not Ranked", "–", "", "N/A" | Skip record (null) |

**Parsing Logic:**

```javascript
function parseRank(value) {
  // 1. Clean input
  value = String(value).trim().replace(/[#stndrd]/gi, '');
  
  // 2. Handle range (201-250)
  const rangeMatch = value.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    return {
      rank: (start + end) / 2,
      rank_display: value,
      is_range: true
    };
  }
  
  // 3. Handle open-ended (501+)
  const plusMatch = value.match(/(\d+)\+/);
  if (plusMatch) {
    const num = parseInt(plusMatch[1]);
    return {
      rank: num,
      rank_display: value,
      is_range: true
    };
  }
  
  // 4. Handle exact rank
  const exactMatch = value.match(/^(\d+)$/);
  if (exactMatch) {
    const num = parseInt(exactMatch[1]);
    return {
      rank: num,
      rank_display: String(num),
      is_range: false
    };
  }
  
  // 5. Unranked/invalid
  return null;
}
```

**Edge Cases:**
- Empty strings → skip record
- Non-numeric values → log warning, skip record
- Negative numbers → log error, skip record
- Ranks > 2000 → log warning (possible data error)
- "=" prefix (e.g., "=50" for tied ranks) → parse as exact rank 50
- Different dash types: hyphen (-), en-dash (–), em-dash (—) → all treated as range separator
- Whitespace variations: "201 - 250", "201-250", "201- 250" → all normalized

### Phase 3: Data Validation

**Validation Rules:**

1. **Uniqueness Check**
   - One university can only appear once per year per system
   - If duplicates found → log error with details

2. **Range Validation**
   - Year must be within system's coverage range
   - Rank must be positive integer
   - Flag ranks > 1000 for review

3. **Anomaly Detection**
   - Detect large ranking jumps (e.g., #5 → #500 in one year)
   - Threshold: jump > 200 positions → flag for review
   - Output: `ranking_anomalies.txt`

4. **Completeness Check**
   - Track coverage per university per system
   - Identify universities with sparse data (<3 years)

**Validation Output:**

```
data_validation_report.txt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QS Rankings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Total records processed: 13,915
✓ Valid records: 13,782
✗ Skipped (invalid rank): 98
✗ Skipped (missing name): 35
✓ Unique universities: 1,456
⚠ Anomalous rank jumps: 12

THE Rankings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Total records processed: 43,938
...

Name Matching
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Auto-matched: 1,234
⚠ Needs manual review: 45
✗ No match found: 12
```

## Implementation

### Technology Stack

- **Language:** Node.js (JavaScript/TypeScript)
- **Libraries:**
  - `papaparse` - CSV parsing
  - `fast-csv` - CSV writing
  - `string-similarity` - Fuzzy name matching
  - `chalk` - Colored console output

### Script Structure

```
scripts/
├── clean_data.js              # Main orchestration script
├── parsers/
│   ├── parse_qs.js           # QS-specific parser
│   ├── parse_the.js          # THE-specific parser
│   └── parse_arwu.js         # ARWU-specific parser
├── utils/
│   ├── name_standardizer.js  # Name normalization
│   ├── rank_parser.js        # Rank value processing
│   └── validator.js          # Data validation
├── config/
│   └── canonical_names.json  # Name mapping dictionary
└── output/
    ├── cleaned_qs_rankings.csv
    ├── cleaned_the_rankings.csv
    ├── cleaned_arwu_rankings.csv
    ├── data_validation_report.txt
    ├── name_matches_review.txt
    └── ranking_anomalies.txt
```

### Execution Flow

```
1. Load canonical names dictionary
2. For each ranking system:
   a. Read all CSV files
   b. Parse records → extract (name, year, rank)
   c. Standardize university names
   d. Parse rank values
   e. Validate data
   f. Collect records
3. Generate validation reports
4. Write cleaned CSV files
5. Output summary statistics
```

### Command Line Interface

```bash
# Run full cleaning pipeline
npm run clean-data

# Clean specific system only
npm run clean-data -- --system=qs
npm run clean-data -- --system=the
npm run clean-data -- --system=arwu

# Skip name standardization (use existing canonical_names.json)
npm run clean-data -- --skip-name-matching

# Verbose output
npm run clean-data -- --verbose
```

## Quality Assurance

### Manual Verification Steps

1. **Sample Top Universities**
   - Verify top 50 universities have correct names
   - Check data continuity (no unexpected gaps)

2. **Cross-System Consistency**
   - Pick 10 universities present in all 3 systems
   - Verify same canonical name used across systems

3. **Edge Cases**
   - Universities with name changes (verify handled correctly)
   - Universities with range ranks (verify midpoint calculation)
   - Universities with gaps in data (verify years are skipped, not filled)

### Acceptance Criteria

- [ ] All three CSV files generated successfully
- [ ] No duplicate (university, year) pairs within each file
- [ ] All rank values are positive numbers
- [ ] University names are consistent across systems (manual spot check)
- [ ] Validation report shows <5% skipped records
- [ ] All name matching conflicts resolved (0 in review queue)
- [ ] Anomalies reviewed and documented

## Future Considerations

### Phase 2 (After Data Cleaning)
- Build React frontend
- Implement search and visualization
- Deploy to Vercel

### Potential Enhancements
- Add university metadata (country, region, website)
- Include detailed ranking metrics (not just overall rank)
- Support for more ranking systems (CWUR, US News, etc.)

## Dependencies

```json
{
  "dependencies": {
    "papaparse": "^5.4.1",
    "fast-csv": "^5.0.1",
    "string-similarity": "^4.0.4",
    "chalk": "^5.3.0"
  }
}
```

## Timeline Estimate

- **Script Development:** 1-2 days
- **Initial Run + Manual Review:** 1 day
- **Iteration on Edge Cases:** 1 day
- **Total:** 3-4 days
