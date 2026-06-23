import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBox } from './SearchBox.jsx';

describe('SearchBox', () => {
  const mockUniversities = [
    { id: 'harvard-university', name: 'Harvard University' },
    { id: 'stanford-university', name: 'Stanford University' },
    { id: 'mit', name: 'Massachusetts Institute of Technology' },
  ];

  it('renders search input', () => {
    render(<SearchBox universities={mockUniversities} onSelect={() => {}} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows results when typing', async () => {
    render(<SearchBox universities={mockUniversities} onSelect={() => {}} />);
    const input = screen.getByRole('combobox');

    fireEvent.change(input, { target: { value: 'harv' } });

    await waitFor(() => {
      expect(screen.getByText('Harvard University')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('calls onSelect when university clicked', async () => {
    const onSelect = vi.fn();
    render(<SearchBox universities={mockUniversities} onSelect={onSelect} />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'harv' } });

    await waitFor(() => {
      expect(screen.getByText('Harvard University')).toBeInTheDocument();
    }, { timeout: 500 });

    const result = screen.getByText('Harvard University');
    fireEvent.click(result);

    expect(onSelect).toHaveBeenCalledWith(mockUniversities[0]);
  });
});
