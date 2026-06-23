import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
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
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function UniversityChart({ universityData, timeRange, visibleSystems, useLogScale }) {

  // Store displayRank data for tooltips
  const displayRankData = useMemo(() => {
    const currentYear = new Date().getFullYear();

    const qsData = filterByTimeRange(universityData.rankings.qs, timeRange, currentYear);
    const theData = filterByTimeRange(universityData.rankings.the, timeRange, currentYear);
    const arwuData = filterByTimeRange(universityData.rankings.arwu, timeRange, currentYear);

    return {
      qs: new Map(qsData.map(r => [r.year, r.displayRank])),
      the: new Map(theData.map(r => [r.year, r.displayRank])),
      arwu: new Map(arwuData.map(r => [r.year, r.displayRank])),
    };
  }, [universityData, timeRange]);

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

    if (visibleSystems.qs) {
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

    if (visibleSystems.the) {
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

    if (visibleSystems.arwu) {
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
  }, [universityData, timeRange, visibleSystems]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: useLogScale ? 'logarithmic' : 'linear',
        reverse: true,
        title: {
          display: true,
          text: useLogScale ? 'World Rank (Log Scale)' : 'World Rank',
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
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const year = context.label;
            const value = context.parsed.y;

            // If this point has no data (null), don't show anything
            if (value === null || value === undefined) {
              return null;
            }

            // Determine which ranking system this is
            let systemKey = '';
            if (label.includes('QS')) systemKey = 'qs';
            else if (label.includes('THE') || label.includes('Higher Education')) systemKey = 'the';
            else if (label.includes('ARWU') || label.includes('Shanghai')) systemKey = 'arwu';

            // Get the display rank from our stored data
            const displayRank = displayRankData[systemKey]?.get(parseInt(year));

            if (displayRank) {
              return `${label}: ${displayRank}`;
            }

            return null;
          },
        },
      },
    },
    animation: {
      duration: 300,
    },
  }), [useLogScale]);

  return (
    <div className="w-full h-96 bg-white border border-gray-200 rounded-lg p-6">
      <Line data={chartData} options={options} />
    </div>
  );
}
