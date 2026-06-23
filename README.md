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
