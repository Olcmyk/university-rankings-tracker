const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Data Cleaning Pipeline', () => {
  const OUTPUT_DIR = path.join(__dirname, 'output');

  test('pipeline completes execution', () => {
    try {
      // Run the pipeline (will exit with code 1 if review needed)
      execSync('node scripts/clean_data.js', { encoding: 'utf-8' });
    } catch (error) {
      // Exit code 1 is expected when manual review is needed
      expect(error.status).toBe(1);
      expect(error.stdout).toContain('Pipeline completed');
    }
  });

  test('generates all required output files', () => {
    const requiredFiles = [
      'cleaned_qs_rankings.csv',
      'cleaned_the_rankings.csv',
      'cleaned_arwu_rankings.csv',
      'data_validation_report.txt'
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(OUTPUT_DIR, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('CSV files have correct structure', () => {
    const csvFiles = [
      'cleaned_qs_rankings.csv',
      'cleaned_the_rankings.csv',
      'cleaned_arwu_rankings.csv'
    ];

    csvFiles.forEach(file => {
      const filePath = path.join(OUTPUT_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      // Check header
      expect(lines[0]).toBe('university_name,year,rank,rank_display,is_range');
      
      // Check we have data
      expect(lines.length).toBeGreaterThan(1);
      
      // Check data rows have correct number of fields
      const dataLine = lines[1];
      const fields = dataLine.split(',');
      expect(fields.length).toBeGreaterThanOrEqual(5);
    });
  });

  test('validation report contains all sections', () => {
    const reportPath = path.join(OUTPUT_DIR, 'data_validation_report.txt');
    const content = fs.readFileSync(reportPath, 'utf-8');

    expect(content).toContain('QS Rankings');
    expect(content).toContain('THE Rankings');
    expect(content).toContain('ARWU Rankings');
    expect(content).toContain('SUMMARY');
    expect(content).toContain('Total valid records:');
    expect(content).toContain('Total excluded (intentional):');
    expect(content).toContain('Total skipped (errors):');
    expect(content).toContain('Skip rate:');
  });

  test('CSV files contain valid data', () => {
    const qsPath = path.join(OUTPUT_DIR, 'cleaned_qs_rankings.csv');
    const content = fs.readFileSync(qsPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    // Parse a data line (skip header)
    const dataLine = lines[1];
    const [name, year, rank, rankDisplay, isRange] = dataLine.split(',');
    
    expect(name).toBeTruthy();
    expect(parseInt(year)).toBeGreaterThan(2000);
    expect(parseFloat(rank)).toBeGreaterThan(0);
    expect(rankDisplay).toBeTruthy();
    expect(['true', 'false']).toContain(isRange);
  });

  test('skip rate is within acceptable threshold', () => {
    const reportPath = path.join(OUTPUT_DIR, 'data_validation_report.txt');
    const content = fs.readFileSync(reportPath, 'utf-8');

    const skipRateMatch = content.match(/Skip rate: ([\d.]+)%/);
    expect(skipRateMatch).toBeTruthy();

    const skipRate = parseFloat(skipRateMatch[1]);
    // Skip rate must be under 5% (excludes intentional exclusions like "Reporter" status)
    expect(skipRate).toBeLessThan(5);
  });

  test('name matches review file is generated when needed', () => {
    const reviewPath = path.join(OUTPUT_DIR, 'name_matches_review.txt');
    
    if (fs.existsSync(reviewPath)) {
      const content = fs.readFileSync(reviewPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      // Check format: SYSTEM | "original" | "canonical" | Confidence: X%
      const sampleLine = lines[0];
      expect(sampleLine).toMatch(/^(QS|THE|ARWU) \|/);
      expect(sampleLine).toContain('Confidence:');
    }
  });

  test('ranking anomalies file is generated when anomalies exist', () => {
    const anomaliesPath = path.join(OUTPUT_DIR, 'ranking_anomalies.txt');
    
    if (fs.existsSync(anomaliesPath)) {
      const content = fs.readFileSync(anomaliesPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      // Check format: SYSTEM | University | YEAR→YEAR | Rank X→Y | Change: Z
      const sampleLine = lines[0];
      expect(sampleLine).toMatch(/^(QS|THE|ARWU) \|/);
      expect(sampleLine).toContain('→');
      expect(sampleLine).toContain('Change:');
    }
  });
});
