const { writeCleanedCSV } = require('./csv_writer');
const fs = require('fs');
const path = require('path');

describe('CSV Writer', () => {
  const testOutputDir = path.join(__dirname, '../../scripts/output');
  const testFile = path.join(testOutputDir, 'test_csv_writer.csv');

  beforeEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  afterAll(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  test('should write records to CSV file', async () => {
    const records = [
      { university_name: 'MIT', year: 2020, rank: 1, rank_display: '1', is_range: false },
      { university_name: 'Harvard University', year: 2020, rank: 5, rank_display: '5', is_range: false }
    ];

    await writeCleanedCSV(records, testFile);

    expect(fs.existsSync(testFile)).toBe(true);
  });

  test('should sort records by university name then year', async () => {
    const records = [
      { university_name: 'MIT', year: 2020, rank: 1, rank_display: '1', is_range: false },
      { university_name: 'Harvard University', year: 2020, rank: 5, rank_display: '5', is_range: false },
      { university_name: 'Harvard University', year: 2019, rank: 3, rank_display: '3', is_range: false },
      { university_name: 'MIT', year: 2019, rank: 2, rank_display: '2', is_range: false }
    ];

    await writeCleanedCSV(records, testFile);

    const content = fs.readFileSync(testFile, 'utf8');
    const lines = content.trim().split('\n');

    // Skip header
    expect(lines[0]).toBe('university_name,year,rank,rank_display,is_range');
    expect(lines[1]).toContain('Harvard University,2019');
    expect(lines[2]).toContain('Harvard University,2020');
    expect(lines[3]).toContain('MIT,2019');
    expect(lines[4]).toContain('MIT,2020');
  });

  test('should handle UTF-8 encoding correctly', async () => {
    const records = [
      { university_name: 'Ångström University', year: 2020, rank: 1, rank_display: '1', is_range: false },
      { university_name: 'École Polytechnique', year: 2020, rank: 5, rank_display: '5', is_range: false },
      { university_name: 'University of Zürich', year: 2019, rank: 3, rank_display: '3', is_range: false }
    ];

    await writeCleanedCSV(records, testFile);

    const content = fs.readFileSync(testFile, 'utf8');
    expect(content).toContain('Ångström University');
    expect(content).toContain('École Polytechnique');
    expect(content).toContain('University of Zürich');
  });

  test('should include all required columns', async () => {
    const records = [
      { university_name: 'MIT', year: 2020, rank: 1, rank_display: '1', is_range: false }
    ];

    await writeCleanedCSV(records, testFile);

    const content = fs.readFileSync(testFile, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines[0]).toBe('university_name,year,rank,rank_display,is_range');
  });

  test('should handle empty records array', async () => {
    const records = [];

    await writeCleanedCSV(records, testFile);

    expect(fs.existsSync(testFile)).toBe(true);
    const content = fs.readFileSync(testFile, 'utf8');
    // Empty array results in empty file (fast-csv doesn't write headers without data)
    expect(content.trim().length).toBe(0);
  });

  test('should handle rank_display values correctly', async () => {
    const records = [
      { university_name: 'MIT', year: 2020, rank: 1, rank_display: '1', is_range: false },
      { university_name: 'Stanford', year: 2020, rank: 10, rank_display: '10-15', is_range: true },
      { university_name: 'Berkeley', year: 2020, rank: 20, rank_display: '20+', is_range: true }
    ];

    await writeCleanedCSV(records, testFile);

    const content = fs.readFileSync(testFile, 'utf8');
    expect(content).toContain('1,1,false');
    expect(content).toContain('10,10-15,true');
    expect(content).toContain('20,20+,true');
  });

  test('should preserve sort order with same names across years', async () => {
    const records = [
      { university_name: 'Harvard University', year: 2022, rank: 4, rank_display: '4', is_range: false },
      { university_name: 'Harvard University', year: 2020, rank: 5, rank_display: '5', is_range: false },
      { university_name: 'Harvard University', year: 2021, rank: 4, rank_display: '4', is_range: false }
    ];

    await writeCleanedCSV(records, testFile);

    const content = fs.readFileSync(testFile, 'utf8');
    const lines = content.trim().split('\n');

    // Should be sorted by year: 2020, 2021, 2022
    expect(lines[1]).toContain(',2020,');
    expect(lines[2]).toContain(',2021,');
    expect(lines[3]).toContain(',2022,');
  });
});
