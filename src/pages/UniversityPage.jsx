import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { UniversityChart } from '../components/UniversityChart';
import { TimeRangeSelector } from '../components/TimeRangeSelector';

export function UniversityPage({ universities }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('all');
  const [visibleSystems, setVisibleSystems] = useState({
    qs: true,
    the: true,
    arwu: true,
  });
  const [useLogScale, setUseLogScale] = useState(false);

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
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {university.name}
            </h2>
            <p className="text-sm text-gray-600">
              Ranking trends across QS, THE, and ARWU
            </p>
          </div>

          {/* Ranking System Checkboxes */}
          <div className="flex flex-col gap-2 bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-700 mb-1">Display Rankings:</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleSystems.qs}
                onChange={(e) => setVisibleSystems({ ...visibleSystems, qs: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">QS</span>
              <span className="w-3 h-3 rounded-full bg-chart-qs"></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleSystems.the}
                onChange={(e) => setVisibleSystems({ ...visibleSystems, the: e.target.checked })}
                className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">THE</span>
              <span className="w-3 h-3 rounded-full bg-chart-the"></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleSystems.arwu}
                onChange={(e) => setVisibleSystems({ ...visibleSystems, arwu: e.target.checked })}
                className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">ARWU</span>
              <span className="w-3 h-3 rounded-full bg-chart-arwu"></span>
            </label>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />

          {/* Log Scale Toggle Button */}
          <button
            onClick={() => setUseLogScale(!useLogScale)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              useLogScale
                ? 'bg-blue-700 text-white hover:bg-blue-800'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {useLogScale ? '✓ Logarithmic Scale' : 'Linear Scale'}
          </button>
        </div>

        <UniversityChart
          universityData={university}
          timeRange={timeRange}
          visibleSystems={visibleSystems}
          useLogScale={useLogScale}
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
