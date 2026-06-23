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
