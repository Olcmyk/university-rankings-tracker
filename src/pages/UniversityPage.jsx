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
