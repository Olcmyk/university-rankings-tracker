# University Rankings Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static React web application that enables users to search universities and visualize their ranking trends across QS, THE, and ARWU using interactive line charts.

**Architecture:** Pure static SPA with React + Chart.js frontend, client-side data processing from optimized JSON, deployed to Vercel.

**Tech Stack:** React 18, Vite, Chart.js 4.x, Fuse.js 7.x, React Router v6, Tailwind CSS

## Global Constraints

- React version: 18.x
- Node.js version: >= 18.x
- Chart.js version: 4.x
- Fuse.js version: 7.x
- React Router version: 6.x
- All text in English
- Color palette: Background #ffffff, Text #1f2937, QS #2563eb, THE #16a34a, ARWU #ea580c
- Max content width: 1200px
- Spacing: 8px base unit (8, 16, 24, 32, 48, 64)
- Target Lighthouse Performance: > 90
- WCAG 2.1 Level AA compliance

---

## File Structure


```
university-rankings/
├── scripts/
│   └── processData.js              # CSV → JSON conversion
├── public/
│   └── data/
│       └── rankings.json           # Generated optimized data
├── src/
│   ├── components/
│   │   ├── SearchBox.jsx          # Fuzzy search with autocomplete
│   │   ├── UniversityChart.jsx    # Chart.js line chart
│   │   ├── TimeRangeSelector.jsx  # Time range dropdown
│   │   ├── LoadingSpinner.jsx     # Loading indicator
│   │   └── Header.jsx             # Site header
│   ├── pages/
│   │   ├── HomePage.jsx           # Landing page with search
│   │   └── UniversityPage.jsx     # University detail with chart
│   ├── hooks/
│   │   ├── useRankingData.js      # Data loading hook
│   │   └── useDebounce.js         # Input debouncing
│   ├── utils/
│   │   ├── slugify.js             # URL-friendly ID generation
│   │   └── timeRangeFilter.js     # Filter data by time range
│   ├── App.jsx                    # Root component with routing
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Global styles
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── vercel.json                    # Vercel deployment config
```

---


### Task 1: Data Processing Script

**Files:**
- Create: `scripts/processData.js`
- Input: `scripts/output/cleaned_qs_rankings.csv`, `scripts/output/cleaned_the_rankings.csv`, `scripts/output/cleaned_arwu_rankings.csv`
- Output: `public/data/rankings.json`

**Interfaces:**
- Consumes: Three CSV files with schema `university_name,year,rank,rank_display,is_range`
- Produces: `rankings.json` with structure:
  ```javascript
  {
    universities: Array<{
      id: string,           // e.g., "harvard-university"
      name: string,         // e.g., "Harvard University"
      rankings: {
        qs: Array<{year: number, rank: number, displayRank: string}>,
        the: Array<{year: number, rank: number, displayRank: string}>,
        arwu: Array<{year: number, rank: number, displayRank: string}>
      }
    }>,
    metadata: {
      totalUniversities: number,
      dateGenerated: string,
      rankingSystems: object
    }
  }
  ```

- [ ] **Step 1: Write test for CSV parsing**

Create `scripts/processData.test.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test scripts/processData.test.js`
Expected: FAIL with "Cannot find module './processData.js'"

- [ ] **Step 3: Install dependencies**

```bash
npm init -y
npm install csv-parser --save-dev
npm install vitest --save-dev
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "process-data": "node scripts/processData.js"
  }
}
```

- [ ] **Step 4: Write minimal implementation**

Create `scripts/processData.js`:

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseCSVLine(line) {
  const parts = line.split(',');
  return {
    universityName: parts[0],
    year: parseInt(parts[1]),
    rank: parseFloat(parts[2]),
    displayRank: parts[3],
    isRange: parts[4] === 'true'
  };
}

export function groupByUniversity(records) {
  const grouped = {};
  for (const record of records) {
    if (!grouped[record.universityName]) {
      grouped[record.universityName] = [];
    }
    grouped[record.universityName].push(record);
  }
  return grouped;
}

