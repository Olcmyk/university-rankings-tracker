# University Rankings Tracker - Design Specification

**Date**: 2026-06-23  
**Project**: University Rankings Visualization Platform  
**Status**: Design Approved

## Executive Summary

A static web application that enables users to search universities and visualize their ranking trends across three major global ranking systems (QS, THE, ARWU) over the past 20+ years using interactive line charts.

**Target Users**: Students, academics, general public, education journalists  
**Core Value**: Simple, fast, and clear visualization of university ranking trends  
**Technical Approach**: Pure static React SPA with client-side data processing

---

## 1. Project Overview

### 1.1 Problem Statement

Users need an easy way to understand how universities have performed over time across different ranking systems. Existing ranking websites typically show only current year rankings, making it difficult to identify long-term trends.

### 1.2 Goals

- **Primary**: Enable users to search any university and view its ranking trends across QS, THE, and ARWU
- **Secondary**: Provide time range filtering and interactive chart controls
- **Technical**: Achieve fast load times (<2s) and smooth interactions with zero backend infrastructure

### 1.3 Non-Goals (Future Enhancements)

- Multi-university comparison (side-by-side)
- Country/region filtering
- Ranking prediction or analysis
- Detailed ranking metrics (citations, faculty ratio, etc.)
- Mobile app version

---

## 2. Data Specifications

### 2.1 Source Data

Three cleaned CSV files:
- `cleaned_qs_rankings.csv` - 13,844 records (2017-2027)
- `cleaned_the_rankings.csv` - 18,519 records (2011-2026)
- `cleaned_arwu_rankings.csv` - 15,815 records (2003-2025)

**Total**: ~48,000 records covering 2,450+ unique universities

**CSV Schema**:
```
university_name,year,rank,rank_display,is_range
Harvard University,2020,3,3,false
Stanford University,2020,225.5,201-250,true
```

### 2.2 Output Data Format

Optimized JSON structure for frontend consumption:

```json
{
  "universities": [
    {
      "id": "harvard-university",
      "name": "Harvard University",
      "rankings": {
        "qs": [
          {"year": 2017, "rank": 3, "displayRank": "3"},
          {"year": 2018, "rank": 3, "displayRank": "3"}
        ],
        "the": [
          {"year": 2011, "rank": 2, "displayRank": "2"}
        ],
        "arwu": [
          {"year": 2003, "rank": 1, "displayRank": "1"}
        ]
      }
    }
  ],
  "metadata": {
    "totalUniversities": 2450,
    "dateGenerated": "2026-06-23",
    "rankingSystems": {
      "qs": {
        "fullName": "QS World University Rankings",
        "years": [2017, 2027]
      },
      "the": {
        "fullName": "Times Higher Education World University Rankings",
        "years": [2011, 2026]
      },
      "arwu": {
        "fullName": "Academic Ranking of World Universities",
        "years": [2003, 2025]
      }
    }
  }
}
```

**Optimization Strategy**:
- Aggregate by university (avoid repeating university names)
- Use compact array format for year-rank pairs
- Gzip compression reduces size from ~2MB to ~500KB

### 2.3 Data Processing Pipeline

**Script**: `scripts/processData.js` (Node.js)

**Steps**:
1. Read three CSV files using csv-parser
2. Group records by university name
3. Normalize university names (trim, standardize punctuation)
4. Handle duplicates (same university + year: keep first occurrence)
5. Generate URL-friendly IDs (slugify)
6. Sort universities alphabetically
7. Validate data integrity (check for missing required fields)
8. Write optimized JSON to `public/data/rankings.json`

**Data Cleaning Rules**:
- Trim whitespace from university names
- Convert range ranks to numeric midpoint (e.g., "201-250" → 225.5)
- Generate unique IDs: lowercase + hyphenated (e.g., "Massachusetts Institute of Technology" → "massachusetts-institute-of-technology")

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────┐
│              User Browser                        │
├──────────────────────────────────────────────────┤
│  React SPA                                       │
│  ├─ SearchBox (Fuse.js autocomplete)            │
│  ├─ UniversityChart (Chart.js)                  │
│  └─ TimeRangeSelector                           │
├──────────────────────────────────────────────────┤
│  Static JSON (~500KB gzipped)                    │
│  └─ rankings.json                                │
├──────────────────────────────────────────────────┤
│  Deployment: Vercel (static hosting)             │
└──────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend Framework | React 18 | Mature ecosystem, component reusability |
| Build Tool | Vite | Fast dev server, optimized production builds |
| Routing | React Router v6 | Standard SPA routing, URL sharing |
| Charts | Chart.js 4.x | Simple API, good documentation, MIT license |
| Search | Fuse.js 7.x | Fuzzy search, typo tolerance, lightweight (2KB) |
| Styling | CSS Modules / Tailwind | Scoped styles, utility-first for rapid development |
| Deployment | Vercel | Zero-config, automatic HTTPS, CDN, free tier |

