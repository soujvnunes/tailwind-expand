import { describe, it, expect } from 'vitest';
import { applyVariantPrefix, isCamelCase, CAMEL_CASE_REGEX } from '../src/utils';

describe('applyVariantPrefix', () => {
  it('returns utility unchanged when prefix is empty', () => {
    expect(applyVariantPrefix('', 'bg-primary')).toBe('bg-primary');
  });

  it('applies prefix when utility has no variants', () => {
    expect(applyVariantPrefix('hover:', 'bg-primary')).toBe('hover:bg-primary');
  });

  it('deduplicates same variant', () => {
    expect(applyVariantPrefix('hover:', 'hover:bg-primary')).toBe('hover:bg-primary');
  });

  it('deduplicates with chained variants', () => {
    expect(applyVariantPrefix('dark:hover:', 'hover:bg-primary')).toBe('dark:hover:bg-primary');
  });

  it('stacks different variants', () => {
    expect(applyVariantPrefix('dark:', 'hover:bg-primary')).toBe('dark:hover:bg-primary');
  });

  it('preserves pseudo-element variants', () => {
    expect(applyVariantPrefix('hover:', 'before:w-0')).toBe('hover:before:w-0');
  });

  it('deduplicates pseudo-element prefix', () => {
    expect(applyVariantPrefix('before:', 'before:w-0')).toBe('before:w-0');
  });
});

describe('isCamelCase', () => {
  it('returns true for CamelCase strings', () => {
    expect(isCamelCase('Button')).toBe(true);
    expect(isCamelCase('ButtonMd')).toBe(true);
    expect(isCamelCase('HomeHeroTitle')).toBe(true);
  });

  it('returns false for non-CamelCase strings', () => {
    expect(isCamelCase('button')).toBe(false);
    expect(isCamelCase('bg-primary')).toBe(false);
    expect(isCamelCase('hover:bg-primary')).toBe(false);
  });
});

describe('CAMEL_CASE_REGEX', () => {
  it('matches CamelCase pattern', () => {
    expect(CAMEL_CASE_REGEX.test('Button')).toBe(true);
    expect(CAMEL_CASE_REGEX.test('button')).toBe(false);
  });
});
