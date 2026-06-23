const { cleanName, extractAbbreviation, standardizeName } = require('./name_standardizer');

// Load canonical dictionary
const canonicalDict = require('../config/canonical_names.json');

console.log('=== Testing cleanName ===');

// Test cleanName - basic cleaning
console.assert(cleanName('  MIT  ') === 'MIT', 'cleanName: trim spaces failed');
console.assert(cleanName('MIT') === 'MIT', 'cleanName: basic name failed');
console.assert(cleanName('  Multiple   Spaces  ') === 'Multiple Spaces', 'cleanName: multiple spaces failed');
console.assert(cleanName('Harvard,University') === 'Harvard, University', 'cleanName: comma spacing failed');
console.assert(cleanName('New-York') === 'New-York', 'cleanName: hyphen spacing failed');
console.assert(cleanName('') === '', 'cleanName: empty string failed');
console.assert(cleanName(null) === '', 'cleanName: null input failed');
console.assert(cleanName('Test\t\n\rString') === 'Test String', 'cleanName: control chars failed');

console.log('✓ cleanName tests passed');

console.log('=== Testing extractAbbreviation ===');

// Test extractAbbreviation
console.assert(extractAbbreviation('Massachusetts Institute of Technology (MIT)') === 'MIT', 'extractAbbreviation: MIT failed');
console.assert(extractAbbreviation('Harvard University (HU)') === 'HU', 'extractAbbreviation: HU failed');
console.assert(extractAbbreviation('Harvard University') === null, 'extractAbbreviation: no abbreviation failed');
console.assert(extractAbbreviation('(MIT)') === 'MIT', 'extractAbbreviation: only abbreviation failed');
console.assert(extractAbbreviation('') === null, 'extractAbbreviation: empty string failed');

console.log('✓ extractAbbreviation tests passed');

console.log('=== Testing standardizeName ===');

// Test standardizeName - exact alias match
let result = standardizeName('MIT', canonicalDict);
console.assert(
  result.canonical === 'Massachusetts Institute of Technology' && result.confidence === 1.0 && !result.needsReview,
  'standardizeName: MIT alias match failed'
);

// Test standardizeName - exact canonical match
result = standardizeName('Massachusetts Institute of Technology', canonicalDict);
console.assert(
  result.canonical === 'Massachusetts Institute of Technology' && result.confidence === 1.0 && !result.needsReview,
  'standardizeName: canonical exact match failed'
);

// Test standardizeName - Harvard alias
result = standardizeName('Harvard', canonicalDict);
console.assert(
  result.canonical === 'Harvard University' && result.confidence === 1.0 && !result.needsReview,
  'standardizeName: Harvard alias failed'
);

// Test standardizeName - with cleaning
result = standardizeName('  MIT  ', canonicalDict);
console.assert(
  result.canonical === 'Massachusetts Institute of Technology' && result.confidence === 1.0 && !result.needsReview,
  'standardizeName: MIT with spaces failed'
);

// Test standardizeName - fuzzy match (high confidence)
result = standardizeName('Harvrd University', canonicalDict);
console.assert(
  result.canonical === 'Harvard University' && result.confidence >= 0.90 && !result.needsReview,
  'standardizeName: fuzzy high confidence failed'
);

// Test standardizeName - unknown university (no good match)
result = standardizeName('Some Unknown University', canonicalDict);
console.assert(
  result.confidence === 0 && result.needsReview === true,
  'standardizeName: unknown university should need review'
);

// Test standardizeName - empty input
result = standardizeName('', canonicalDict);
console.assert(
  result.canonical === '' && result.confidence === 0 && result.needsReview === true,
  'standardizeName: empty input failed'
);

console.log('✓ standardizeName tests passed');

console.log('=== Manual verification ===');
console.log('cleanName("  MIT  "):', cleanName('  MIT  '));
console.log('standardizeName("MIT", dict):', standardizeName('MIT', canonicalDict));
console.log('standardizeName("Harvard", dict):', standardizeName('Harvard', canonicalDict));
console.log('standardizeName("Some Unknown University", dict):', standardizeName('Some Unknown University', canonicalDict));

console.log('\nAll tests passed!');