**Why No Backend?**
- Data is read-only (rankings don't change in real-time)
- Dataset is small enough for client-side processing (<1MB compressed)
- Eliminates server costs and maintenance
- Better performance after initial load (no API latency)

### 3.3 Data Flow

1. **Initial Load**
   - Browser requests HTML/CSS/JS bundle
   - Service Worker checks cache
   - If miss: download rankings.json (gzipped, ~500KB)
   - Parse JSON into memory
   - Initialize Fuse.js search index

2. **Search Flow**
   - User types in search box
   - Debounced input (300ms) triggers Fuse.js search
   - Display top 10 matches in dropdown
   - User selects university → navigate to `/university/:id`

3. **Chart Rendering**
   - Extract university data from loaded JSON
   - Filter by selected time range
   - Pass data to Chart.js
   - Render three line datasets (QS, THE, ARWU)

4. **Interaction**
   - Click legend → toggle dataset visibility
   - Change time range → re-filter data and update chart
   - Hover data point → show tooltip with detailed info

---

## 4. Frontend Design

### 4.1 Component Structure

```
App
├── HomePage
│   ├── Header
│   ├── SearchBox
│   └── WelcomeSection
└── UniversityPage
    ├── Header (with SearchBox)
    ├── UniversityInfo
    ├── TimeRangeSelector
    └── UniversityChart
        └── ChartLegend
```

### 4.2 Key Components

#### SearchBox Component

**Props**: None (manages internal state)

**State**:
- `query` (string): Current search input
- `results` (array): Matching universities
- `selectedIndex` (number): Keyboard navigation index
- `isOpen` (boolean): Dropdown visibility

**Features**:
- Fuzzy search with Fuse.js (threshold: 0.3)
- Debounced input (300ms)
- Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
- Click outside to close
- Display top 10 results
- Highlight matching text

**Example**:
```jsx
<SearchBox 
  onSelect={(university) => navigate(`/university/${university.id}`)} 
/>
```

#### UniversityChart Component

**Props**:
- `universityData` (object): Full university ranking data
- `timeRange` (string): Selected time range ('5years' | '10years' | '15years' | 'all')

**State**:
- `visibleDatasets` (object): { qs: true, the: true, arwu: true }

**Features**:
- Chart.js line chart configuration
- Y-axis reversed (rank 1 at top)
- Span gaps: false (break line on missing data)
- Interactive legend (click to toggle)
- Responsive tooltip on hover
- Smooth animations (300ms)

**Chart Configuration**:
```javascript
{
  type: 'line',
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        reverse: true,
        title: { display: true, text: 'World Rank' }
      },
      x: {
        title: { display: true, text: 'Year' }
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        onClick: handleLegendClick  // Toggle dataset visibility
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}`
        }
      }
    }
  }
}
```

#### TimeRangeSelector Component

**Props**:
- `currentRange` (string): Selected range
- `onChange` (function): Callback when range changes

**Options**:
- "Last 5 Years" (most recent 5 years of available data)
- "Last 10 Years"
- "Last 15 Years"
- "All Available Data" (default)

**Implementation**: Simple dropdown/select element

### 4.3 Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Landing page with search |
| `/university/:id` | UniversityPage | Chart view for specific university |

**Example URLs**:
- `https://university-rankings.vercel.app/`
- `https://university-rankings.vercel.app/university/harvard-university`

**Routing Behavior**:
- Browser back/forward supported
- Direct URL access works (no 404 on refresh)
- Share-friendly URLs

---

## 5. User Experience Design

### 5.1 Visual Style (Academic Clean)

**Design Principles**:
- Minimal, distraction-free
- Data-focused (let charts speak)
- High contrast for readability
- Professional, trustworthy tone

**Color Palette**:
- Background: Pure white `#ffffff`
- Text Primary: Dark gray `#1f2937`
- Text Secondary: Medium gray `#6b7280`
- Borders: Light gray `#e5e7eb`
- Accent: Deep blue `#1e40af` (links, buttons)
- Chart Colors:
  - QS: Blue `#2563eb`
  - THE: Green `#16a34a`
  - ARWU: Orange `#ea580c`

**Typography**:
- Font Family: Inter, system-ui, sans-serif
- Headings: 24px-32px, font-weight: 600
- Body: 16px, line-height: 1.6
- Labels: 14px, font-weight: 500

**Spacing System**: 8px base unit (8, 16, 24, 32, 48, 64)

**Layout**:
- Max width: 1200px (centered)
- Padding: 32px horizontal on desktop, 16px on mobile
- Card shadows: Subtle (0 1px 3px rgba(0,0,0,0.1))

