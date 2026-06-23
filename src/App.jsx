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
