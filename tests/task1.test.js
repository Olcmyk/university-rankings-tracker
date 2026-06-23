/**
 * Task 1 Setup Verification Tests
 * Verifies all dependencies are installed and project structure is correct
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running Task 1 Setup Verification Tests...\n');

// Get project root (parent of tests directory)
const projectRoot = path.dirname(__dirname);

// Test 1: Verify directory structure
console.log('Test 1: Verifying directory structure...');
const requiredDirs = [
  'scripts',
  'scripts/parsers',
  'scripts/utils',
  'scripts/config',
  'scripts/output'
];

requiredDirs.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  assert(fs.existsSync(fullPath), `Directory ${dir} does not exist`);
  console.log(`  ✓ ${dir}`);
});

// Test 2: Verify package.json exists and has correct scripts
console.log('\nTest 2: Verifying package.json...');
const packagePath = path.join(projectRoot, 'package.json');
assert(fs.existsSync(packagePath), 'package.json not found');
const pkg = require(packagePath);
assert(pkg.scripts['clean-data'], 'clean-data script not found in package.json');
console.log('  ✓ package.json exists with clean-data script');

// Test 3: Verify .gitignore exists
console.log('\nTest 3: Verifying .gitignore...');
const gitignorePath = path.join(projectRoot, '.gitignore');
assert(fs.existsSync(gitignorePath), '.gitignore not found');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
assert(gitignoreContent.includes('node_modules/'), 'node_modules/ not in .gitignore');
assert(gitignoreContent.includes('scripts/output/'), 'scripts/output/ not in .gitignore');
console.log('  ✓ .gitignore exists with correct entries');

// Test 4: Verify all dependencies are installed
console.log('\nTest 4: Verifying dependencies...');
const requiredDeps = ['papaparse', 'fast-csv', 'string-similarity', 'chalk', 'xlsx'];
requiredDeps.forEach(dep => {
  try {
    require(dep);
    console.log(`  ✓ ${dep}`);
  } catch (e) {
    throw new Error(`Dependency ${dep} not installed: ${e.message}`);
  }
});

// Test 5: Verify clean_data.js exists
console.log('\nTest 5: Verifying scripts/clean_data.js...');
const cleanDataPath = path.join(projectRoot, 'scripts', 'clean_data.js');
assert(fs.existsSync(cleanDataPath), 'scripts/clean_data.js not found');
console.log('  ✓ scripts/clean_data.js exists');

console.log('\n✓ All Task 1 setup verification tests passed!\n');