### 5.2 User Flows

#### Flow 1: First-Time Visitor

1. Land on homepage
2. See loading spinner "Loading ranking data..."
3. Data loads (~1-2 seconds)
4. See welcome message:
   - **Title**: "University Rankings Tracker"
   - **Subtitle**: "Explore 20+ years of ranking trends across QS, THE, and ARWU"
   - **Search prompt**: "Search for a university to begin"
5. Focus automatically on search box
6. Start typing

#### Flow 2: Search and View

1. User types "harv" in search box
2. Dropdown appears with:
   ```
   → Harvard University
     Howard University
     University of Hawaii
   ```
3. User presses Enter or clicks "Harvard University"
4. URL changes to `/university/harvard-university`
5. Chart page loads with:
   - University name as heading
   - Time range selector (default: "All Available Data")
   - Line chart showing three ranking systems
   - Legend below chart

#### Flow 3: Explore Rankings

1. User hovers over a data point
2. Tooltip appears:
   ```
   Year: 2020
   QS: 3
   THE: 7
   ARWU: 1
   ```
3. User clicks "THE" in legend
4. THE line disappears from chart
5. User changes time range to "Last 10 Years"
6. Chart updates to show only 2016-2025 data
7. User clicks search box (always visible in header)
8. Types new university name
9. Cycle repeats

### 5.3 Responsive Design

**Breakpoints**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Adjustments**:
- Search box: Full width, larger touch target
- Chart: Maintain aspect ratio, scrollable if needed
- Font sizes: Scale down slightly (14px body)
- Time range selector: Full width dropdown
- Legend: Stack vertically if needed

### 5.4 Error States

| Scenario | Display |
|----------|---------|
| Data load fails | "Failed to load ranking data. Please refresh the page." + Retry button |
| University not found | "No universities found matching '[query]'. Try a different search term." |
| No ranking data | "No ranking data available for [University Name]." |
| Network offline | "You appear to be offline. Please check your connection." |

### 5.5 Loading States

- **Initial load**: Full-screen spinner with message "Loading ranking data..."
- **Chart rendering**: Skeleton placeholder for chart area
- **Search**: Show previous results while debouncing new input

---

## 6. Performance Optimization

### 6.1 Load Time Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 2.5s
- **Total Data Transfer**: < 800KB (including all assets)

### 6.2 Optimization Techniques

**Bundle Optimization**:
- Code splitting with React.lazy()
- Tree shaking (Vite automatically handles)
- Minification (UglifyJS)
- CSS purging (remove unused Tailwind classes)

**Data Optimization**:
- Gzip/Brotli compression (Vercel automatic)
- Efficient JSON structure (group by university)
- Pre-computed rank values (no client-side calculation)

**Runtime Optimization**:
- Fuse.js index cached in memory
- Debounce search input (300ms)
- Chart.js animation: reduced duration (300ms)
- Virtualization if university list exceeds 100 items (unlikely)

**Caching Strategy**:
- Service Worker caches rankings.json
- Cache-Control headers: `public, max-age=3600` (1 hour)
- Immutable versioned assets: `bundle.[hash].js`

### 6.3 Lighthouse Score Goals

- Performance: > 90
- Accessibility: 100
- Best Practices: 100
- SEO: > 85

---

## 7. Accessibility

### 7.1 Standards Compliance

Target: WCAG 2.1 Level AA

**Key Requirements**:
- Keyboard navigation for all interactive elements
- ARIA labels for search box and chart
- Sufficient color contrast (4.5:1 for text)
- Focus indicators on all focusable elements
- Screen reader announcements for dynamic content

### 7.2 Implementation Details

**Search Box**:
```html
<input
  type="search"
  role="combobox"
  aria-label="Search universities"
  aria-expanded={isOpen}
  aria-controls="search-results"
  aria-activedescendant={`result-${selectedIndex}`}
/>
<ul role="listbox" id="search-results">
  <li role="option" id="result-0">Harvard University</li>
</ul>
```

**Chart**:
- Include text summary above chart for screen readers
- Provide data table alternative (hidden, accessible via "View Data Table" button)

**Keyboard Shortcuts**:
- `/` - Focus search box
- `Escape` - Close search dropdown
- `Arrow Up/Down` - Navigate search results
- `Enter` - Select highlighted result

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Tools**: Vitest + React Testing Library

**Coverage**:
- Data processing functions (CSV to JSON conversion)
- Search logic (Fuse.js integration)
- Time range filtering
- Component rendering (smoke tests)

### 8.2 Integration Tests

**Scenarios**:
- Search → Select → View chart flow
- Legend toggle interaction
- Time range change updates chart
- URL routing (direct access to university page)

### 8.3 Manual Testing Checklist

