import { describe, it, expect } from 'vitest';
import { collectVariantAliases } from '../src/scanner';

describe('collectVariantAliases', () => {
  describe('variant prefix deduplication', () => {
    // Basic Deduplication
    it('deduplicates same variant prefix (hover:hover: -> hover:)', () => {
      const aliases = { ButtonPrimary: 'bg-primary hover:bg-primary/90' };
      const result = new Set<string>();
      collectVariantAliases('hover:ButtonPrimary', aliases, result);
      expect([...result].sort()).toEqual([
        'hover:bg-primary',
        'hover:bg-primary/90', // NOT hover:hover:bg-primary/90
      ].sort());
    });

    it('applies prefix to utility without overlap', () => {
      const aliases = { Button: 'bg-primary' };
      const result = new Set<string>();
      collectVariantAliases('hover:Button', aliases, result);
      expect([...result]).toEqual(['hover:bg-primary']);
    });

    it('stacks different variant prefixes', () => {
      const aliases = { ButtonPrimary: 'bg-primary hover:bg-primary/90' };
      const result = new Set<string>();
      collectVariantAliases('dark:ButtonPrimary', aliases, result);
      expect([...result].sort()).toEqual([
        'dark:bg-primary',
        'dark:hover:bg-primary/90',
      ].sort());
    });

    it('handles chained variant prefixes (dark:hover:)', () => {
      const aliases = { ButtonPrimary: 'bg-primary hover:bg-primary/90' };
      const result = new Set<string>();
      collectVariantAliases('dark:hover:ButtonPrimary', aliases, result);
      expect([...result].sort()).toEqual([
        'dark:hover:bg-primary',
        'dark:hover:bg-primary/90',
      ].sort());
    });

    // Pseudo-elements
    it('preserves pseudo-element variants (hover + before)', () => {
      const aliases = { Icon: 'before:w-0' };
      const result = new Set<string>();
      collectVariantAliases('hover:Icon', aliases, result);
      expect([...result]).toEqual(['hover:before:w-0']);
    });

    it('preserves pseudo-element variants (hover + after)', () => {
      const aliases = { Icon: "after:content-['']" };
      const result = new Set<string>();
      collectVariantAliases('hover:Icon', aliases, result);
      expect([...result]).toEqual(["hover:after:content-['']"]);
    });

    it('deduplicates same pseudo-element prefix', () => {
      const aliases = { Icon: 'before:w-0' };
      const result = new Set<string>();
      collectVariantAliases('before:Icon', aliases, result);
      expect([...result]).toEqual(['before:w-0']);
    });
  });
});
