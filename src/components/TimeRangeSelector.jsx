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
