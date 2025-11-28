import { describe, it, expect } from 'vitest';
import { extract } from '../src/extractor';
import path from 'path';

describe('extractor', () => {
  it('extracts simple @expand block', () => {
    const result = extract(path.join(__dirname, 'fixtures/simple.css'));

    expect(result.aliases).toEqual({
      Button: 'text-sm inline-flex items-center',
    });
  });

  it('extracts nested modifiers', () => {
    const result = extract(path.join(__dirname, 'fixtures/nested.css'));

    expect(result.aliases).toEqual({
      Button: 'text-sm',
      ButtonMd: 'h-10 px-4',
      ButtonLg: 'h-12 px-6',
    });
  });

  it('extracts deeply nested modifiers', () => {
    const result = extract(path.join(__dirname, 'fixtures/deep.css'));

    expect(result.aliases).toEqual({
      Button: 'text-sm',
      ButtonMain: 'bg-amber-500',
      ButtonMainOutline: 'bg-transparent border',
    });
  });

  it('merges multiple @expand blocks for same name', () => {
    const result = extract(path.join(__dirname, 'fixtures/merge.css'));

    expect(result.aliases.Button).toContain('text-sm');
    expect(result.aliases.Button).toContain('font-bold');
  });

  it('allows namespace-only @expand (no @apply)', () => {
    const result = extract(path.join(__dirname, 'fixtures/namespace.css'));

    expect(result.aliases.Typography).toBeUndefined();
    expect(result.aliases.TypographyHeading).toBe('text-lg font-bold');
  });

  it('throws on non-CamelCase alias', () => {
    expect(() =>
      extract(path.join(__dirname, 'fixtures/invalid-name.css'))
    ).toThrow('CamelCase');
  });

  it('generates consistent hash for same content', () => {
    const result1 = extract(path.join(__dirname, 'fixtures/simple.css'));
    const result2 = extract(path.join(__dirname, 'fixtures/simple.css'));

    expect(result1.hash).toBe(result2.hash);
  });
});
