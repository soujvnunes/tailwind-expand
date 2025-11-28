import { describe, it, expect } from 'vitest';
import { expand } from '../src/expander';

describe('expander', () => {
  it('returns utilities unchanged', () => {
    const result = expand({
      Button: 'text-sm inline-flex',
    });

    expect(result.Button).toBe('text-sm inline-flex');
  });

  it('expands alias references', () => {
    const result = expand({
      TypographyCaption: 'text-xs font-bold',
      Button: 'TypographyCaption inline-flex',
    });

    expect(result.Button).toBe('text-xs font-bold inline-flex');
  });

  it('expands nested alias references', () => {
    const result = expand({
      Base: 'text-sm',
      Typography: 'Base font-sans',
      Button: 'Typography inline-flex',
    });

    expect(result.Button).toBe('text-sm font-sans inline-flex');
  });

  it('throws on circular dependency', () => {
    expect(() =>
      expand({
        A: 'B text-sm',
        B: 'A font-bold',
      })
    ).toThrow('Circular dependency');
  });

  it('handles self-reference as circular', () => {
    expect(() =>
      expand({
        Button: 'Button text-sm',
      })
    ).toThrow('Circular dependency');
  });
});
