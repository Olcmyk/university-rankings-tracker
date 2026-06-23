// Mock chalk to avoid ESM issues in Jest
jest.mock('chalk', () => ({
  green: (str) => str,
  red: (str) => str,
  yellow: (str) => str,
  blue: (str) => str,
  gray: (str) => str,
  bold: (str) => str
}));

const {
  generateValidationReport,
  generateSystemReport,
  generateReviewReport,
  writeReports
} = require('./report_generator');
const fs = require('fs');
const path = require('path');

describe('Report Generator', () => {
  describe('generateSystemReport', () => {
    test('generates report with valid records only', () => {
      const validation = {
        system: 'QS',
        totalRecords: 100,
        valid: 100,
        duplicates: [],
        anomalies: [],
        coverage: {
          totalUniversities: 50,
          sparse: [],
          averageYears: 2.0
        }
      };
      const skipped = [];

      const report = generateSystemReport(validation, skipped);

      expect(report).toContain('QS Rankings');
      expect(report).toContain('Total records processed: 100');
      expect(report).toContain('Valid records: 100');
      expect(report).toContain('Unique universities: 50');
      expect(report).toContain('Average years per university: 2.0');
    });

    test('includes skipped records breakdown', () => {
      const validation = {
        system: 'THE',
        totalRecords: 95,
        valid: 95,
        duplicates: [],
        anomalies: [],
        coverage: { totalUniversities: 48, sparse: [], averageYears: 2.0 }
      };
      const skipped = [
        { reason: 'invalid_rank' },
        { reason: 'invalid_rank' },
        { reason: 'missing_name' },
        { reason: 'invalid_year' },
        { reason: 'invalid_year' }
      ];

      const report = generateSystemReport(validation, skipped);

      expect(report).toContain('Total records processed: 100');
      expect(report).toContain('Skipped (invalid_rank): 2');
      expect(report).toContain('Skipped (missing_name): 1');
      expect(report).toContain('Skipped (invalid_year): 2');
    });

    test('shows duplicates when present', () => {
      const validation = {
        system: 'ARWU',
        totalRecords: 100,
        valid: 97,
        duplicates: [
          { university: 'Harvard', year: 2020 },
          { university: 'MIT', year: 2021 },
          { university: 'Stanford', year: 2022 }
        ],
        anomalies: [],
        coverage: { totalUniversities: 50, sparse: [], averageYears: 2.0 }
      };
      const skipped = [];

      const report = generateSystemReport(validation, skipped);

      expect(report).toContain('Duplicate records: 3');
    });

    test('shows anomalies when present', () => {
      const validation = {
        system: 'QS',
        totalRecords: 100,
        valid: 100,
        duplicates: [],
        anomalies: [
          { university: 'Test University', yearFrom: 2020, yearTo: 2021, rankFrom: 5, rankTo: 500, change: 495 }
        ],
        coverage: { totalUniversities: 50, sparse: [], averageYears: 2.0 }
      };
      const skipped = [];

      const report = generateSystemReport(validation, skipped);

      expect(report).toContain('Anomalous rank jumps: 1');
    });

    test('shows sparse coverage warning', () => {
      const validation = {
        system: 'THE',
        totalRecords: 100,
        valid: 100,
        duplicates: [],
        anomalies: [],
        coverage: {
          totalUniversities: 50,
          sparse: [
            { university: 'Small University', years: 1 },
            { university: 'Another Small', years: 2 }
          ],
          averageYears: 2.0
        }
      };
      const skipped = [];

      const report = generateSystemReport(validation, skipped);

      expect(report).toContain('Universities with sparse data (<3 years): 2');
    });
  });

  describe('generateReviewReport', () => {
    test('reports no reviews needed when queues are empty', () => {
      const reviewQueues = {
        QS: [],
        THE: [],
        ARWU: []
      };

      const report = generateReviewReport(reviewQueues);

      expect(report).toContain('Name Matching Review Required');
      expect(report).toContain('No matches need review - all names mapped successfully!');
    });

    test('shows review items with confidence scores', () => {
      const reviewQueues = {
        QS: [
          { original: 'MIT', suggested: 'Massachusetts Institute of Technology', confidence: 0.85 },
          { original: 'UCB', suggested: 'University of California, Berkeley', confidence: 0.78 }
        ],
        THE: [],
        ARWU: [
          { original: 'Caltech', suggested: 'California Institute of Technology', confidence: 0.92 }
        ]
      };

      const report = generateReviewReport(reviewQueues);

      expect(report).toContain('QS: 2 matches need review');
      expect(report).toContain('"MIT" → "Massachusetts Institute of Technology" (85% confidence)');
      expect(report).toContain('"UCB" → "University of California, Berkeley" (78% confidence)');
      expect(report).toContain('ARWU: 1 matches need review');
      expect(report).toContain('"Caltech" → "California Institute of Technology" (92% confidence)');
      expect(report).toContain('Total requiring review: 3');
      expect(report).toContain('Action: Review name_matches_review.txt');
    });

    test('truncates long lists to first 10 items', () => {
      const reviewQueues = {
        QS: Array.from({ length: 15 }, (_, i) => ({
          original: `University ${i}`,
          suggested: `Official University ${i}`,
          confidence: 0.8
        })),
        THE: [],
        ARWU: []
      };

      const report = generateReviewReport(reviewQueues);

      expect(report).toContain('QS: 15 matches need review');
      expect(report).toContain('... and 5 more');
    });
  });

  describe('generateValidationReport', () => {
    test('generates complete report with all sections', () => {
      const allResults = {
        QS: {
          system: 'QS',
          totalRecords: 100,
          valid: 98,
          duplicates: [],
          anomalies: [{ university: 'Test', yearFrom: 2020, yearTo: 2021, rankFrom: 5, rankTo: 500, change: 495 }],
          coverage: { totalUniversities: 50, sparse: [], averageYears: 2.0 }
        },
        THE: {
          system: 'THE',
          totalRecords: 200,
          valid: 195,
          duplicates: [],
          anomalies: [],
          coverage: { totalUniversities: 100, sparse: [], averageYears: 2.0 }
        },
        ARWU: {
          system: 'ARWU',
          totalRecords: 300,
          valid: 298,
          duplicates: [],
          anomalies: [],
          coverage: { totalUniversities: 150, sparse: [], averageYears: 2.0 }
        }
      };
      const allSkipped = {
        QS: [{ reason: 'invalid_rank' }, { reason: 'invalid_rank' }],
        THE: [{ reason: 'missing_name' }],
        ARWU: [{ reason: 'invalid_year' }, { reason: 'invalid_year' }]
      };
      const reviewQueues = {
        QS: [],
        THE: [{ original: 'MIT', suggested: 'Massachusetts Institute of Technology', confidence: 0.85 }],
        ARWU: []
      };

      const report = generateValidationReport(allResults, allSkipped, reviewQueues);

      expect(report).toContain('DATA VALIDATION REPORT');
      expect(report).toContain('QS Rankings');
      expect(report).toContain('THE Rankings');
      expect(report).toContain('ARWU Rankings');
      expect(report).toContain('Name Matching Review Required');
      expect(report).toContain('SUMMARY');
      expect(report).toContain('Total valid records: 591');
      expect(report).toContain('Total skipped: 5');
    });

    test('calculates skip rate correctly', () => {
      const allResults = {
        QS: { system: 'QS', totalRecords: 100, valid: 100, duplicates: [], anomalies: [], coverage: { totalUniversities: 50, sparse: [], averageYears: 2.0 } }
      };
      const allSkipped = {
        QS: Array.from({ length: 5 }, () => ({ reason: 'test' }))
      };
      const reviewQueues = { QS: [] };

      const report = generateValidationReport(allResults, allSkipped, reviewQueues);

      // Skip rate = 5 / (100 + 5) * 100 = 4.76%
      expect(report).toContain('Skip rate: 4.76%');
      expect(report).toContain('Skip rate within acceptable range (<5%)');
    });

    test('warns when skip rate exceeds 5%', () => {
      const allResults = {
        QS: { system: 'QS', totalRecords: 90, valid: 90, duplicates: [], anomalies: [], coverage: { totalUniversities: 50, sparse: [], averageYears: 2.0 } }
      };
      const allSkipped = {
        QS: Array.from({ length: 10 }, () => ({ reason: 'test' }))
      };
      const reviewQueues = { QS: [] };

      const report = generateValidationReport(allResults, allSkipped, reviewQueues);

      // Skip rate = 10 / (90 + 10) * 100 = 10%
      expect(report).toContain('Skip rate: 10.00%');
      expect(report).toContain('Skip rate exceeds 5% threshold!');
    });
  });

  describe('writeReports', () => {
    const testOutputDir = path.join(__dirname, '../../test-output');

    beforeEach(() => {
      // Clean up test output directory
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true });
      }
    });

    afterEach(() => {
      // Clean up after tests
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true });
      }
    });

    test('creates output directory if it does not exist', () => {
      const reports = {
        validation: 'Test validation report',
        reviewList: [],
        anomalies: []
      };

      writeReports(testOutputDir, reports);

      expect(fs.existsSync(testOutputDir)).toBe(true);
    });

    test('writes validation report file', () => {
      const reports = {
        validation: 'Test validation report content',
        reviewList: [],
        anomalies: []
      };

      writeReports(testOutputDir, reports);

      const reportPath = path.join(testOutputDir, 'data_validation_report.txt');
      expect(fs.existsSync(reportPath)).toBe(true);
      expect(fs.readFileSync(reportPath, 'utf8')).toBe('Test validation report content');
    });

    test('writes review list when provided', () => {
      const reports = {
        validation: 'Test report',
        reviewList: [
          { system: 'QS', original: 'MIT', suggested: 'Massachusetts Institute of Technology', confidence: 0.85 },
          { system: 'THE', original: 'UCB', suggested: 'University of California, Berkeley', confidence: 0.78 }
        ],
        anomalies: []
      };

      writeReports(testOutputDir, reports);

      const reviewPath = path.join(testOutputDir, 'name_matches_review.txt');
      expect(fs.existsSync(reviewPath)).toBe(true);

      const content = fs.readFileSync(reviewPath, 'utf8');
      expect(content).toContain('QS | "MIT" | "Massachusetts Institute of Technology" | Confidence: 85%');
      expect(content).toContain('THE | "UCB" | "University of California, Berkeley" | Confidence: 78%');
    });

    test('writes anomalies when provided', () => {
      const reports = {
        validation: 'Test report',
        reviewList: [],
        anomalies: [
          { system: 'QS', university: 'Test University', yearFrom: 2020, yearTo: 2021, rankFrom: 5, rankTo: 500, change: 495 },
          { system: 'ARWU', university: 'Another University', yearFrom: 2019, yearTo: 2020, rankFrom: 300, rankTo: 50, change: -250 }
        ]
      };

      writeReports(testOutputDir, reports);

      const anomaliesPath = path.join(testOutputDir, 'ranking_anomalies.txt');
      expect(fs.existsSync(anomaliesPath)).toBe(true);

      const content = fs.readFileSync(anomaliesPath, 'utf8');
      expect(content).toContain('QS | Test University | 2020→2021 | Rank 5→500 | Change: +495');
      expect(content).toContain('ARWU | Another University | 2019→2020 | Rank 300→50 | Change: -250');
    });

    test('skips review list file when empty', () => {
      const reports = {
        validation: 'Test report',
        reviewList: [],
        anomalies: []
      };

      writeReports(testOutputDir, reports);

      const reviewPath = path.join(testOutputDir, 'name_matches_review.txt');
      expect(fs.existsSync(reviewPath)).toBe(false);
    });

    test('skips anomalies file when empty', () => {
      const reports = {
        validation: 'Test report',
        reviewList: [],
        anomalies: []
      };

      writeReports(testOutputDir, reports);

      const anomaliesPath = path.join(testOutputDir, 'ranking_anomalies.txt');
      expect(fs.existsSync(anomaliesPath)).toBe(false);
    });
  });
});
