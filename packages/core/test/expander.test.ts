import { describe, it, expect, vi } from 'vitest';
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

describe('expander with mergerFn', () => {
  it('applies merge function to resolved aliases', () => {
    // Simple mock merge: keep only the last occurrence of py-* classes
    const mockMerge = vi.fn((s: string) => {
      const classes = s.split(' ');
      const pyClasses = classes.filter((c) => c.startsWith('py-'));
      const otherClasses = classes.filter((c) => !c.startsWith('py-'));
      const lastPy = pyClasses[pyClasses.length - 1];
      return [...otherClasses, lastPy].filter(Boolean).join(' ');
    });

    const result = expand(
      {
        Button: 'py-2 text-sm',
        ButtonMd: 'Button py-4',
      },
      { mergerFn: mockMerge }
    );

    expect(mockMerge).toHaveBeenCalled();
    expect(result.ButtonMd).toBe('text-sm py-4');
  });

  it('works without mergerFn (default behavior)', () => {
    const result = expand({
      Button: 'py-2 text-sm',
      ButtonMd: 'Button py-4',
    });

    // Without merge, both py classes are kept
    expect(result.ButtonMd).toBe('py-2 text-sm py-4');
  });

  it('applies merge function to each alias independently', () => {
    const mockMerge = vi.fn((s: string) => {
      // Keep only unique classes
      return [...new Set(s.split(' '))].join(' ');
    });

    const result = expand(
      {
        Button: 'text-sm text-sm inline-flex',
        Card: 'p-4 p-4 rounded',
      },
      { mergerFn: mockMerge }
    );

    expect(result.Button).toBe('text-sm inline-flex');
    expect(result.Card).toBe('p-4 rounded');
    expect(mockMerge).toHaveBeenCalledTimes(2);
  });

  it('handles complex nested aliases with merge', () => {
    // Mock merge that removes duplicate utility prefixes, keeping last
    const mockMerge = (s: string) => {
      const classes = s.split(' ');
      const seen = new Map<string, string>();

      for (const cls of classes) {
        // Extract prefix like 'py', 'px', 'text', 'bg'
        const prefix = cls.match(/^([a-z]+)-/)?.[1] || cls;
        seen.set(prefix, cls);
      }

      return Array.from(seen.values()).join(' ');
    };

    const result = expand(
      {
        Base: 'py-2 px-4',
        Size: 'Base py-4 px-6',
        Button: 'Size bg-blue-500 bg-red-500',
      },
      { mergerFn: mockMerge }
    );

    // Each level should be merged:
    // Base: 'py-2 px-4' (no conflicts)
    // Size: 'py-2 px-4 py-4 px-6' -> merged to 'py-4 px-6'
    // Button: 'py-4 px-6 bg-blue-500 bg-red-500' -> merged to 'py-4 px-6 bg-red-500'
    expect(result.Button).toBe('py-4 px-6 bg-red-500');
  });
});
