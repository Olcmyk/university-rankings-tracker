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
