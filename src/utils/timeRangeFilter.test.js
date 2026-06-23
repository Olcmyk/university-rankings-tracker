import { describe, it, expect } from 'vitest';
import { filterByTimeRange, getYearRange } from './timeRangeFilter.js';

describe('getYearRange', () => {
  it('returns correct range for "5years"', () => {
    const [start, end] = getYearRange('5years', 2025);
    expect(end - start).toBe(4);
    expect(end).toBe(2025);
  });

  it('returns null for "all"', () => {
    const range = getYearRange('all', 2025);
    expect(range).toBeNull();
  });
});

describe('filterByTimeRange', () => {
  const rankings = [
    { year: 2015, rank: 1 },
    { year: 2021, rank: 2 },
    { year: 2025, rank: 3 },
  ];

  it('filters to last 5 years', () => {
    const filtered = filterByTimeRange(rankings, '5years', 2025);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].year).toBe(2021);
  });

  it('returns all for "all" range', () => {
    const filtered = filterByTimeRange(rankings, 'all', 2025);
    expect(filtered).toHaveLength(3);
  });
});