async function readCSV(filePath, system) {
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        records.push({
          universityName: row.university_name.trim(),
          year: parseInt(row.year),
          rank: parseFloat(row.rank),
          displayRank: row.rank_display,
          isRange: row.is_range === 'true',
          system
        });
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

async function processData() {
  const outputDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read all three CSV files
  const qsRecords = await readCSV(path.join(__dirname, 'output', 'cleaned_qs_rankings.csv'), 'qs');
  const theRecords = await readCSV(path.join(__dirname, 'output', 'cleaned_the_rankings.csv'), 'the');
  const arwuRecords = await readCSV(path.join(__dirname, 'output', 'cleaned_arwu_rankings.csv'), 'arwu');

  // Combine all records
  const allRecords = [...qsRecords, ...theRecords, ...arwuRecords];

  // Group by university
  const universityMap = {};
  for (const record of allRecords) {
    const name = record.universityName;
    if (!universityMap[name]) {
      universityMap[name] = {
        id: slugify(name),
        name: name,
        rankings: { qs: [], the: [], arwu: [] }
      };
    }
    
    universityMap[name].rankings[record.system].push({
      year: record.year,
      rank: record.rank,
      displayRank: record.displayRank
    });
  }

  // Sort rankings by year
  for (const uni of Object.values(universityMap)) {
    uni.rankings.qs.sort((a, b) => a.year - b.year);
    uni.rankings.the.sort((a, b) => a.year - b.year);
    uni.rankings.arwu.sort((a, b) => a.year - b.year);
  }

  // Convert to array and sort alphabetically
  const universities = Object.values(universityMap).sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Build output structure
  const output = {
    universities,
    metadata: {
      totalUniversities: universities.length,
      dateGenerated: new Date().toISOString().split('T')[0],
      rankingSystems: {
        qs: {
          fullName: 'QS World University Rankings',
          years: [2017, 2027]
        },
        the: {
          fullName: 'Times Higher Education World University Rankings',
          years: [2011, 2026]
        },
        arwu: {
          fullName: 'Academic Ranking of World Universities',
          years: [2003, 2025]
        }
      }
    }
  };

  // Write to file
  const outputPath = path.join(outputDir, 'rankings.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`✅ Processed ${allRecords.length} records`);
  console.log(`✅ Generated data for ${universities.length} universities`);
  console.log(`✅ Output written to ${outputPath}`);
  
  // Print file size
  const stats = fs.statSync(outputPath);
  console.log(`✅ File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processData().catch(console.error);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test scripts/processData.test.js`
Expected: PASS

- [ ] **Step 6: Run data processing script**

Run: `npm run process-data`
Expected output:
```
✅ Processed ~48000 records
✅ Generated data for ~2450 universities
✅ Output written to public/data/rankings.json
✅ File size: ~2.0 MB
```

Verify: `ls -lh public/data/rankings.json` shows file exists

- [ ] **Step 7: Commit**

```bash
git add scripts/processData.js scripts/processData.test.js package.json package-lock.json
git commit -m "feat: add CSV to JSON data processing script

- Parse three ranking system CSVs
- Group by university with URL-friendly IDs
- Generate optimized JSON structure
- Includes unit tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---


### Task 2: Project Initialization

**Files:**
- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`
- Create: `.gitignore`

**Interfaces:**
- Consumes: None (bootstrap task)
- Produces: Working Vite + React development environment with Tailwind CSS

- [ ] **Step 1: Initialize React project with Vite**

```bash
npm create vite@latest university-rankings -- --template react
cd university-rankings
```

Expected: Project scaffolded in `university-rankings/` directory

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install react-router-dom chart.js react-chartjs-2 fuse.js
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind CSS**

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chart-qs': '#2563eb',
        'chart-the': '#16a34a',
        'chart-arwu': '#ea580c',
      },
      maxWidth: {
        'content': '1200px',
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Update Vite config**

Update `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js', 'react-chartjs-2'],
          'search': ['fuse.js'],
        },
      },
    },
  },
})
```

- [ ] **Step 5: Setup global styles**

Replace `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  body {
    @apply bg-white text-gray-800;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition-colors;
  }
  
  .input-search {
    @apply w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent;
  }
  
  .container-main {
    @apply max-w-content mx-auto px-4 sm:px-8;
  }
}
```

- [ ] **Step 6: Update index.html**

Replace `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Track university ranking trends across QS, THE, and ARWU over 20+ years" />
    <title>University Rankings Tracker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create minimal App component**

Replace `src/App.jsx`:

```jsx
function App() {
  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold text-center py-8">
        University Rankings Tracker
      </h1>
      <p className="text-center text-gray-600">
        Setup complete. Components coming next.
      </p>
    </div>
  );
}

export default App;
```

- [ ] **Step 8: Update main entry point**

Replace `src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 9: Create .gitignore**

Create `.gitignore`:

```
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Generated data (will be created by script)
public/data/rankings.json
```

- [ ] **Step 10: Test development server**

Run: `npm run dev`
Expected: Dev server starts at `http://localhost:5173`
Verify: Open browser, see "University Rankings Tracker" heading

Stop server: `Ctrl+C`

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: initialize React project with Vite and Tailwind

- Setup Vite + React 18
- Configure Tailwind CSS with custom colors
- Add Inter font
- Configure build optimizations
- Add gitignore

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---


### Task 3: Data Loading Hook

**Files:**
- Create: `src/hooks/useRankingData.js`
- Test: `src/hooks/useRankingData.test.jsx`

**Interfaces:**
- Consumes: `public/data/rankings.json` (generated by Task 1)
- Produces: Hook that returns `{ data, loading, error }` where `data` matches the JSON structure from Task 1

- [ ] **Step 1: Write test for data loading hook**

Create `src/hooks/useRankingData.test.jsx`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRankingData } from './useRankingData.js';

describe('useRankingData', () => {
  it('returns loading state initially', () => {
    const { result } = renderHook(() => useRankingData());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('loads data successfully', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ universities: [], metadata: {} }),
      })
    );

    const { result } = renderHook(() => useRankingData());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
    expect(result.current.error).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/hooks/useRankingData.test.jsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Install testing dependencies**

```bash
npm install -D @testing-library/react @testing-library/react-hooks vitest jsdom
```

Update `package.json` to add test config:

```json
{
  "scripts": {
    "test": "vitest"
  }
}
```

Create `vitest.config.js`:

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 4: Write minimal implementation**

Create `src/hooks/useRankingData.js`:

```javascript
import { useState, useEffect } from 'react';

export function useRankingData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/data/rankings.json');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err.message);
        console.error('Failed to load ranking data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test src/hooks/useRankingData.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useRankingData.js src/hooks/useRankingData.test.jsx vitest.config.js package.json
git commit -m "feat: add data loading hook

- Fetch rankings.json on mount
- Handle loading and error states
- Include unit tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---


### Task 4: Utility Functions

**Files:**
- Create: `src/utils/slugify.js`
- Create: `src/utils/timeRangeFilter.js`
- Create: `src/hooks/useDebounce.js`
- Test: `src/utils/slugify.test.js`
- Test: `src/utils/timeRangeFilter.test.js`

**Interfaces:**
- Consumes: None
- Produces:
  - `slugify(text: string): string` - Converts text to URL-friendly slug
  - `filterByTimeRange(rankings: Array, range: string, currentYear: number): Array` - Filters ranking data by time range
  - `useDebounce(value: any, delay: number): any` - Debounces a value

- [ ] **Step 1: Write test for slugify**

Create `src/utils/slugify.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { slugify } from './slugify.js';

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Harvard University')).toBe('harvard-university');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('Massachusetts Institute of Technology')).toBe('massachusetts-institute-of-technology');
  });

  it('removes special characters', () => {
    expect(slugify("Queen's University")).toBe('queens-university');
  });

  it('handles multiple spaces', () => {
    expect(slugify('University  of   California')).toBe('university-of-california');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/utils/slugify.test.js`
Expected: FAIL

- [ ] **Step 3: Write slugify implementation**

Create `src/utils/slugify.js`:

```javascript
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test src/utils/slugify.test.js`
Expected: PASS

- [ ] **Step 5: Write test for timeRangeFilter**

Create `src/utils/timeRangeFilter.test.js`:

```javascript
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
    { year: 2020, rank: 2 },
    { year: 2025, rank: 3 },
  ];

  it('filters to last 5 years', () => {
    const filtered = filterByTimeRange(rankings, '5years', 2025);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].year).toBe(2020);
  });

  it('returns all for "all" range', () => {
    const filtered = filterByTimeRange(rankings, 'all', 2025);
    expect(filtered).toHaveLength(3);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test src/utils/timeRangeFilter.test.js`
Expected: FAIL

- [ ] **Step 7: Write timeRangeFilter implementation**

Create `src/utils/timeRangeFilter.js`:

```javascript
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
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test src/utils/timeRangeFilter.test.js`
Expected: PASS

- [ ] **Step 9: Write useDebounce hook**

Create `src/hooks/useDebounce.js`:

```javascript
import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

- [ ] **Step 10: Test debounce hook manually**

Create temporary test file `src/hooks/useDebounce.test.jsx`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce } from './useDebounce.js';

describe('useDebounce', () => {
  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 300 });
    
    // Should still be initial immediately
    expect(result.current).toBe('initial');

    // After delay, should update
    await waitFor(() => {
      expect(result.current).toBe('updated');
    }, { timeout: 500 });
  });
});
```

Run: `npm test src/hooks/useDebounce.test.jsx`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/utils/ src/hooks/useDebounce.js
git commit -m "feat: add utility functions and debounce hook

- Add slugify for URL-friendly IDs
- Add timeRangeFilter for date filtering
- Add useDebounce hook for search input
- Include comprehensive unit tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---


### Task 5: SearchBox Component

**Files:**
- Create: `src/components/SearchBox.jsx`
- Create: `src/components/SearchBox.test.jsx`

**Interfaces:**
- Consumes:
  - `universities: Array<{id: string, name: string}>` - List of universities from ranking data
  - `onSelect: (university: {id: string, name: string}) => void` - Callback when university selected
- Produces: SearchBox component with fuzzy search and keyboard navigation

- [ ] **Step 1: Write test for SearchBox**

Create `src/components/SearchBox.test.jsx`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBox } from './SearchBox.jsx';

describe('SearchBox', () => {
  const mockUniversities = [
    { id: 'harvard-university', name: 'Harvard University' },
    { id: 'stanford-university', name: 'Stanford University' },
    { id: 'mit', name: 'Massachusetts Institute of Technology' },
  ];

  it('renders search input', () => {
    render(<SearchBox universities={mockUniversities} onSelect={() => {}} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows results when typing', () => {
    render(<SearchBox universities={mockUniversities} onSelect={() => {}} />);
    const input = screen.getByRole('combobox');
    
    fireEvent.change(input, { target: { value: 'harv' } });
    
    expect(screen.getByText('Harvard University')).toBeInTheDocument();
  });

  it('calls onSelect when university clicked', () => {
    const onSelect = vi.fn();
    render(<SearchBox universities={mockUniversities} onSelect={onSelect} />);
    
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'harv' } });
    
    const result = screen.getByText('Harvard University');
    fireEvent.click(result);
    
    expect(onSelect).toHaveBeenCalledWith(mockUniversities[0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test src/components/SearchBox.test.jsx`
