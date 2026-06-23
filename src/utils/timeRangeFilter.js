export function getYearRange(range, currentYear) {
  switch (range) {
    case '5years':
      return [currentYear - 4, currentYear];
    case '10years':
      return [currentYear - 9, currentYear];
    case '15years':
      return [currentYear - 14, currentYear];
    case 'all':
      return null;
    default:
      return null;
  }
}

export function filterByTimeRange(rankings, range, currentYear) {
  const yearRange = getYearRange(range, currentYear);

  if (!yearRange) {
    return rankings;
  }

  const [startYear, endYear] = yearRange;
  return rankings.filter(r => r.year >= startYear && r.year <= endYear);
}
