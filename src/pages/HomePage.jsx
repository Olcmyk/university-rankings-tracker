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
