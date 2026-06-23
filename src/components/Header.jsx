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