- [ ] Test 10+ different universities
- [ ] Test universities with incomplete data (missing years)
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile devices (iOS Safari, Chrome Android)
- [ ] Test keyboard-only navigation
- [ ] Test with screen reader (VoiceOver / NVDA)
- [ ] Test slow 3G network condition
- [ ] Test offline behavior (Service Worker)

---

## 9. Deployment

### 9.1 Deployment Platform

**Platform**: Vercel

**Justification**:
- Zero-configuration for Vite/React projects
- Automatic HTTPS and CDN
- Preview deployments for PRs
- Free tier sufficient for expected traffic
- GitHub integration (auto-deploy on push)

### 9.2 Deployment Process

1. **Setup**:
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Initial Deploy**:
   ```bash
   npm run build
   vercel --prod
   ```

3. **Continuous Deployment**:
   - Connect GitHub repository to Vercel
   - Auto-deploy on push to `main` branch
   - Preview URLs for feature branches

### 9.3 Environment Configuration

**vercel.json**:
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
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    }
  ]
}
```

### 9.4 Domain

**Default**: `university-rankings-tracker.vercel.app`

**Custom Domain** (optional): User can configure via Vercel dashboard

---

## 10. Future Enhancements (Out of Scope for V1)

### 10.1 Feature Additions

1. **Multi-University Comparison**
   - Select 2-5 universities
   - Overlay rankings on single chart
   - Color-coded by university

2. **Country/Region Filtering**
   - Requires adding country data from original CSVs
   - Filter universities by location
   - Regional ranking comparisons

3. **Export Functionality**
   - Download chart as PNG
   - Export data as CSV
   - Share chart as image on social media

4. **Advanced Analytics**
   - Trend analysis (rising/falling universities)
   - Ranking volatility metrics
   - Percentile rankings

5. **Personalization**
   - Save favorite universities
   - Browser localStorage persistence
   - Custom dashboard

### 10.2 Technical Improvements

1. **Progressive Web App**
   - Full offline support
   - Install as desktop/mobile app
   - Push notifications for ranking updates

2. **Server-Side Rendering**
   - Better SEO for individual university pages
   - Faster first paint
   - Requires migration to Next.js

3. **Database Backend**
   - Support for larger datasets
   - Real-time ranking updates
   - User accounts and saved searches

---

## 11. Success Metrics

### 11.1 Technical Metrics

- Load time < 2 seconds (95th percentile)
- Lighthouse performance score > 90
- Zero JavaScript errors in production
- < 1% bounce rate on chart page

### 11.2 User Engagement Metrics

- Average session duration > 2 minutes
- Universities viewed per session > 2
- Search-to-view conversion rate > 80%

---

## 12. Project Timeline

**Estimated Duration**: 2-3 days

| Phase | Tasks | Duration |
|-------|-------|----------|
| Data Processing | Write CSV → JSON conversion script | 2 hours |
| Project Setup | Initialize Vite + React, install dependencies | 1 hour |
| Core Components | SearchBox, UniversityChart, TimeRangeSelector | 6 hours |
| Styling | Implement academic clean design | 3 hours |
| Routing & Integration | React Router, page layouts | 2 hours |
| Testing | Manual testing, bug fixes | 3 hours |
| Deployment | Vercel setup, production deploy | 1 hour |
| **Total** | | **18 hours** |

---

## 13. Open Questions & Decisions

### 13.1 Resolved Decisions

✅ **Backend**: No backend, pure static site  
✅ **Search**: Only by university name (no country filter in V1)  
✅ **Chart Library**: Chart.js (simple, good for line charts)  
✅ **Comparison**: Single university only in V1  
✅ **Missing Data**: Break line segments (don't interpolate)  
✅ **Time Range**: User-selectable (5/10/15 years, all)  
✅ **Deployment**: Vercel (free, easy GitHub integration)

### 13.2 Assumptions

- Users have modern browsers (ES6+ support)
- Average network speed: 4G or better
- No need for IE11 support
- English-only interface sufficient
- No user authentication required

---

## 14. Appendix

### 14.1 Data Sample

**Input CSV**:
```csv
university_name,year,rank,rank_display,is_range
Harvard University,2020,3,3,false
Stanford University,2020,225.5,201-250,true
```

**Output JSON**:
```json
{
  "universities": [
    {
      "id": "harvard-university",
      "name": "Harvard University",
      "rankings": {
        "qs": [{"year": 2020, "rank": 3, "displayRank": "3"}]
      }
    }
  ]
}
```

### 14.2 References

- [Chart.js Documentation](https://www.chartjs.org/)
- [Fuse.js Documentation](https://fusejs.io/)
- [React Router Documentation](https://reactrouter.com/)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**End of Design Specification**
