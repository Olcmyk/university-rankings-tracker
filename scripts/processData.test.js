import { describe, it, expect } from 'vitest';
import { parseCSVLine, slugify, groupByUniversity } from './processData.js';

describe('parseCSVLine', () => {
  it('parses a CSV line into object', () => {
    const line = 'Harvard University,2020,3,3,false';
    const result = parseCSVLine(line);
    expect(result).toEqual({
      universityName: 'Harvard University',
      year: 2020,
      rank: 3,
      displayRank: '3',
      isRange: false
    });
  });
});

describe('slugify', () => {
  it('converts university name to URL-friendly ID', () => {
    expect(slugify('Harvard University')).toBe('harvard-university');
    expect(slugify('Massachusetts Institute of Technology')).toBe('massachusetts-institute-of-technology');
  });
});

describe('groupByUniversity', () => {
  it('groups records by university name', () => {
    const records = [
      { universityName: 'Harvard University', year: 2020, rank: 3, displayRank: '3', system: 'qs' },
      { universityName: 'Harvard University', year: 2021, rank: 2, displayRank: '2', system: 'qs' }
    ];
    const result = groupByUniversity(records);
    expect(result['Harvard University']).toHaveLength(2);
  });
});
