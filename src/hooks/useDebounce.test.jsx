import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce } from './useDebounce.js';

describe('useDebounce', () => {
  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 300 });

    // Should still be initial immediately
    expect(result.current).toBe('initial');

    // After delay, should update
    await waitFor(() => {
      expect(result.current).toBe('updated');
    }, { timeout: 500 });
  });
});
