import { describe, it, expect } from 'vitest';
import { slugify } from './slugify.js';

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Harvard University')).toBe('harvard-university');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('Massachusetts Institute of Technology')).toBe('massachusetts-institute-of-technology');
  });

  it('removes special characters', () => {
    expect(slugify("Queen's University")).toBe('queens-university');
  });

  it('handles multiple spaces', () => {
    expect(slugify('University  of   California')).toBe('university-of-california');
  });
});