Expected: FAIL

- [ ] **Step 3: Write SearchBox implementation**

Create `src/components/SearchBox.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { useDebounce } from '../hooks/useDebounce';

export function SearchBox({ universities, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // Initialize Fuse.js
  const fuse = useRef(
    new Fuse(universities, {
      keys: ['name'],
      threshold: 0.3,
      minMatchCharLength: 2,
    })
  );

  // Update fuse when universities change
  useEffect(() => {
    fuse.current.setCollection(universities);
  }, [universities]);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      const searchResults = fuse.current.search(debouncedQuery);
      setResults(searchResults.slice(0, 10).map(r => r.item));
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelect = (university) => {
    setQuery('');
    setIsOpen(false);
    onSelect(university);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search universities"
        aria-expanded={isOpen}
        aria-controls="search-results"
        aria-activedescendant={`result-${selectedIndex}`}
        className="input-search"
        placeholder="Search for a university..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
      />
      
      {isOpen && results.length > 0 && (
        <ul
          ref={resultsRef}
          role="listbox"
          id="search-results"
          className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {results.map((university, index) => (
            <li
              key={university.id}
              id={`result-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              className={`px-4 py-3 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(university)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-center">
                {index === selectedIndex && (
                  <span className="mr-2 text-blue-700">→</span>
                )}
                <span className="font-medium">{university.name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/components/SearchBox.test.jsx`
Expected: PASS

- [ ] **Step 5: Test component in browser**

Update `src/App.jsx` temporarily:

```jsx
import { useState } from 'react';
import { SearchBox } from './components/SearchBox';

function App() {
  const mockData = [
    { id: 'harvard', name: 'Harvard University' },
    { id: 'stanford', name: 'Stanford University' },
    { id: 'mit', name: 'Massachusetts Institute of Technology' },
  ];

  const [selected, setSelected] = useState(null);

  return (
    <div className="min-h-screen py-8">
      <div className="container-main">
        <h1 className="text-3xl font-bold text-center mb-8">
          University Rankings Tracker
        </h1>
        
        <SearchBox
          universities={mockData}
          onSelect={(uni) => setSelected(uni)}
        />

        {selected && (
          <p className="text-center mt-4">
            Selected: {selected.name}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
```

Run: `npm run dev`
Verify:
- Type "harv" → see "Harvard University" in dropdown
- Press ArrowDown → highlight changes
- Press Enter or click → selection works
- Type "mit" → see MIT
- Press Escape → dropdown closes

Stop server: `Ctrl+C`

- [ ] **Step 6: Commit**

```bash
git add src/components/SearchBox.jsx src/components/SearchBox.test.jsx src/App.jsx
git commit -m "feat: add SearchBox component with fuzzy search

- Fuse.js integration with 0.3 threshold
- Keyboard navigation (arrows, enter, escape)
- Debounced input (300ms)
- Click outside to close
- Show top 10 results
- Include component tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---


### Task 6: Chart Components

**Files:**
- Create: `src/components/UniversityChart.jsx`
- Create: `src/components/TimeRangeSelector.jsx`

**Interfaces:**
- Consumes:
  - `universityData: {id, name, rankings: {qs: [], the: [], arwu: []}}` - University ranking data
  - `timeRange: string` - Selected time range ('5years' | '10years' | '15years' | 'all')
- Produces: Chart components that render Chart.js line chart with time range filtering

- [ ] **Step 1: Write TimeRangeSelector component**

Create `src/components/TimeRangeSelector.jsx`:

```jsx
export function TimeRangeSelector({ value, onChange }) {
  const options = [
    { value: '5years', label: 'Last 5 Years' },
    { value: '10years', label: 'Last 10 Years' },
    { value: '15years', label: 'Last 15 Years' },
    { value: 'all', label: 'All Available Data' },
  ];

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="time-range" className="text-sm font-medium text-gray-700">
        Time Range:
      </label>
      <select
        id="time-range"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Write UniversityChart component**

Create `src/components/UniversityChart.jsx`:

```jsx
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { filterByTimeRange } from '../utils/timeRangeFilter';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function UniversityChart({ universityData, timeRange }) {
  const [visibleDatasets, setVisibleDatasets] = useState({
    qs: true,
    the: true,
    arwu: true,
  });

  const chartData = useMemo(() => {
    // Get current year for filtering
    const currentYear = new Date().getFullYear();

    // Get all years from all three ranking systems
    const allYears = new Set();
    
    const qsData = filterByTimeRange(universityData.rankings.qs, timeRange, currentYear);
    const theData = filterByTimeRange(universityData.rankings.the, timeRange, currentYear);
    const arwuData = filterByTimeRange(universityData.rankings.arwu, timeRange, currentYear);

    qsData.forEach(r => allYears.add(r.year));
    theData.forEach(r => allYears.add(r.year));
    arwuData.forEach(r => allYears.add(r.year));

    const years = Array.from(allYears).sort((a, b) => a - b);

    // Build datasets
    const datasets = [];

    if (visibleDatasets.qs) {
      const qsMap = new Map(qsData.map(r => [r.year, r.rank]));
      datasets.push({
        label: 'QS World University Rankings',
        data: years.map(year => qsMap.get(year) ?? null),
        borderColor: '#2563eb',
        backgroundColor: '#2563eb20',
        spanGaps: false,
        tension: 0.1,
      });
    }

    if (visibleDatasets.the) {
      const theMap = new Map(theData.map(r => [r.year, r.rank]));
      datasets.push({
        label: 'Times Higher Education',
        data: years.map(year => theMap.get(year) ?? null),
        borderColor: '#16a34a',
        backgroundColor: '#16a34a20',
        spanGaps: false,
        tension: 0.1,
      });
    }

    if (visibleDatasets.arwu) {
      const arwuMap = new Map(arwuData.map(r => [r.year, r.rank]));
      datasets.push({
        label: 'ARWU (Shanghai Ranking)',
        data: years.map(year => arwuMap.get(year) ?? null),
        borderColor: '#ea580c',
        backgroundColor: '#ea580c20',
        spanGaps: false,
        tension: 0.1,
      });
    }

    return {
      labels: years,
      datasets,
    };
  }, [universityData, timeRange, visibleDatasets]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        reverse: true,
        title: {
          display: true,
          text: 'World Rank',
          font: { size: 14, weight: '500' },
        },
        ticks: {
          callback: (value) => Math.round(value),
        },
      },
      x: {
        title: {
          display: true,
          text: 'Year',
          font: { size: 14, weight: '500' },
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        onClick: (e, legendItem, legend) => {
          const index = legendItem.datasetIndex;
          const label = legendItem.text;
          
          let system;
          if (label.includes('QS')) system = 'qs';
          else if (label.includes('THE')) system = 'the';
          else if (label.includes('ARWU')) system = 'arwu';

          if (system) {
            setVisibleDatasets(prev => ({
              ...prev,
              [system]: !prev[system],
            }));
          }
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return value !== null ? `${label}: ${Math.round(value)}` : null;
          },
        },
      },
    },
    animation: {
      duration: 300,
    },
  };

  return (
    <div className="w-full h-96 bg-white border border-gray-200 rounded-lg p-6">
      <Line data={chartData} options={options} />
    </div>
  );
}
```

- [ ] **Step 3: Test chart in browser**

Update `src/App.jsx`:

```jsx
import { UniversityChart } from './components/UniversityChart';
import { TimeRangeSelector } from './components/TimeRangeSelector';
import { useState } from 'react';

function App() {
  const [timeRange, setTimeRange] = useState('all');
  
  const mockUniversityData = {
    id: 'harvard-university',
    name: 'Harvard University',
    rankings: {
      qs: [
        { year: 2017, rank: 3, displayRank: '3' },
        { year: 2018, rank: 3, displayRank: '3' },
        { year: 2020, rank: 3, displayRank: '3' },
        { year: 2023, rank: 5, displayRank: '5' },
      ],
      the: [
        { year: 2017, rank: 6, displayRank: '6' },
        { year: 2020, rank: 7, displayRank: '7' },
        { year: 2023, rank: 4, displayRank: '4' },
      ],
      arwu: [
        { year: 2017, rank: 1, displayRank: '1' },
        { year: 2020, rank: 1, displayRank: '1' },
        { year: 2023, rank: 1, displayRank: '1' },
      ],
    },
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container-main">
        <h1 className="text-3xl font-bold mb-2">Harvard University</h1>
        
        <div className="mb-4">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>

        <UniversityChart
          universityData={mockUniversityData}
          timeRange={timeRange}
        />
      </div>
    </div>
  );
}

export default App;
```

Run: `npm run dev`
Verify:
- Chart renders with three colored lines
- Y-axis is reversed (1 at top)
- Time range selector works
- Legend items are clickable (toggle lines)
- Hover shows tooltip
- Lines break on missing data (2019, 2021, 2022)

Stop server: `Ctrl+C`

- [ ] **Step 4: Commit**

```bash
git add src/components/UniversityChart.jsx src/components/TimeRangeSelector.jsx src/App.jsx
git commit -m "feat: add chart components with time range filtering

- Chart.js line chart with three datasets
- Y-axis reversed (rank 1 at top)
- Span gaps: false (break lines on missing data)
- Interactive legend toggle
- Time range selector dropdown
- Responsive tooltip

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---


### Task 7: Page Components and Routing

**Files:**
- Create: `src/pages/HomePage.jsx`
- Create: `src/pages/UniversityPage.jsx`
- Create: `src/components/Header.jsx`
- Create: `src/components/LoadingSpinner.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: Ranking data from `useRankingData()`, SearchBox, UniversityChart components from previous tasks
- Produces: Complete page layouts with routing

- [ ] **Step 1: Create LoadingSpinner component**

Create `src/components/LoadingSpinner.jsx`:

```jsx
export function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create Header component**

Create `src/components/Header.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { SearchBox } from './SearchBox';

export function Header({ universities, onSearch, showSearch = true }) {
  return (
    <header className="bg-white border-b border-gray-200 py-6">
      <div className="container-main">
        <Link to="/" className="block mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            University Rankings Tracker
          </h1>
        </Link>
        
        {showSearch && universities && (
          <SearchBox universities={universities} onSelect={onSearch} />
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create HomePage component**

Create `src/pages/HomePage.jsx`:

```jsx
import { useNavigate } from 'react-router-dom';
import { SearchBox } from '../components/SearchBox';

export function HomePage({ universities }) {
  const navigate = useNavigate();

  const handleSelect = (university) => {
    navigate(`/university/${university.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            University Rankings Tracker
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Explore 20+ years of ranking trends across QS, THE, and ARWU
          </p>
          <p className="text-sm text-gray-500">
            Search for a university to begin
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <SearchBox universities={universities} onSelect={handleSelect} />
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">
            Data covering {universities.length} universities from 2003-2027
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create UniversityPage component**

Create `src/pages/UniversityPage.jsx`:

```jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { UniversityChart } from '../components/UniversityChart';
import { TimeRangeSelector } from '../components/TimeRangeSelector';

export function UniversityPage({ universities }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('all');

  const university = universities.find(u => u.id === id);

  const handleSearch = (selectedUniversity) => {
    navigate(`/university/${selectedUniversity.id}`);
  };

  if (!university) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header universities={universities} onSearch={handleSearch} />
        <div className="container-main py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              University Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              No university found with ID: {id}
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              Back to Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if university has any ranking data
  const hasData = 
    university.rankings.qs.length > 0 ||
    university.rankings.the.length > 0 ||
    university.rankings.arwu.length > 0;

  if (!hasData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header universities={universities} onSearch={handleSearch} />
        <div className="container-main py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {university.name}
            </h2>
            <p className="text-gray-600">
              No ranking data available for this university.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header universities={universities} onSearch={handleSearch} />
      
      <div className="container-main py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {university.name}
          </h2>
          <p className="text-sm text-gray-600">
            Ranking trends across QS, THE, and ARWU
          </p>
        </div>

        <div className="mb-4">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>

        <UniversityChart
          universityData={university}
          timeRange={timeRange}
        />

        <div className="mt-6 text-sm text-gray-600">
          <p className="mb-2">
            <strong>How to use:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click legend items to show/hide ranking systems</li>
            <li>Hover over data points to see exact rankings</li>
            <li>Change time range to focus on specific periods</li>
            <li>Gaps in lines indicate years without ranking data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update App.jsx with routing**

Replace `src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { UniversityPage } from './pages/UniversityPage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { useRankingData } from './hooks/useRankingData';

function App() {
  const { data, loading, error } = useRankingData();

  if (loading) {
    return <LoadingSpinner message="Loading ranking data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Failed to Load Data
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const universities = data?.universities || [];

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage universities={universities} />} />
        <Route
          path="/university/:id"
          element={<UniversityPage universities={universities} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 6: Test routing in browser**

Run: `npm run dev`

Verify:
- Homepage loads with welcome message and search
- Search for "harvard" and select
- URL changes to `/university/harvard-university`
- University page shows chart
- Header search box works on university page
- Click logo to return to home
- Direct URL access works: visit `/university/stanford-university`
- Invalid ID shows "Not Found" message

Stop server: `Ctrl+C`

- [ ] **Step 7: Commit**

```bash
git add src/pages/ src/components/Header.jsx src/components/LoadingSpinner.jsx src/App.jsx
git commit -m "feat: add page components and routing

- HomePage with welcome and search
- UniversityPage with chart and controls
- Header component with navigation
- LoadingSpinner for data loading
- React Router integration
- Error handling for missing universities

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---


### Task 8: Deployment Configuration

**Files:**
- Create: `vercel.json`
- Create: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: Built React app from `npm run build`
- Produces: Vercel-ready deployment configuration

- [ ] **Step 1: Create Vercel configuration**

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "headers": [
    {
      "source": "/data/rankings.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Update package.json scripts**

Add deployment scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "process-data": "node scripts/processData.js",
    "prebuild": "npm run process-data"
  }
}
```

- [ ] **Step 3: Create README**

Create `README.md`:

```markdown
# University Rankings Tracker

A static web application to visualize university ranking trends across QS, THE, and ARWU over 20+ years.

## Features

- 🔍 Search 2,450+ universities with fuzzy matching
- 📊 Interactive line charts showing ranking trends
- 🎯 Filter by time range (5/10/15 years, or all data)
- ⚡ Fast client-side processing (no backend)
- 📱 Responsive design

## Tech Stack

- React 18 + Vite
- Chart.js for visualizations
- Fuse.js for fuzzy search
- Tailwind CSS for styling
- Deployed on Vercel

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Olcmyk/university-rankings.git
   cd university-rankings
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Process ranking data:
   ```bash
   npm run process-data
   ```

4. Start dev server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173

### Build

```bash
npm run build
npm run preview  # Preview production build
```

### Testing

```bash
npm test
```

## Data Sources

- **QS World University Rankings** (2017-2027)
- **Times Higher Education Rankings** (2011-2026)
- **Academic Ranking of World Universities / Shanghai Ranking** (2003-2025)

## Deployment

This project is configured for Vercel deployment:

1. Push to GitHub
2. Import project in Vercel dashboard
3. Vercel auto-deploys on push to main branch

Alternatively, deploy via CLI:
```bash
npm install -g vercel
vercel --prod
```

## License

MIT
```

- [ ] **Step 4: Test production build**

```bash
npm run build
npm run preview
```

Expected: Production build succeeds, preview server starts
Verify: Open http://localhost:4173, test functionality

Stop server: `Ctrl+C`

- [ ] **Step 5: Check build output size**

```bash
ls -lh dist/
du -sh dist/
```

Expected: Total dist/ size < 2MB

- [ ] **Step 6: Commit**

```bash
git add vercel.json package.json README.md
git commit -m "feat: add deployment configuration

- Vercel config with SPA routing
- Cache headers for rankings.json
- Security headers
- Prebuild script to process data
- Complete README with setup instructions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Final Testing and Polish

**Files:**
- Modify: Various files for bug fixes and polish

**Interfaces:**
- Consumes: Complete application from previous tasks
- Produces: Production-ready application

- [ ] **Step 1: Manual testing checklist**

Test the following scenarios:

**Search functionality:**
- [ ] Search "harvard" → finds Harvard University
- [ ] Search "mit" → finds MIT
- [ ] Search "stanfrd" (typo) → finds Stanford
- [ ] Keyboard navigation works (arrows, enter, escape)
- [ ] Click outside closes dropdown

**Chart functionality:**
- [ ] Chart renders for university with data
- [ ] Three lines show different colors
- [ ] Y-axis is reversed (1 at top)
- [ ] Legend click toggles lines
- [ ] Hover shows tooltip with rankings
- [ ] Time range selector works
- [ ] Missing data creates gaps in lines

**Routing:**
- [ ] Direct URL access works
- [ ] Browser back/forward works
- [ ] Invalid university ID shows error
- [ ] Logo click returns to home

**Responsive design:**
- [ ] Test on mobile viewport (< 640px)
- [ ] Search box is full width on mobile
- [ ] Chart is readable on mobile
- [ ] No horizontal scroll

**Performance:**
- [ ] Initial load < 3 seconds
- [ ] Search responds instantly after initial load
- [ ] Chart renders smoothly
- [ ] No console errors

- [ ] **Step 2: Fix any bugs found**

Document and fix issues found during testing

- [ ] **Step 3: Accessibility check**

```bash
# Install axe-core for accessibility testing
npm install -D @axe-core/cli
```

Run Lighthouse audit:
- Open dev tools → Lighthouse tab
- Run audit for both pages
- Target: Performance > 90, Accessibility 100

Fix any accessibility issues found

- [ ] **Step 4: Add meta tags for SEO**

Update `index.html`:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Track university ranking trends across QS, THE, and ARWU over 20+ years. Explore 2,450+ universities worldwide." />
  <meta name="keywords" content="university rankings, QS, THE, ARWU, Shanghai ranking, higher education" />
  <meta property="og:title" content="University Rankings Tracker" />
  <meta property="og:description" content="Track university ranking trends across QS, THE, and ARWU over 20+ years" />
  <meta property="og:type" content="website" />
  <title>University Rankings Tracker</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
```

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: final testing and polish

- Fix bugs found in manual testing
- Add accessibility improvements
- Add SEO meta tags
- Verify all functionality works

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Push to GitHub**

```bash
git push origin main
```

Expected: Code pushed successfully to GitHub repository

---

## Implementation Complete!

### Next Steps

1. **Connect to Vercel:**
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Vite and deploy

2. **Verify deployment:**
   - Check deployment URL works
   - Test all functionality on production
   - Verify data loads correctly

3. **Custom domain (optional):**
   - Add custom domain in Vercel dashboard
   - Update DNS records as instructed

### Success Criteria

- ✅ All 2,450+ universities searchable
- ✅ Charts display ranking trends correctly
- ✅ Time range filtering works
- ✅ Responsive on mobile and desktop
- ✅ Lighthouse score > 90
- ✅ No console errors
- ✅ Deployed to Vercel successfully

